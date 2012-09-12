/**
 * @fileoverview php hook实现 
 * @author hanwen<hanwen.sah@taobao.com>
 */
'use strict';
var stdclass = require('../../lib/stdclass');
var path     = require('path');
var http     = require('http');
var fs       = require('fs');
var exists   = fs.exists || path.exists;
var spawn    = require('child_process').spawn;
var phpserver = {};
var port  = 8080;

process.on('exit',function(){
  var keys = Object.keys(phpserver);
  keys.forEach(function(key){
    console.log('kill php server on port:' + phpserver[key].port);
    phpserver[key]['server'].kill('SIGHUP');
  });
});

function Hook(){
  this.init.apply(this, arguments);
}

stdclass.extend(Hook, stdclass, {

  attributes: {
    path: '',
    files: [],
    len: 0,
    initialized: true
  },

  CONSIT: {
    request: {},
    data: []
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
      exists(filePath, this._do.bind(this, file, i));

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

    var self = this;
    var basePath = this.get('path');
    var server = phpserver[basePath];
    if (!server) {
      port = port + 1;
      var _run = spawn('php',['-S','127.0.0.1:' + port], {cwd: basePath});
      console.log('[proxy php]run php server on port: ' + port);
      server = {server: _run, port: port};
      phpserver[basePath] = server;
    }

    function pingIt(){
      var ping = spawn('ping', ['-c', 1, '127.0.0.1:' + port]);
      ping.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
      });

      ping.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
      });

      ping.on('exit', function (code) {
        console.log('child process exited with code ' + code);
      });

    }

    if (_run){
      //延迟400ms，等待php服务器启动
      setTimeout(function(){
        self._proxy(server['port'], file, i);
      }, 400);
    } else {
      self._proxy(server['port'], file, i);
    }

    return null;
  },

  _proxy: function(port, file, i){

    var self    = this;
    var request = this.get('request');
    var headers = {};

    for(var x in request.headers){
      var parts = x.split('-');
      parts = parts.map(function(str){
        return str[0].toUpperCase() + str.slice(1);
      });
      headers[parts.join('-')] = request.headers[x];
    }

    var proxyServer = http.request({
      host    : headers['host'],
      port    : port,
      method  : request.method,
      headers : headers,
      path    : request.url
    });

    proxyServer.on('response', function (res) {

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
