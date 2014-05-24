var stdclass = require('../lib/stdclass');
var log = require('../lib/logger').log;
var path = require('path');
var fs = require('fs');
var less = require('less');
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
        filePath = filePath.replace('.css', '.less');
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
    var isBuildLess = /[\?&](less$)|(less&)/;
    if (referer && isBuildLess.test(referer) > 0){
      isWriteFile = true;
    }

    var parser = new(less.Parser)({
      paths: [path.dirname(filePath)], 
      filename: path.basename(filePath)
    });

    fs.readFile(filePath, function readFile(err, css){

      if (err) return ;

      try {

        parser.parse(css.toString(), function lessc(err, tree){
          var data;
          try {
            data = tree.toCSS();

            if (isWriteFile){
              fs.writeFile(filePath.replace('.less', '.css'), data, function (err) {
                if (err) {
                  log('less write error','error', err);
                } else {
                  log('Less build', 'info', 'success ' + file);
                }
              });
            }

          } catch(e){
            log('less error', 'error', e.message + ', on file ' + file + ' at line ' + e.line);
          }

          if (err) {
            log('less parser error', 'error', err.message + ', on file ' + err.filename);
            data = err.message + ", on file " + file;
          }

          self.fire('end', {index: i, data: data});
        });

      } catch(e){
        console.log(e.message);
        console.log('[Error] lessc error on file ' + file);
      }
    });
  }

});

module.exports = LessHook;
