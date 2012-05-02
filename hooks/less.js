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

    files.forEach(function(file, i){
      if (file !== false){
        var filePath = basePath + file.replace('.css', '.less');
        if (path.existsSync(filePath)){
          this._lessc(filePath, i);
        } else {
          this.set('len', this.get('len') + 1);
        }
      } else {
        this.set('len', this.get('len') + 1);
      }
    }, this);
  },

  _lessc: function lessc(file, i){
    var self = this;
    var files = this.get('files');

    var parser = new(less.Parser)({
      paths: [path.dirname(file)], 
      filename: path.basename(file)
    });

    function dealErr(err){
      console.log(err);
      addLen();
      return false;
    }
    function addLen(){
      var len = self.get('len');
      len = len + 1;
      self.set('len', len);
    }

    fs.readFile(file, function readFile(err, css){
      if (err) return dealErr(err);

      try {
        parser.parse(css.toString(), function lessc(err, tree){
          if (err) return dealErr(err);
          self.fire('dataLoad', {
            index: i,
            data: [tree.toCSS()]
          });
          addLen();
        });
      } catch(e){
        console.log(e.message);
        console.log('[Error] lessc error on file ' + file);
        addLen();
      }
    });
  }

});

module.exports = LessHook;
