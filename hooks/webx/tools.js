var path = require('path');
var fs   = require('fs');
var Iconv = require('iconv-lite');

module.exports = function(baseDir, maps){

  if (!fs.existsSync(baseDir)){
    return {};
  }

  var tmsTool = {
    importRgn: function(file){
      var file = maps[file];
      if (file) {
        file = baseDir + file;
        return Iconv.decode(fs.readFileSync(file), 'gbk');
      }
    }
  };

  var control = {
    setTemplate: function(file){
      fullfile = maps[file] ? baseDir + maps[file] : baseDir + 'control/' + file;
      if (fs.existsSync(fullfile)) {
        return this.eval(Iconv.decode(fs.readFileSync(fullfile), 'gbk'));
      } 
    }
  };

  return {
    control: control,
    tmsTool: tmsTool
  }

};
