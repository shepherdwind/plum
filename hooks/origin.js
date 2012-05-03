var stdclass = require('../lib/stdclass');
var path = require('path');
var fs = require('fs');

var ERROR_TYPE = {
  503: '<p>Error 503. Too much time,  much more than the max time of server allowed',
  415: "<p><strong>Error 415</strong><p>Sever do not support the file type: ",
  404: "<p> <strong>404 Error!\n <p>The url you requre is not exist!",
  500: "<p><strong>500 Server Error!"
};

function Origin(){
  this.init.apply(this, arguments);
}

stdclass.extend(Origin, stdclass, {
  attributes: {
    path: '',
    files: [],
    ext: '',
    len: 0,
    now: 0,
    //born | begin | initialized | finish
    status: 'born',
    time: [],
    hooks: []
  },

  CONSIT: {
    MIME: {},
    //服务器超时10s
    TIME_OUT: 10000
  },

  _init: function init(){
    this.data = [];
    this.log = [];
    this._bind();

    var self = this;
    var timer = setTimeout(function(){
      self.fire('onerror', {message: ERROR_TYPE[503], type: 503});
    }, this.get('TIME_OUT'));

    this._recodeTime();

    this._clearTimeOut = function(){
      clearTimeout(timer);
    };

    this.log.push('[Origin begin]:' + this.get('len') + ' files');

  },

  _bind: function bind(){
    //所有文件都成功读取到
    this.on('change:now:' + this.get('len'), function(e){
      this.set('status', 'finish');
      var time = this.get('time');
      this.log.push('[Origin end] spend time: ' + (time[1] - time[0]) + 'ms');

      this.fire('finish', {data: this.data});
    });

    //发生错误
    this.on('onerror', function(){
      this.set('status', 'finish');
    });

    this.on('change:status:finish', function(){
      this._recodeTime();
      this._clearTimeOut();
    });

    //初始化完成，开始读取文件
    this.on('change:status:initialized', function(e){
      var files = this.get('files');
      files.forEach(this._getFile, this);
    });
  },

  parse: function parse(){
    var ext = this.get('ext');
    var MIME = this.get('MIME');
    var hooks = this.get('hooks');

    if (hooks.length){
      this._loadHook(hooks[0]);
    } else {
      if (ext && !MIME[ext]){
        this.fire('onerror', {'message': ERROR_TYPE[415] + ext, type: "415"});
        return;
      }

      ext ? this.set('status', 'initialized'): this._listDir();
    }
  },

  _loadHook: function loadHook(name){
    var hookRun = require('./' + name);
    var len = this.get('len');
    var files = this.get('files');
    var hook = new hookRun({
      path: this.get('path'), 
      files: files.slice()
    });

    hook.on('dataLoad', function(e){
      this.data[e.index] = e.data;
      this.log.push('[Hook ' + name + '] Got file ' + files[e.index]);
      files[e.index] = false;

      this.set('now', this.get('now') + 1);
    }, this);

    hook.on('change:len:' + len, function(){
      var hooks = this.get('hooks');
      hooks.shift();
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
      if (err){
        self.fire('onerror', {message: ERROR_TYPE[500], type: 500});
        return;
      }

      html += '<li><a href="..">..\n';
      files.forEach(function(name){
        ext = path.extname(name);
        if (!ext) name = name + '/';
        html += '<li><a href="' + name + '">' + name + "\n";
      });
      self.data.push([html]);
      self.log.push('[Origin dir]: List dir ' + dir);
      self.set('now', 1);
    });
  },

  _recodeTime: function recodeTime(){
    var time = this.get('time');
    time.push(Date.now());
    this.set('time', time);
  },

  _getFile: function getFile(file, i){

    if (this.isFinish()) return;

    var path = this.get('path');
    var filePath = path + file;
    if (file) this._steamRead(filePath, i);
  },

  _steamRead: function steamRead(filePath, i){

    if (this.isFinish()) return;

    var steam = fs.createReadStream(filePath);
    var files = this.get('files');
    var self = this;
    var ret = [];

    steam.on('data', function(data){
      ret.push(data);
    });

    steam.on('end', function(){
      var now = self.get('now');
      self.data[i] = ret;
      self.log.push('[Origin file]: Get file ' + files[i]);

      files[i] = false;
      now = now + 1;
      self.set('now', now);
    });

    steam.on('error', function(err){
      console.log('[Error ' + err.code + ']' + err.message);
      var errObj = {message: err.message, file: filePath, index: i, type: 500};
      if (err.errno == 34){
        errObj.message = ERROR_TYPE[404];
        errObj.type = 404;
      }
      self.fire('onerror', errObj);
    });
  },

  isFinish: function isFinish(){
    var status = this.get('status');
    return status === 'finish';
  }

});
module.exports = Origin;
