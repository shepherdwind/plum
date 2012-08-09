'use strict';

var fs = require('fs');
var http = require('http');
var path = require('path');
var querystring = require('querystring');
var Origin = require('./hooks/origin');
var config;
var servers = {};
var configStr = '';
var MIME;
var existsSync = fs.existsSync || path.existsSync;
var URL = require('url');

function init(){
  /**
   * 入口，读取配置文件
   */
  var configPath = path.resolve(__dirname, '../') + '/server.json';
  if (!existsSync(configPath)){
    configPath = __dirname + '/server.json';
  }

  fs.readFile(configPath, 'utf-8', function(err, json){

    if (err) console.log(err);

    config = JSON.parse(json);
    config.port = config.proxy || 80;
    MIME = config.MIME;

    http.createServer(function createServer(req, res){

      if (req.url === '/config') {
        if (req.method === 'POST') {
          setStatus(req, res, configPath);
        } else {
          getStatus(req, res, configStr || json);
        }
      } else {
        new Server(req, res);
      }
    }).listen(config.port);
  });
}

function Server(request, response, cfg){
  this.request = request;
  this.response = response;
  this.init(cfg);
}

Server.prototype = {
  constructor: Server,
  attributes: {
    header: {
      Server: "Node"
    },
    type: ''
  },

  get: function(key){
    return this.attributes[key];
  },

  set: function(key, val){
    this.attributes[key] = val;
  },

  /**
   * 初始化服务器
   */
  init: function(conf){

    this.mixin(conf);
    this.initFiles();

  },

  initFiles: function(){
    var req = this.request;
    var res = this.response;

    this.data = [];
    var self = this;
    req.on('data', function(chunk) {
      self.data.push(new Buffer(chunk));
    });

    var host = req.headers.host;
    var serverConfig = this.getServerConfig(host);
    var url = URL.parse(req.url).path;
    var files = this.parse(url);
    var ext = path.extname(files[0]);
    if (url === '/favicon.ico') {
      res.end();
      return;
    }
    //var hosts = config.servers;

    //console.log(req.headers);
    if (!serverConfig){
      if (config.debug){
        console.log('[Error], ' + host + ' is not defined in the config.json');
        this.error({
          type: '505',
          message: '[Error], host ' + host + ' is not defined in the config.json'
        });
      }
      return;
    }

    var basePath = serverConfig['path'] || __dirname;

    //处理路径问题，默认从dirIndex中读取，如果没有则显示list
    if (!ext){
      var fileName;
      var index = config['dirIndex'].some(function(file){
        //如果是dir, 则只有一个文件,即files.length == 1
        fileName = files[0] + file;
        ext = path.extname(file);
        return existsSync(basePath + fileName);
      });
      !index ? (ext = '') : (files[0] = fileName);
    }

    try {
      var hooks = [];
      //var hooks = serverConfig['hooks'][ext] || [];
      var hooks2Files = [];
      var maps = serverConfig.maps || {};
      var mapPath = {};
      Object.keys(maps).forEach(function(key){
        var _map = maps[key];
        var _isHasMapedFile = false;
        var _files = files.map(function(file){
          if (file.indexOf(key) !== -1){
            //如果存在路径映射
            if (_map.path) mapPath[file] = file.replace(key, _map.path);
            _isHasMapedFile = true;
            return file;
          } else {
            return false;
          }
        });

        if (_isHasMapedFile && _map.hooks && _map.hooks[ext]) {
          _map.hooks[ext].forEach(function(hook){
            hooks.push(hook);
            hooks2Files.push(_files.slice());
          });
        }

      });
      //合并主配置
      hooks = hooks.concat(serverConfig['hooks'][ext] || []);

    } catch(e){
      throw new Error(e);
    }

    var cfg = {
      path: basePath,
      maps: mapPath,
      files: files,
      len: files.length,
      ext: ext,
      //引用引起的bug
      hooks: hooks.slice(),
      _files: hooks2Files,
      data: this.data,
      time: []
    };
    this.hook(cfg);

    var type = this.get('type');
    type = MIME[ext] || MIME['.html'];
    this.set('type', type);
  },

  mixin: function(cfg){

    cfg = cfg || {};
    var attributes = {};
    Object.keys(this.attributes).forEach(function(i){
      attributes[i] = this.attributes[i];
    }, this);
    this.attributes = attributes;

    Object.keys(cfg).forEach(function(j){
      this.attributes[j] = cfg[j];
    }, this);

  },

  hook: function(cfg){
    var req = this.request;
    var res = this.response;
    var hook = new Origin(cfg);
    var _this = this;

    hook.set('MIME', MIME);
    hook.set('bin', config.bin);
    hook.set('request', this.request);

    //修改头信息
    hook.on('set:header', function(e){
      if (e.type && MIME[e.type]){
        this.set('type', MIME[e.type]);
      }
    }, this);

    hook.once('data', function(){
      res.writeHead(200, {
        'Content-Type': this.get('type'),
        'Server': 'Node'
      });
    }, this);
    hook.on('data', this.success, this);

    hook.once('end', function(){
      res.end();
      //超过20ms的信息log出来
      //if (hook.getSpendTime() > 20){
      hook.log.forEach(function(msg){
        if (_this._shouldShow(msg)) console.log(msg.msg);
      });
      //}
    });
    hook.once('err', this.error, this);
    hook.parse();

  },

  //是否在log信息中显示
  _shouldShow: function(msg){
    if (!config.debug){
      if (msg.type == 'hook'){
        var logHooks = config.logHooks || [];
        var logFiles = config.logFiles || [];
        var hook = msg.hook;
        var file = msg.file;
        var ext  = path.extname(file);

        if (logHooks.indexOf(hook) !== -1) {
          return true;
        } else {
          return logFiles.some(function(fileDesc){
            var isFile = file.indexOf(fileDesc.path) !== -1;
            var isExt  = !fileDesc.ext || fileDesc.ext.indexOf(ext) !== -1;
            return isFile && isExt;
          });
        }

      } else if(config.logBasic){
        return true;
      }
    } else {
      return true;
    }
  },

  /**
   * 处理错误
   */
  error: function (e){
    var response = this.response;
    var file = e.file || '';
    console.log('[Error ' + e.type + ']: ' + file);
    response.writeHead(e.type, {
      'Content-Type': MIME['.html'],
      'Server': 'Node'
    });
    response.write(e.message);
    response.end();
  },

  writeHead: function(){
    var header = this.get('header');
    var response = this.response;
    Object.keys(header).forEach(function(name){
      response.writeHead(name, header[name]);
    });
  },

  /**
   * 成功解析
   */
  success: function(e){
    var response = this.response;
    e.data.forEach(function(buf){
      if (buf) response.write(buf);
    });
  },

  /**
   * 合并equal并且，支持group配置
   */
  getServerConfig: function(server){

    var cfg = config['servers'][server];
    if (!cfg) return false;

    //处理equal关系
    if (!cfg.path && cfg.equal){
      cfg = this.getServerConfig(cfg.equal);
    } 

    if (!servers[server]){

      cfg.hooks = cfg.hooks || {};
      var hooks = cfg.hooks;
      this.mixInHooks(hooks, hooks);
      this.mixInHooks(hooks, config.hooks);

      if (cfg.maps){
        var _maps = Object.keys(cfg.maps);
        _maps.forEach(function(key){
          var _hooks = cfg.maps[key].hooks;
          if (_hooks) this.mixInHooks(_hooks, _hooks);
        }, this);
      }

      servers[server] = true;
    } 
    return cfg;
  },

  mixInHooks: function(hooks, datas){
    Object.keys(datas).forEach(function(ext){
      var hook = datas[ext];
      if (ext[0] !== '.'){
        var exts = this.getGroupExts(ext);
        exts.forEach(function(ex){
          hooks[ex] = hooks[ex] || [];
          hooks[ex] = hooks[ex].concat(hook.slice());
        });
      } else {
        hooks[ext] = hooks[ext] || [];
        hooks[ext] = hooks[ext].concat(hook.slice());
      }
    }, this);
    return hooks;
  },

  getGroupExts: function(group){
    var ret = [];

    getGroup(group);
    function getGroup(ext){
      try{
        var exts = config['groups'][ext];

        exts.forEach(function(extReal){
          if (extReal[0] === '.'){
            ret.push(extReal);
          } else {
            getGroup(extReal);
          }
        });
      }catch(e){
        throw new Error('Group ' + ext + ' not defined in config.json');
      }
    }

    return ret;

  },

  /**
   * 解combine的url
   * @param url {string} 合并url路径，a.tbcdn.cn/??a.css,b.css,c.css
   * @return {array} 返回数组，url分别对应的文件
   */
  parse: function(url){//{{{
    var ret = [];
    url.replace('\\', '/');

    var combo = url.indexOf('??');
    var base, files;

    if (-1 !== combo) {
      base = url.slice(0, combo);
      files = url.slice(combo + 2);

      files = files.split('?')[0];
      files = files.split('#')[0];

      files = files.split(',');

      files.forEach(function (file) {
        var _url = base + file;
        ret.push(_url.replace('//', '/'));
      });
    } else {
      url = url.split('?')[0];
      url = url.split('#')[0];
      ret.push(url);
    }

    return ret;
  }//}}}

};

