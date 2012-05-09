/**
 * @fileoverview php hook实现 
 * @author hanwen<hanwen.sah@taobao.com>
 */
'use strict';
var stdclass = require('../../lib/stdclass');
var path = require('path');
var http = require('http');
var fs = require('fs');

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

      path.exists(filePath, this._do.bind(this, file, i));

      return null;

    }, this);

  },

  _add: function(){
    this.set('len', this.get('len') + 1);
  },

  _do: function _do(file, i, exist){
    if (!exist) return this._add();

    var self = this;

    http.get({
      host: '127.0.0.1',
      port: 8080,
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

    return null;
  }

});

module.exports = Hook;
