var Iconv    = require('iconv-lite');
var Velocity = require('velocityjs');
var path     = require('path');
var fs       = require('fs');
var defaultTools = require('./tools');
var stdclass = require('../../lib/stdclass');
var utils    = require('../../lib/utils');
var PARSE_GLOBAL_MACROS = '#parse_global_macros() ';

var getMacros = function(macros){

  return {
    parse_global_macros: function(){
      return this.eval(macros);
    }
  };

}; 

function Webx(){
  this.init.apply(this, arguments);
}

stdclass.extend(Webx, stdclass, {

  attributes: {
    filePath: '',
    isParse: false,
    file: '',
    basePath: '',
    compoment: {}
  },

  CONSIT: {},

  _init: function(){

    var basePath = this.get('basePath');
    var compomentFile = basePath + 'webx.json';

    if (fs.existsSync(compomentFile)) {
      var compoment = fs.readFileSync(compomentFile);
      compoment = JSON.parse(compoment.toString());
      this.set('compoment', compoment);
    }

    this.initGlobalMacros();

    this.initTools();

  },

  initTools: function(){

    var compoment = this.get('compoment');
    var toolsPath = compoment.tools;
    var basePath = this.get('basePath');

    var tools = require(basePath + toolsPath);

    tools = utils.mixin(tools, defaultTools(basePath, compoment['common-file-maps']));

    this.tools = tools;

  },

  initGlobalMacros: function(){

    var compoment = this.get('compoment');
    var macros    = compoment['global-macros'];
    var basePath  = this.get('basePath');

    var macrosStr = '';
    macros.forEach(function(file){
      macrosStr += Iconv.decode(fs.readFileSync(basePath + file), 'gbk');
    });

    this.globalMacros = Velocity.Parser.parse(macrosStr);

  },

  getContext: function(file){

    var basePath = this.get('basePath');
    var compoment = this.get('compoment');
    var jsonDataDir = basePath + compoment['json-data-dir'];

    file = jsonDataDir + '/' + file;
    var json = file.replace('.js', '.json');

    var context = {};

    if (fs.existsSync(file)) {
      context = require(file);
    }

    if (fs.existsSync(json)) {
      var buf = fs.readFileSync(json);
      context = utils.mixin(context, JSON.parse(buf.toString()));
    }

    return context;
  },

  parse: function(){

    var filePath = this.get('filePath');
    var vm = Iconv.decode(fs.readFileSync(filePath), 'gbk');
    var str = '';
    var isParse = this.get('isParse');
    var file = this.get('file').replace('.htm', '.js');
    var context = this.getContext(file);
    var basePath = this.get('basePath');

    try {

      var html = Velocity.Parser.parse(vm);

      if (isParse) {

        str = JSON.stringify(html, false, 2);

      } else {

        context = utils.mixin(context, this.tools);

        var macros = this.globalMacros;
        var vmrun = new Velocity.Compile(html, getMacros(macros));
        str = vmrun.render(context);

        var layout = this.layout(vmrun.context);
        str = layout.replace(/\$screen_placeholder/, str);

      }

      return Iconv.encode(str, 'gbk');
    } catch(e) {
      throw e;
    }
  },

  layout: function(context){

    var file      = this.get('file');
    var basePath  = this.get('basePath');
    var layout    = basePath + '/layout/' + path.dirname(file) + 'default.vm';

    var vm = Iconv.decode(fs.readFileSync(layout), 'gbk');
    vm = PARSE_GLOBAL_MACROS + vm;

    var macros = this.globalMacros;

    return Velocity.render(vm, context, getMacros(macros));

  }

});

module.exports = Webx;
