'use strict';
var stdclass = require('../lib/stdclass');
var path     = require('path');
var http     = require('http');
var dns      = require('dns');
var fs       = require('fs');
var url      = require('url');
var exists = fs.exists || path.exists;

var ips = {
  'g.tbcdn.cn': '115.238.23.250',
  'assets.daily.taobao.net': '10.235.136.37',
  'g.assets.daily.taobao.net': '10.235.136.37'
};
var ignoreList = ['global-min.js'];
var PUB_SRV = 'assets.gslb.taobao.com';
var IP_PUB;
var USE_PRE = false;
var IP_PRE = '110.75.14.33';
var DAILY_IP = '10.235.136.37';
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
    initialized: false,
    proxy: 'pub'
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
        //exists(filePath, this._loadRemote.bind(this, file, i));
        this._loadRemote(file, i, false);
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
    var referer = request.headers.referer;
    if (host in ips && ips.hasOwnProperty(host)) {
      this.set('initialized', true, false);
      isDaily = true;
    } else {
      var customs = this.get('customs') || {};
      var proxy = customs.proxy || {};
      if (proxy == 'pre'){
        this.set('initialized', true, false);
        this.set('proxy', proxy);
      } else {
        this.set('proxy', 'pub');
      }
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
    if (exist){ 
      //拒绝处理
      this.fire('reject', {file: file, index: i});
      this._add();
      return;
    }

    //接受处理
    this.fire('receive', {file: file, index: i});
    this._add();
    var ip = this.get('proxy') == 'pre'? IP_PRE : IP_PUB;

    var self = this;
    var ret = [];
    var time = Date.now();
    var customs = this.get('customs') || {};
    var isDebug = customs.debug;

    if (isDebug) {

      var isIgnore = ignoreList.some(function(ignore){
        return file.indexOf(ignore) > -1;
      })

      if (isIgnore) isDebug = false;

    }

    var filePath = isDebug ? file.replace('-min', '') : file;

    console.log('proxy start %s: %sms', filePath, Date.now() - serverTime);

    http.get({
      headers: {
        host: HOST
      },
      host: isDaily ? ips[HOST]: ip,
      port: 80,
      path: filePath
    }, function (res) {

      res.on('data', function(data){
        console.log('get buffer %s: %sms, len: %s', filePath, Date.now() - time, data.length);
        self.fire('data', {data: data, index: i});
      });

      res.on('end', function(){
        self.fire('end', {index: i, time: '/' + (Date.now() - time) + 'ms'});
      });

    }).on('error', function(e){
      console.log('[remote] got failed ' + file);
    });
  }

});

module.exports = Proxy;
