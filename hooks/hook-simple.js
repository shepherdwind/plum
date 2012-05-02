'use strict';
var stdclass = require('../lib/stdclass');
var path = require('path');
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
      if (file !== false) return this._add();

      return this._condiction() ? this._do(file, i): this._add();

    }, this);

  },

  _add: function(){
    this.set('len', this.get('len') + 1);
  },

  _condiction: function(file){
    /**
     * var basePath = this.get('path');
     * var filePath = basePath + file;
     * var condiction = !path.existsSync(filePath);
     * return condiction;
     */
  },

  _do: function _do(file, i){
  }

});

module.exports = Hook;
