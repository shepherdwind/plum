'use strict';
var stdclass = require('../../lib/stdclass');
var path = require('path');
var fs = require('fs');
var exists = fs.exists || path.exists;
var URL      = require('url');
var webx = require('./webx');

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
      var basename = path.basename(file).replace(/\.html{0,1}$/, '');
      var filePath = basePath + 'screen' + path.dirname(file) + '/' + basename + '.vm';
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

    var request = this.get('request');
    var url = URL.parse(request.url, true);
    var isParse = '__parse' in url.query;

    //接受处理
    this.fire('receive', {file: file, index: i});
    this.fire('set:header', {headers: {'Content-Type': "text/html; charset=gbk"}});
    this._add();

    if (isParse) {
      this.fire('set:header', {type: '.json'});
    }

    try {
      var str = (new webx({
        filePath: filePath,
        isParse: isParse,
        basePath: this.get('path'),
        file : file
      })).parse();
      this.fire('end', {index: i, data: str });
    } catch(e) {
      this.fire('end', {index: i, data: '<pre>' + e.toString()});
    }
  }

});

module.exports = Hook;
