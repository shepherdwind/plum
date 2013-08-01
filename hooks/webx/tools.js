var path = require('path');
var fs   = require('fs');
var Iconv = require('iconv-lite');
var spawn = require('child_process').spawn;
var phpCmd = 'php';
var utils  = require('../../lib/utils');
var TMS_PATH = path.join(__dirname, '../php/tms/tms.php');

function tmsVM(file){

  var htmFile = file.replace(/.php$/, '.htm');

  if (fs.existsSync(htmFile)) {
    var size = fs.statSync(htmFile).size;
    if (size > 0) return;
  }

  var cmd = spawn(phpCmd, [TMS_PATH, file]);
  var ret = [];
  cmd.stdout.on('data', function cmdSuccess(data){
    ret.push(data);
  });

  cmd.stderr.on('data', function cmdError(err){
    ret.push(err)
  });

  cmd.on('exit', function cmdEnd(){
    var str = '';
    ret.forEach(function(buf){
      str += Iconv.decode(buf, 'gbk');
    });

    fs.writeFileSync(file.replace(/.php$/, '.htm'), str);
  });
}

module.exports = function(baseDir, maps){

  if (!fs.existsSync(baseDir)){
    return {};
  }


  var tmsTool = {
    importRgn: function(file){

      var file = maps[file];

      if (file) {

        file = path.join(baseDir, file);
        var isTms = false;

        if (path.extname(file) === ".php"){
          tmsVM(file);
          file = file.replace(/.php$/, '.htm');
          isTms = true;
        }

        if (!fs.existsSync(file)) return '';

        var ret = fs.readFileSync(file);
        if (isTms) return ret;

        return isTms? ret: Iconv.decode(ret, 'gbk');
      }
    }
  };

  var control = {

    setTemplate: function(file){

      fullfile = maps[file] ? baseDir + maps[file] : baseDir + 'control/' + file;

      var $sys = this.$sys;

      if ($sys.others.length) {

        //reset
        this.__temp = {};
        var ast = utils.mixin($sys.total, {});
        ast.path = $sys.others;
        $sys.vm.getReferences(ast);

      }

      var ret;
      if (fs.existsSync(fullfile)) {
        ret = {};
        ret.$return = this.eval(Iconv.decode(fs.readFileSync(fullfile), 'gbk'), this.__temp);
        ret.$stop = true;
      } 

      return ret;

    },
    __temp: {},
    setParameter: function(key, value){
      this.__temp[key] = value;
      return this;
    }
  };

  var page = {
    styleSheets: [],
    addStyle: function(str){
      page.styleSheets.push({Url: str});
      return '';
    }
  };

  return {
    control: control,
    tmsTool: tmsTool,
    page: page,
    reset : function(){
      page.styleSheets = [];
    }
  }

};
