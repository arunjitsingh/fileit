// `file/info.js`. Dependencies
var fs = require('fs');
var path = require('path');
var mime = require('mime');

var FF = require('./filter');

// Keys used for stat'ing a path
var INFO_KEYS = ["size", "atime", "ctime", "mtime"];
// Parsing stat to usable properties. if `full` is truthy,
// all keys in `stat` will be used.
var parseStat = function(stat, full) {
    var ret = {};
    var keys = INFO_KEYS;
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
// Returns a mime type for a file based on extension.
// If file has no extension, it returns `null`.
var mimeForFile = function(abspath) {
    var ext = path.extname(abspath);
    if (ext !== '') {
        return mime.lookup(ext);
    } else {
        return null;
    }
};

// FileInformation constructor. Checks for incorrect invokation
// (i.e., without `new` keyword). Options must be specified and
// may be `{}`. `options.root` is not necessary, but is strongly
// recommended. `options.filter` is optional. If not specified,
// it will use the default filter defined in [filter.js](./filter.html)
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
    
    // Generate a URI for a path relative to root
    self.uriFromPath = function(abspath) {
        return abspath.replace(path.join(self.root(), '/'), "");
    };
    
    self.root = function() {
        return root;
    };
    self.filter = function() {
        return filter;
    };
    // Path verification. This can be through a required option,
    // say `option.auth` or something. This `auth` is created
    // per request, maybe based on some session info.
    /*
    self.canRetrieve = function(abspath) {
        
    }
    */
};
// Synchronous FileInformation#info.
// The `callback` is optional. If it is not provided,
// the method *returns* an object containing file
// information
FileInformation.prototype.infoSync = function(uri, callback) {
    
    var cb = (typeof callback === 'function');
    
    var self = this;
    var filepath = path.join(self.root(), uri);
    // `filepath` access verification takes place here...
    /*  if (!self.canRetrieve(filepath)) //error */
    
    if (!path.existsSync(filepath)) {
        cb && callback({status:404, error:"Not Found", where:uri}, null);
        return null;
    }
    
    var stat = fs.statSync(filepath);
    
    var fileinfo = parseStat(stat);
    fileinfo['id'] = uri;
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
    cb && callback(null, fileinfo);
    return fileinfo;
};
// Asynchronous FileInformation#info.
// The `callback` is required. This method makes
// use of only asynchronous methods from `fs`
FileInformation.prototype.info = function(uri, callback) {
    // Callback pattern: `callback(err, fileInfo)`
    if (typeof callback !== 'function') {
        throw new TypeError("FileInformation#info: callback needs to be a function");
    }
    
    var self = this;
    var filepath = path.join(self.root(), uri);
    // `filepath` access verification takes place here...
    /*  if (!self.canRetrieve(filepath)) //error */
    
    // Check if path exists. Use HTTP code 404 for error
    path.exists(filepath, function(exists) {
        if (!exists) {
            callback({status:404, error:"Not Found", where:uri}, null);
            return;
        }
        // Stat the (file)path. Use HTTP codes 5xx for errors.
        // TODO: find a more apt error code, something like:
        // "Resource not available at this time"
        fs.stat(filepath, function(err, stat) {
            if (err) {
                callback({status:503, error:"Resource not available",
                    detail:err, where:uri}, null);
                return;
            }
            var fileinfo = parseStat(stat);
            fileinfo['id'] = uri;
            if (stat.isDirectory()) {
                fileinfo.children = [];
                // Read contents of a directory.
                fs.readdir(filepath, function(err, files) {
                    if (err) {
                        callback({status:503, error:"Resource not available",
                            detail:err, where:uri}, null);
                        return;
                    }
                    // Directory contents are also stat'ed for more info.
                    // This may change in the future.
                    var len = files.length,
                        i;
                    for (i = 0; i < len; ++i) {
                        (function(i) {
                            var file = files[i];
                            if (!self.filter().allowed(file)) {
                                fileinfo.children.push(null);
                                return;
                            }
                            var fp = path.join(filepath, file);
                            fs.stat(fp, function(err, st) {
                                if (err) {
                                    callback({status:503, error:"Resource not available",
                                        detail:err, where:path.join(uri, file)}, null);
                                    return;
                                }
                                var fi = parseStat(st);
                                fi['id'] = self.uriFromPath(fp);
                                if (!fi.isDirectory) {
                                    fi['type'] = mimeForFile(fp) || 'FILE';
                                }
                                fileinfo.children.push(fi);
                                
                                // Only when all `files` have called-back, send the
                                // `fileinfo` via `callback`. But first, clean the
                                // array of all `null` values and call the callback
                                if (fileinfo.children.length === len) {
                                    fileinfo.children = fileinfo.children.filter(function(e) {
                                        return e;
                                    });
                                    callback(null, fileinfo);
                                }
                            });
                        })(i);
                    }
                });
            } else {
                // Not a directory, set mime and callback
                fileinfo['type'] = mimeForFile(filepath) || 'FILE';
                callback(null, fileinfo);
            }
        });
        
    });
};
// Export the constructor as the only product of this module.
module.exports = FileInformation;