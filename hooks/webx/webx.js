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

    try {

      var tools = require(basePath + toolsPath);
      this.tools = defaultTools(basePath, compoment['common-file-maps']);

      for(var i in this.tools)
        tools[i] = this.tools[i];

      this.tools = tools;

    } catch(e) {
      this.tools = {};
    }

  },

  initGlobalMacros: function(){

    var compoment = this.get('compoment');
    var macros    = compoment['global-macros'];
    var basePath  = this.get('basePath');

    var macrosStr = '';
    if (utils.isArray(macros) && macros.length) {
      macros.forEach(function(file){
        macrosStr += Iconv.decode(fs.readFileSync(basePath + file), 'gbk');
      });

      var isJsonify = this.get('isJsonify');
      this.globalMacros = isJsonify? macrosStr: Velocity.Parser.parse(macrosStr);
    } else {
      this.globalMacros = isJsonify? macrosStr: [];
    }

  },

  getContext: function(file){

    var basePath = this.get('basePath');
    var compoment = this.get('compoment');
    var jsonDataDir = basePath + compoment['json-data-dir'];

    file = jsonDataDir + '/' + file;
    var json = file.replace('.js', '.json');

    var context = {};
    var local = this._getLocalJSON();

    utils.mixin(context, local);

    if (fs.existsSync(file)) {
      context = require(file);
    }

    if (fs.existsSync(json)) {
      var buf = fs.readFileSync(json);
      context = utils.mixin(context, JSON.parse(buf.toString()));
    }

    return context;
  },

  _getLocalJSON: function(){

    var ret = {};
    var jsonPath = this.get('filePath').replace(/\.vm$/, '.json');

    if (fs.existsSync(jsonPath)) {
      ret = JSON.parse(Iconv.decode(fs.readFileSync(jsonPath), 'gbk'));
    }

    return ret;
  },

  parse: function(){

    var filePath = this.get('filePath');
    var vm = Iconv.decode(fs.readFileSync(filePath), 'gbk');
    var str = '';
    var isParse = this.get('isParse');
    var isJsonify = this.get('isJsonify');
    var file = this.get('file').replace('.htm', '.js');
    var context = this.getContext(file);
    var basePath = this.get('basePath');

    try {

      var html = Velocity.Parser.parse(vm);

      if (isParse) {

        str = JSON.stringify(html, false, 2);

      } else if (isJsonify) {

        str = this.jsonify(vm);

      } else {

        for(var i in this.tools)
          context[i] = this.tools[i];
        //context = utils.mixin(context, this.tools);

        var macros = this.globalMacros;
        var vmrun = new Velocity.Compile(html, getMacros(macros));
        str = vmrun.render(context);

        var layout = this.layout(vmrun.context);
        str = layout.replace(/\$screen_placeholder/, str);
        this.tools.reset();

      }

      return Iconv.encode(str, 'gbk');
    } catch(e) {
      throw e;
    }
  },

  jsonify: function(vm){

    var vmLayout = this._getLayoutString();
    vm = vmLayout.replace(/\$screen_placeholder/, vm);
    vm = this.globalMacros + vm;

    var context = {
      control: this.tools.control
    };

    var asts = Velocity.Parser.parse(vm);
    var jsonify = new Velocity.Jsonify(asts, context);
    return (jsonify.toVTL());

  },

  _getLayoutString: function(){

    var file      = this.get('file');
    var basePath  = this.get('basePath');
    var dir = path.dirname(file);
    var basename = path.basename(file, '.htm');
    var layout, getLayout;

    while(!getLayout) {

      var layout = basePath + 'layout' + dir + '/' + basename + '.vm';
      getLayout = fs.existsSync(layout);

      if (!getLayout) {
        layout = basePath + 'layout' + dir + '/default.vm';
        getLayout = fs.existsSync(layout);
      }

      if (dir == '/') {
        getLayout = true;
      } else {
        dir = path.join(dir, '../');
      }
    }

    var vm = Iconv.decode(fs.readFileSync(layout), 'gbk');
    vm = PARSE_GLOBAL_MACROS + vm;

    return vm;

  },

  layout: function(context){

    var vm = this._getLayoutString();
    var macros = this.globalMacros;

    return Velocity.render(vm, context, getMacros(macros));

  }

});

module.exports = Webx;
