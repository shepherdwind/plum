var stdclass = require('../lib/stdclass');
var path = require('path');
var fs = require('fs');
var less = require('less');

function LessHook(){
  this.init.apply(this, arguments);
}

stdclass.extend(LessHook, stdclass, {

  attributes: {
    path: '',
    files: [],
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

        var filePath = basePath + file.replace('.css', '.less');
        path.exists(filePath, this._lessc.bind(this, filePath, i));

      }
    }, this);
  },

  _add: function(){
    this.set('len', this.get('len') + 1);
  },

  _lessc: function lessc(file, i, exist){

    if (!exist) return this._add();

    var self = this;
    var files = this.get('files');
    this.fire('running', files[i]);

    var request = this.get('request');
    var referer = request.headers['referer'];
    var isWriteFile = false;
    if (referer && referer.indexOf('?less') > 0){
      isWriteFile = true;
    }

    var parser = new(less.Parser)({
      paths: [path.dirname(file)], 
      filename: path.basename(file)
    });

    fs.readFile(file, function readFile(err, css){

      if (err) return self._add();

      try {

        parser.parse(css.toString(), function lessc(err, tree){
          var data;
          try {
            data = tree.toCSS();

            if (isWriteFile){
              fs.writeFile(file.replace('.less', '.css'), data, function (err) {
                if (err) {
                  console.log(err);
                } else {
                  console.log('[Less build] success ' + file);
                }
              });
            }

          } catch(e){
            console.log(e.message);
            console.log('[Error] lessc error on file ' + file);
          }

          if (err) {
            console.log(err.message);
            data = err.message + ", on file " + file;
          }

          self._add();
          self.fire('end', {index: i, data: data});
        });

      } catch(e){
        console.log(e.message);
        console.log('[Error] lessc error on file ' + file);
        self._add();
      }
    });
  }

});

module.exports = LessHook;
