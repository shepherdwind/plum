
var stdclass = require('../lib/stdclass');
var log = require('../lib/logger').log;
var path = require('path');
var fs = require('fs');
var stylus = require('stylus');
var exists = fs.exists || path.exists;
var sys = require('util');

function LessHook(){
  this.init.apply(this, arguments);
}

stdclass.extend(LessHook, stdclass, {

  attributes: {
    path: '',
    files: [],
    maps: {},
    len: 0
  },

  CONSIT: {
    request: {}
  },

  _init: function init(){
    this._bind();
  },

  _bind: function(){
  },

  parse: function(){

    var files = this.get('files');
    var basePath = this.get('path');
    var self = this;

    files.forEach(function(file, i){

      if (file === false) {

        this._add();

      } else {

        var maps = this.get('maps');
        var filePath = maps[file] || basePath + file;
        filePath = filePath.replace('.css', '.styl');
        exists(filePath, this._lessc.bind(this, file, filePath, i));

      }
    }, this);
  },

  _add: function(){
    this.set('len', this.get('len') + 1);
  },

  _lessc: function lessc(file, filePath, i, exist){

    if (!exist){
      //拒绝处理
      this.fire('reject', {file: file, index: i});
      this._add();
      return;
    }
    //接受处理
    this.fire('receive', {file: file, index: i});
    this._add();

    var self = this;
    var files = this.get('files');

    var request = this.get('request');
    var referer = request.headers['referer'];
    var isWriteFile = false;
    var isBuildLess = /[\?&](build)|(build&)/;
    if (referer && isBuildLess.test(referer) > 0){
      isWriteFile = true;
    }

    fs.readFile(filePath, function readFile(err, css){

      if (err) return ;

      try {

        stylus(css.toString())
          .set('filename', filePath)
          .include(path.dirname(filePath))
          .render(function (err, data){

            try {

              if (isWriteFile){
                fs.writeFile(filePath.replace('.styl', '.css'), data, function (err) {
                  if (err) {
                    log('stylus write error','error', err);
                  } else {
                    log('Less build', 'info', 'success ' + file);
                  }
                });
              }

            } catch(e){
              log('stylue error', 'error', e.message + ', on file ' + file + ' at line ' + e.line);
            }

            if (err) {
              log('stylus parser error', 'error', err.message + ', on file ' + err.filename);
              data = err.message + ", on file " + file;
            }

            self.fire('end', {index: i, data: data});
        });

      } catch(e){
        console.log(e.message);
        console.log('[Error] stylus error on file ' + file);
      }
    });
  }

});

module.exports = LessHook;
