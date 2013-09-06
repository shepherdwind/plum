var stdclass = require('../lib/stdclass');
var log = require('../lib/logger').log;
var path = require('path');
var fs = require('fs');

var ERROR_TYPE = {
  503: '<p>Error 503. Too much time,  much more than the max time of server allowed',
  415: "<p><strong>Error 415</strong><p>Sever do not support the file type: ",
  404: "<p><strong>404 Error!\n <p>The url you requre is not exist!",
  500: "<p><strong>500 Server Error!"
};

function Origin(){
  this.init.apply(this, arguments);
}

stdclass.extend(Origin, stdclass, {
  attributes: {
    path: '',
    files: [],
    //maps对应的文件
    _files: [],
    //文件路径映射
    maps: [],
    ext: '',
    //等于文件总数目
    len: 0,
    //当前成功获取到的文件数
    now: 0,
    //当前可以推送到客户端的文件序号
    step: 0,
    //born | begin | initialized | end
    status: 'born',
    received: {},
    //记录总执行时间
    time: [],
    hooks: [],
    customs: {},
    request: {}
  },

  CONSIT: {
    MIME: {},
    //服务器超时10s
    TIME_OUT: 30000,
    bin: {}
  },

  /**
   * 初始化入口
   */
  _init: function init(){

    /**
     * 临时贮存数据
     */
    this.data = [];
    //log信息贮存，在结束后统一输出，以免和其他请求的混合在一起
    this.log = [];
    this._bind();
    this.attributes.received = {};

    for (var i = 0; i < this.get('len'); i++) {
      this.data[i] = [];
    }

    var self = this;
    this.timer = setTimeout(function timeOut(){
      self.fire('err', {message: ERROR_TYPE[503], type: 503});
    }, this.get('TIME_OUT'));

    this._recodeTime();
    this.log.push({
      log: 'Origin begin',
      msg: this.get('len') + ' files(' + this.get('files').map(path.basename) + ')', 
      type: 'begin'
    });

  },

  /**
   * 事件发布与绑定
   */
  _bind: function bind(){
    //所有文件都成功读取到
    this.on('change:now:' + this.get('len'), function(e){
      this.set('status', 'end');
      var time = this.get('time');
      this.log.push({
        log: 'Origin end',
        msg: 'spend time: ' + (time[1] - time[0]) + 'ms',
        type: 'end'
      });

      this.fire('end');
    });

    //发生错误
    this.on('err', function(){
      this.set('status', 'end');
    });

    this.on('change:status:end', function(){
      this._recodeTime();
      clearTimeout(this.timer);
    });

    this.once('data', function(e){
      clearTimeout(this.timer);
    });

    this.on('change:step', function(e){
      var files = this.get('files');
      if (files[e.now] === false){
        this._pushData('', e.now, true);
      }
    });

    //初始化完成，开始读取文件
    this.on('change:status:initialized', function(e){
      var files = this.get('files');
      files.forEach(this._getFile, this);
    });
  },

  /**
   * 启动服务器功能
   */
  parse: function parse(){
    var ext = this.get('ext');
    var MIME = this.get('MIME');
    var hooks = this.get('hooks');

    if (hooks.length){
      this._loadHook(hooks[0]);
    } else {
      if (ext && !MIME[ext]){
        log('undefined mime type', 'warn', ext);
        //this.fire('err', {'message': ERROR_TYPE[415] + ext, type: "415"});
        //return;
      }

      ext ? this.set('status', 'initialized'): this._listDir();
    }
  },

  /**
   * 数据获取统一处理接口，接受来自steam或者stdin数据
   * @param data {string|buffer} 获取到的数据
   * @param i {number} 数据对应的文件
   * @param isEnd {bool} 是否为文件结束
   */
  _pushData: function pushData(data, i, isEnd){
    var files = this.get('files');
    var step = this.get('step');
    var datas = this.data;
    var ret = data ? [data] : [];
    var self = this;
    i = i || 0;

    if (i === step){

      //把已经加载好的补上
      ret = datas[i];
      ret.push(data);
      datas[i] = [];
      this.fire('data', {data: ret});

      if (isEnd) this.set('step', step + 1);
    }
    else {
      this.data[i].push(data);
    }
  },

  _endData: function endData(data, i){
    var files = this.get('files');
    files[i] = false;
    this._pushData(data, i, true);
    this.set('now', this.get('now') + 1);
  },

  _loadHook: function loadHook(name){
    var hookRun  = require('./' + name);
    var len      = this.get('len');
    var received = this.get('received');
    var _files   = this.get('_files');
    var files    = (_files[0] || this.get('files')).map(function(file){
      return received[file] ? false : file;
    });

    var hook = new hookRun({
      path    : this.get('path'),
      files   : files,
      customs : this.get('customs'),
      maps    : this.get('maps')
    });

    var dataList = ['request', 'bin', 'data'];
    dataList.forEach(function(name){
      if (hook.CONSIT[name])
        hook.set(name, this.get(name));
    }, this);

    hook.on('set:header', function(e){
      this.fire('set:header', e);
    }, this);

    hook.on('data', function(e){
      this._pushData(e.data, e.index);
    }, this);

    hook.on('end', function(e){
      var netTime = e.time;
      this.log.push({
        log: 'Hook ' + name,
        msg: 'Get file ' + files[e.index] + '('+ e.index +'). spend time:' + this._getTime() + (e.time || ''),
        type: 'hook',
        file: files[e.index],
        hook: name
      });
      this._endData(e.data, e.index);
    }, this);

    hook.on('receive', function(e){
      var received = this.get('received');
      this.log.push({
        log: 'Hook ' + name + ' receive',
        msg:  'file ' + files[e.index] + '('+ e.index +'). spend time:' + this._getTime(),
        type: 'hook',
        file: files[e.index],
        hook: name
      });
      received[files[e.index]] = true;

    }, this);

    hook.on('reject', function(e){
      this.log.push({
        log: 'Hook ' + name + ' reject',
        msg: 'file ' + files[e.index] + 
        '('+ e.index +'). spend time:' + this._getTime(),
        type: 'hook',
        file: files[e.index],
        hook: name
      });
    }, this);

    hook.on('change:len:' + len, function(){
      var hooks = this.get('hooks');
      var _files = this.get('_files');
      hooks.shift();
      _files.shift();
      this.parse();
    }, this);

    hook.parse();
  },

  /**
   * 文件列表夹，显示所有文件
   */
  _listDir: function listDir(){
    var file = this.get('files')[0];
    var basePath = this.get('path');
    var dir = basePath + file;
    var html = '<html><meta charset="utf-8"><body><ul>';
    var self = this;

    fs.readdir(dir, function readdir(err, files){
      self.fire('set:header', {type: '.html'});
      if (err){
        self.fire('err', {message: ERROR_TYPE[500], type: 500});
        return;
      }

      html += '<li><a href="..">..\n';
      files.forEach(function(name){
        ext = path.extname(name);
        if (!ext) name = name + '/';
        html += '<li><a href="' + name + '">' + name + "\n";
      });
      self.log.push({
        type: 'dir',
        msg: 'List dir ' + dir,
        log: 'Origin dir'
      });
      self._endData(html);
    });
  },

  _recodeTime: function recodeTime(){
    var time = this.get('time');
    time.push(Date.now());
    this.set('time', time);
  },

  _getTime: function getTime(){
    var time = this.get('time');
    var now = Date.now();
    return now - time[0];
  },

  getSpendTime: function(){
    return this._getTime();
  },

  _getFile: function getFile(file, i){

    if (this.isFinish()) return;

    var received = this.get('received');
    var basePath = this.get('path');
    var maps = this.get('maps');
    var filePath = maps[file] || basePath + file;

    if (file && !received[file]) {
      this.log.push({
        msg:'file ' + file + '(' + i + '). Spend time: ' + this._getTime(),
        log: 'Origin file receive',
        type: 'hook',
        hook: 'origin',
        file: file
      });
      this._steamRead(filePath, i);
    }
  },

  _steamRead: function steamRead(filePath, i){

    if (this.isFinish()) return;

    var steam = fs.createReadStream(filePath);
    var files = this.get('files');
    var self = this;
    var ret = [];

    steam.on('data', function(data){
      self._pushData(data, i);
    });

    steam.on('end', function(){
      var now = self.get('now');
      self.log.push({
        msg:'Get file ' + files[i] + '(' + i + '). Spend time: ' + self._getTime(),
        log: 'Origin file',
        type: 'hook',
        hook: 'origin',
        file: files[i]
      });
      self._endData('', i);
    });

    steam.on('error', function(err){
      if (filePath.indexOf('favicon.ico') !== -1) return;
      log('Error ' + err.code + '', 'error', err.message);
      var errObj = {message: err.message, file: filePath, index: i, type: 500};
      if (err.errno == 34){
        errObj.message = ERROR_TYPE[404];
        errObj.type = 404;
      }
      self.fire('err', errObj);
    });
  },

  isFinish: function isFinish(){
    var status = this.get('status');
    return status === 'end';
  }

});
module.exports = Origin;
