'use strict';
var stdclass = require('../lib/stdclass');
var path = require('path');
var fs = require('fs');
var exists = fs.exists || path.exists;
var Velocity = require('velocityjs');
var URL      = require('url');

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

      var basePath = this.get('path') + path.dirname(file) + '/';
      var basename = path.basename(file).replace(/\.html{0,1}$/, '');
      var filePath = basePath + basename + '.vm';
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
    this._add();

    var dataFile = path.dirname(filePath) + '/.data/' + path.basename(filePath);
    var data = {};
    if (fs.existsSync(dataFile)) {
      data = JSON.parse(fs.readFileSync(dataFile).toString());
    }

    var vm = fs.readFileSync(filePath).toString();
    try {
      var html = Velocity.Parser.parse(vm);
      if (isParse) {
        this.fire('set:header', {type: '.json'});
        var str = JSON.stringify(html, false, 2);
      } else {
        str = new Velocity.Compile(html).render(data);
      }

      this.fire('end', {index: i, data: str});
    } catch(e) {
      this.fire('end', {index: i, data: '<pre>' + e.toString()});
      throw e;
    }
  }

});

module.exports = Hook;
