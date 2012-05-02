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

  CONSIT: {},

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
    if (!this.get('initialized')) return;
    var files = this.get('files');
    var basePath = this.get('path');

    files.forEach(function(file, i){
      if (file !== false){
        var filePath = basePath + file;

        if (!path.existsSync(filePath)){
          this._loadRemote(file, i);
        } else {
          this.set('len', this.get('len') + 1);
        }
      } else {
        this.set('len', this.get('len') + 1);
      }
    }, this);

  },

  _getIp: function getIp(){
    var self = this;
    dns.resolve4(PUB_SRV, function (err, addresses) {
      if (err) {
        console.log('[Error]:Can\'t connect to ' + PUB_SRV);
      }
      IP_PUB = addresses[0];
      self.set('initialized', true);
    });
  },

  _loadRemote: function loadRemote(file, i){
    var self = this;
    function addLen(){
      var len = self.get('len');
      len++;
      self.set('len', len);
    }
    var ret = [];

    http.get({
      headers: {
        host: 'a.tbcdn.cn'
      },
      host: USE_PRE ? IP_PRE : IP_PUB,
      port: 80,
      path: file
    }, function (res) {

      res.on('data', function (data) {
        ret.push(data);
      });
      res.on('end', function () {
        self.fire('dataLoad', {
          data: ret,
          index: i
        });
        addLen();
      });
    }).on('error', function(e){
      addLen();
      console.log('[remote] not got ' + file);
    });
  }

});

module.exports = Proxy;
