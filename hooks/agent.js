'use strict';
var stdclass = require('../lib/stdclass');
var path = require('path');
var fs = require('fs');
var http = require('http');
var log = require('../lib/logger').log;

function Hook(){
  this.init.apply(this, arguments);
}

stdclass.extend(Hook, stdclass, {

 attributes: {
    path: '',
    files: [],
    len: 0,
    customs: {},
    initialized: true
  },

  CONSIT: {
    data: [],
    request: {}
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

    files.forEach(function(file, i){
      if (file === false) return this._add();
      var basePath = this.get('path');
      var filePath = basePath + file;
      this._do(file, i, false);
      return null;
    }, this);

  },

  _add: function(){
    this.set('len', this.get('len') + 1);
  },

  _proxy: function(file, i){

    var self    = this;
    var request = this.get('request');
    var headers = {};
    var customs = this.get('customs');
    var hosts = customs['hosts'];
    var host;
    if (hosts) {
      host = hosts[customs['host']];
    } else {
      host = customs['host'];
    }

    var port = this.get('customs')['port'];
    if (!host) log('config error', 'warn', 'cusotms.host is not defined @ host ' + request.headers.host);

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

    headers.Host = host;
    var proxyServer = http.request({
      host    : host,
      port    : port || 80,
      method  : request.method,
      headers : headers,
      path    : file
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

      res.on('error', function(){
        console.log('error');
      });

    });

    proxyServer.on('error', function(e){
      console.log('[remote] got failed ' + file);
    });

    this.get('data').forEach(function(buf){
      proxyServer.write(buf);
    });
    proxyServer.end();
  },

  _do: function _do(file, i, exist){
    //如果存在，则退出
    if (exist){ 
      //拒绝处理
      this.fire('reject', {file: file, index: i});
      this._add();
      return;
    }

    //接受处理
    this.fire('receive', {file: file, index: i});
    this._add();
    this._proxy(file, i);
  }

});

module.exports = Hook;
