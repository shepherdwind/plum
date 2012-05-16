'use strict';

var fs = require('fs');
var http = require('http');
var path = require('path');
var Origin = require('./hooks/origin');
var config;
var MIME;

function init(){
  /**
   * 入口，读取配置文件
   */
  fs.readFile(__dirname + '/server.json', 'utf-8', function(err, json){

    if (err) console.log(err);

    config = JSON.parse(json);
    config.port = config.proxy || 80;
    MIME = config.MIME;

    http.createServer(function createServer(req, res){
      new Server(req, res);
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

    var host = req.headers.host;
    var url = req.url;
    var files = this.parse(url);
    var ext = path.extname(files[0]);
    var hosts = config.servers;

    //console.log(req.headers);
    if (!hosts[host]){
      console.log('[Error], ' + host + ' is not defined in the config.json');
      return;
    }

    var basePath = hosts ? (hosts[host]['path'] || __dirname) : __dirname;

    //处理路径问题，默认从dirIndex中读取，如果没有则显示list
    if (!ext){
      var fileName;
      var index = config['dirIndex'].some(function(file){
        //如果是dir, 则只有一个文件,即files.length == 1
        fileName = files[0] + file;
        ext = path.extname(file);
        return path.existsSync(basePath + fileName);
      });
      !index ? (ext = '') : (files[0] = fileName);
    }

    var hooks = this.getHooks(ext, host);

    var cfg = {
      path: basePath,
      files: files,
      len: files.length,
      ext: ext,
      hooks: hooks,
      time: []
    };
    this.hook(cfg);

    var type = this.get('type');
    type = MIME[ext] || MIME['.html'];

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

    hook.set('MIME', MIME);
    hook.set('request', this.request);

    //修改头信息
    hook.on('set:header', function(e){
      if (e.type && MIME[e.type]){
        this.set('type', MIME[e.type]);
      }
    }, this);

    hook.once('data', function(){
      res.writeHead(200, {
        'Content-Type': this.get('type')
      });
    }, this);
    hook.on('data', this.success, this);

    hook.once('end', function(){
      res.end();
      //超过20ms的信息log出来
      if (hook.getSpendTime() > 20){
        hook.log.forEach(function(msg){
          console.log(msg);
        });
      }
    });
    hook.once('err', this.error, this);
    hook.parse();

  },

  /**
   * 处理错误
   */
  error: function (e){
    var response = this.response;
    var file = e.file || '';
    console.log('[Error ' + e.type + ']: ' + file);
    this.writeHead(e.type, {'Content-Type': MIME['.html']});
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

  getHooks: function(ext, host){
    if (!ext) return [];
    try {
      var ret = config['servers'][host]['hooks'] || [];
      ret = ret[ext] || [];
      var _hook = config['hooks'][ext] || [];
      ret = ret.concat(_hook);
      return ret;
    } catch(e){ console.log(e); throw e;}
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

module.exports = init;
