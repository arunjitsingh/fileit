(function() {
  var File, fs, infoFromStat;
  fs = require("fs");
  File = {};
  File.ROOT = '/';
  File.INFO_FIELDS = ["size", "atime", "ctime", "mtime"];
  infoFromStat = function(stat, full) {
    var e, ret, _i, _len, _ref;
    ret = {};
    if (!full) {
      _ref = File.INFO_FIELDS;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        e = _ref[_i];
        ret[e] = stat[e];
      }
    } else {
      ret = stat;
    }
    ret['isDirectory'] = stat.isDirectory();
    ret['type'] = ret.isDirectory ? 'DIR' : 'FILE';
    return ret;
  };
  File.infoSync = function(file) {
    var files, ret, root, stat;
    root = fs.realpathSync(file);
    stat = fs.statSync(file);
    ret = infoFromStat(stat);
    if (stat.isDirectory()) {
      files = fs.readdirSync(file);
      files = files.map(function(f) {
        var o, s, x;
        x = "" + root + "/" + f;
        s = fs.statSync(x);
        o = infoFromStat(s);
        o['id'] = x.split(File.ROOT)[1];
        return o;
      });
      ret.children = files;
    }
    ret['id'] = file;
    return ret;
  };
  File.info = function(file, callback) {
    return fs.realpath(file, function(err, root) {
      if (err) {
        callback(err, null);
        return;
      }
      return fs.stat(root, function(err, stat) {
        var ret;
        if (err) {
          callback(err, null);
          return;
        }
        ret = infoFromStat(stat);
        if (stat.isDirectory()) {
          return fs.readdir(root, function(err, files) {
            if (err) {
              callback(err, null);
              return;
            }
            files = files.map(function(f) {
              var o, s, x;
              x = "" + root + "/" + f;
              s = fs.statSync(x);
              o = infoFromStat(s);
              o['id'] = f;
              return o;
            });
            ret.children = files;
            return callback(null, ret);
          });
        } else {
          return callback(null, ret);
        }
      });
    });
  };
  module.exports.File = File;
}).call(this);
