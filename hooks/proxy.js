'use strict';
var stdclass = require('../lib/stdclass');
var path = require('path');
var http = require('http');
var dns = require('dns');
var fs = require('fs');

var PUB_SRV = 'assets.gslb.taobao.com';
var IP_PUB;
var USE_PRE = false;
var IP_PRE = '110.75.14.33';
var DAILY_IP = '10.232.16.2';
var HOST = 'a.tbcdn.cn';
var isDaily = false;

function Proxy(){
  this.init.apply(this, arguments);
}

stdclass.extend(Proxy, stdclass, {

  attributes: {
    path: '',
    files: [],
    len: 0,
    initialized: false
  },

  CONSIT: {
    request: {}
  },

  _init: function init(){
    this._bind();
    this._getIp();
  },

  _bind: function bind(){
    this.on('change:initialized', function(e){
      if (e.now) this.parse();
    });
  },

  parse: function parse(){
    this.selectServer();
    if (!this.get('initialized')) return;
    var files = this.get('files');
    var basePath = this.get('path');

    files.forEach(function(file, i){
      if (file !== false){
        var filePath = basePath + file;
        path.exists(filePath, this._loadRemote.bind(this, file, i));
      } else {
        this._add();
      }
    }, this);

  },

  _add: function(){
    this.set('len', this.get('len') + 1);
  },

  selectServer: function(){
    var request = this.get('request');
    var host = request.headers.host;
    HOST = host;
    if (host === 'assets.daily.taobao.net') {
      this.set('initialized', true, false);
      isDaily = true;
    } else {
      isDaily = false;
    }
  },

  _getIp: function getIp(){
    var self = this;

    if (!IP_PUB){
      dns.resolve4(PUB_SRV, function (err, addresses) {
        if (err) {
          console.log('[Error]:Can\'t connect to ' + PUB_SRV);
        }
        IP_PUB = addresses[0];
        self.set('initialized', true);
      });
    } else {
      self.set('initialized', true, false);
    }
  },

  _loadRemote: function loadRemote(file, i, exist){

    //如果存在，则退出
    if (exist) return this._add();

    var self = this;
    var ret = [];

    http.get({
      headers: {
        host: HOST
      },
      host: isDaily ? DAILY_IP : IP_PUB,
      port: 80,
      path: file
    }, function (res) {

      res.on('data', function(data){
        self.fire('data', {data: data, index: i});
      });

      res.on('end', function(){
        self.fire('end', {index: i});
        self._add();
      });

    }).on('error', function(e){
      self._add();
      console.log('[remote] got failed ' + file);
    });
  }

});

module.exports = Proxy;
