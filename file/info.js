var fs = require('fs');
var path = require('path');
var mime = require('mime');

var FF = require('./filter');

var INFO_FIELDS = ["size", "atime", "ctime", "mtime"];
var parseStat = function(stat, full) {
    var ret = {};
    var keys = INFO_FIELDS;
    if (full) {
        keys = Object.keys(stat);
    }
    keys.forEach(function(e) {
        ret[e] = stat[e];
    });
    ret['isDirectory'] = stat.isDirectory();
    ret['type'] = ret.isDirectory ? 'DIR' : "";
    return ret;
};

var uriFromPath = function(abspath) {
    return abspath.replace(this.root(), "");
};

var mimeForFile = function(abspath) {
    var ext = path.extname(abspath);
    if (ext !== '') {
        return mime.lookup(ext);
    } else {
        return null;
    }
};

var DEFAULT_ROOT = '/';
var FileInformation = function(options) {
    if (!(this instanceof FileInformation)) {
        return new FileInformation(options);
    }
    if (!options) {
        throw new TypeError("First argument of FileInformation must be object or string");
    }
    
    var self = this;
    
    var root = (typeof options === 'object')
                ? options.root || DEFAULT_ROOT
                : (typeof options === 'string')
                    ? options
                    : DEFAULT_ROOT;
    var filter = (typeof options === 'object')
                ? options.filter || FF.defaultFilter()
                : FF.defaultFilter();

    self.root = function() {
        return root;
    };
    self.filter = function() {
        return filter;
    };
};
FileInformation.prototype.infoSync = function(uri, callback) {
    // callback(err, data)
    if (typeof callback !== 'function') {
        throw new TypeError("FileInformation#info: callback needs to be a function");
    }
    var self = this;
    var filepath = path.join(self.root(), uri);
    if (!path.existsSync(filepath)) {
        callback({status:404, error:"Not Found"}, null);
        return;
    }
    
    var stat = fs.statSync(filepath);
    
    var fileinfo = parseStat(stat);
    
    if (stat.isDirectory()) {
        var files = fs.readdirSync(filepath);
        files = files.map(function(file) {
            if (!self.filter().allowed(file)) {
                return null;
            }
            var fp = path.join(filepath, file);
            var s  = fs.statSync(fp);
            var fi = parseStat(s);
            fi['id'] = path.join(uri, file);
            if (!fi.isDirectory) {
                fi['type'] = mimeForFile(fp) || 'FILE';
            }
            return fi;
        });
        files = files.filter(function(e) {return e;});
        fileinfo['children'] = files;
    } else {
        fileinfo['type'] = mimeForFile(filepath) || 'FILE';
    }
    fileinfo['id'] = uri;
    callback(null, fileinfo);
};

module.exports = FileInformation;