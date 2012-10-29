/**
 * @fileoverview php hook实现 
 * @author hanwen<hanwen.sah@taobao.com>
 */
'use strict';
var stdclass   = require('../../lib/stdclass');
var path       = require('path');
var http       = require('http');
var fs         = require('fs');
var exists     = fs.exists || path.exists;
var existsSync = fs.existsSync || path.existsSync;
var spawn      = require('child_process').spawn;
var phpserver  = {};
var port       = 8080;

process.on('exit',function(){
  var keys = Object.keys(phpserver);
  keys.forEach(function(key){
    console.log('kill php server on port:' + phpserver[key].port);
    for (var i = 0; i < phpserver[key].num; i++) {
      var id = i || '';
      phpserver[key]['server' + id].kill('SIGHUP');
    }
  });
});

function Hook(){
  this.init.apply(this, arguments);
}

stdclass.extend(Hook, stdclass, {

  attributes: {
    path        : '',
    files       : [],
    len         : 0,
    initialized : true
  },

  CONSIT: {
    request: {},
    data: [],
    bin: {}
  },

  _init: function init(){
    this._bind();
  },

  _bind: function bind(){
    this.on('change:initialized', function(e){
      if (e.now) this.parse();
    });
  },

  parse: function parse(){

    if (!this.get('initialized')) return;

    var files = this.get('files');
    var basePath = this.get('path');

    files.forEach(function(file, i){
      if (file === false) return this._add();

      var filePath = basePath + file;
      //接受所有请求
      this._do(file, i, true);

      return null;

    }, this);

  },

  _add: function(){
    this.set('len', this.get('len') + 1);
  },

  _do: function _do(file, i, exist){
    if (!exist){ 
      //拒绝处理
      this.fire('reject', {file: file, index: i});
      return this._add();
    }

    //接受处理
    this.fire('receive', {file: file, index: i});
    this._add();

    var self     = this;

    var basePath = this.get('path');
    var server   = phpserver[basePath];
    if (!server) {
      server = this._createServer();
      var _run = true;
    }

    if (_run){
      //延迟400ms，等待php服务器启动
      setTimeout(function(){
        self._proxy(self._chooseServer(basePath), file, i);
      }, 400);
    } else {
      self._proxy(self._chooseServer(basePath), file, i);
    }

    return null;
  },

  _chooseServer: function(basePath){
    var customs = this.get('customs');
    var server = phpserver[basePath];
    var ret = server['port'];
    if (customs && customs['thread']){
      var id = server['id'];
      //0 or null
      if (!id) {
        server['id'] = 1;
      } else if(customs['thread'] > id) {
        server['id'] ++;
        ret = server['port' + id];
      } else {
        server['id'] = 1;
      }
    }

    return ret;
  },

  _createServer: function(){
    var customs = this.get('customs');
    var server = {};
    var thread = customs ? parseInt(customs.thread, 10): 1;
    var basePath = this.get('path');
    thread = thread || 1;

    for (var i = 0; i < thread; i++) {
      port = port + 1;
      var argvs = ['-S','127.0.0.1:' + port];
      var rewriteFile = basePath + '/__route.php';
      if (existsSync(rewriteFile)) argvs.push('__route.php');
      var phpCmd = this.get('bin')['php'];
      //如果是相对路径
      if (phpCmd.indexOf('.') > -1){
        phpCmd = path.resolve(__dirname, path.dirname(phpCmd)) + 
                 '/' + path.basename(phpCmd);
      }

      var _run = spawn(phpCmd, argvs, {cwd: basePath});

      _run.stdout.on('data', function (data) {
        //console.log('stdout: ' + data);
      });

      _run.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
      });

      var _id = i || '';

      server['server' + _id] =  _run;
      server['port' + _id] = port;
      console.log('[proxy php]run php server on port: ' + port);
    }
    server.num = thread;
    server.id = 0;

    phpserver[basePath] = server;
    return server;
  },

  _proxy: function(port, file, i){

    var self    = this;
    var request = this.get('request');
    var headers = {};

    for(var x in request.headers){
      headers[toUper(x)] = request.headers[x];
    }

    function toUper(x){
      var parts = x.split('-');
      parts = parts.map(function(str){
        return str[0].toUpperCase() + str.slice(1);
      });
      return parts.join('-');
    }

    var proxyServer = http.request({
      host    : '127.0.0.1',
      port    : port,
      method  : request.method,
      headers : headers,
      path    : request.url
    });

    proxyServer.on('response', function (res) {
      var _headers = {};

      for(var x in res.headers){
        _headers[toUper(x)] = res.headers[x];
      }
      self.fire('set:header', {headers: _headers, code: res['statusCode']});
      res.on('data', function(data){
        self.fire('data', {data: data, index: i});
      });

      res.on('end', function(){
        self.fire('end', {index: i});
      });

    });

    proxyServer.on('error', function(e){
      console.log('[remote] got failed ' + file);
    });

    this.get('data').forEach(function(buf){
      proxyServer.write(buf);
    });
    proxyServer.end();
  }

});

module.exports = Hook;
