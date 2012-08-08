'use strict';
var stdclass = require('../lib/stdclass');
var path = require('path');
var fs = require('fs');
var exists = fs.exists || path.exists;

function Hook(){
  this.init.apply(this, arguments);
}

stdclass.extend(Hook, stdclass, {

 attributes: {
    path: '',
    files: [],
    maps: {},
    len: 0,
    initialized: true
  },

  CONSIT: {},

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
      var maps = this.get('maps');
      var filePath = maps[file] || basePath + file;
      exists(filePath, this._do.bind(this, file, filePath, i));
      return null;
    }, this);

  },

  _add: function(){
    this.set('len', this.get('len') + 1);
  },

  _do: function _do(file, filePath, i, exist){
    if (!exist){
      //拒绝处理
      this.fire('reject', {file: file, index: i});
      this._add();
      return;
    }
    //接受处理
    this.fire('receive', {file: file, index: i});
    this._add();

    this._steamRead(filePath, i);
  },

  _steamRead: function steamRead(filePath, i){

    var steam = fs.createReadStream(filePath);
    var files = this.get('files');
    var self = this;
    var ret = [];

    steam.on('data', function(data){
      self.fire('data', {data: data, index: i});
    });

    steam.on('end', function(){
      self.fire('end', {index: i});
    });

    steam.on('error', function(err){
      if (filePath.indexOf('favicon.ico') !== -1) return;
      console.log('[Error ' + err.code + ']' + err.message);
    });
  }

});

module.exports = Hook;