function getStatus(req, res, json) {//{{{
  res.writeHead(200, {'Content-Type': 'text/html'});
  var html = fs.readFileSync(__dirname + '/gui/config.html').toString();
  html = html.replace('{{config}}', json);
  res.end(html);
}//}}}

function setStatus(req, res, file){
  req.setEncoding('utf8');
  var formData = '';
  req.on('data', function (data) {
    formData += data;
  });
  req.on('end', function (data) {
    formData = querystring.parse(formData);
    var json = formatJson(formData.config.trim());

    config = JSON.parse(json);
    config.port = config.proxy || 80;
    MIME = config.MIME;
    servers = {};
    configStr = json;

    fs.writeFileSync(file, json);
    getStatus(req, res, json);
  });
}

function formatJson(val) {
  var retval = '';
  var str = val.replace(/[\n\r\s]+/g, '');
  var pos = 0;
  var strLen = str.length;
  var indentStr = '  ';
  var newLine = "\n";
  var _char = '';

  for (var i=0; i<strLen; i++) {
    _char = str.substring(i,i+1);

    if (_char == '}' || _char == ']') {
      retval = retval + newLine;
      pos = pos - 1;

      for (var j=0; j<pos; j++) {
        retval = retval + indentStr;
      }
    }

    retval = retval + _char;	

    if (_char == '{' || _char == '[' || _char == ',') {
      retval = retval + newLine;

      if (_char == '{' || _char == '[') {
        pos = pos + 1;
      }

      for (var k=0; k<pos; k++) {
        retval = retval + indentStr;
      }
    }
  }

  return retval;

}

module.exports = init;
