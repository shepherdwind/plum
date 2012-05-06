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

  CONSIT: {},

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

    var parser = new(less.Parser)({
      paths: [path.dirname(file)], 
      filename: path.basename(file)
    });

    fs.readFile(file, function readFile(err, css){

      if (err) return self._add();

      try {

        parser.parse(css.toString(), function lessc(err, tree){
          self.fire('end', {index: i, data: tree.toCSS()});
          self._add();
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
