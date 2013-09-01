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

      var fullfile = maps[file] ? baseDir + maps[file] : baseDir + 'control/' + file;

      var extname = path.extname(fullfile)

      if (!extname) {
        fullfile += '.vm'
      }

      if (fs.existsSync(fullfile)) {
        this.fullfile = fullfile;
      } 

      return this;

    },
    toString: function(){
      return this.eval(Iconv.decode(fs.readFileSync(this.fullfile), 'gbk'), this.__temp);
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
    stringEscapeUtil: {
      unescapeJava: function(str){
        return str
      }
    },
    reset : function(){
      page.styleSheets = [];
    }
  }

};
