// `file/info.js`. Dependencies
var fs = require('fs');
var path = require('path');
var mime = require('mime');
mime.default_type = null;
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

var prepare = function(options) {
    var root = (typeof options === 'object')
                ? options.root || null
                : (typeof options === 'string')
                    ? options
                    : null;
    var filter = (typeof options === 'object')
                ? options.filter || FF.defaultFilter()
                : FF.defaultFilter();
    return {
        root: root,
        filter: filter,
        uriFromPath: function(abspath) {
            return abspath.replace(path.join(root, '/'), "");
        }
    };
};

// Asynchronous file#info.
// The `options` and `callback` are required. `options` can
// either be a string representing absolute base path, or `root`,
// for the uri, or it can be an object containing `root` and
// `filter` (optional) properties. This may be extended in the
// future.
// This method makes use of only asynchronous methods from `fs`
module.exports.info = function(uri, options, callback) {
    // Callback pattern: `callback(err, fileInfo)`
    if (typeof callback !== 'function') {
        throw new TypeError("file#info: callback needs to be a function");
    }
    
    if (!options) {
        throw new TypeError("file#info: options cannot be null/undefined");
    }
    var self = prepare(options);
    if (!self.root) {
        throw new TypeError("file#info: options.root cannot be null");
    }
    
    var filepath = path.join(self.root, uri);
    
    console.log(filepath);
    
    // Check if path exists. Use HTTP code 404 for error
    path.exists(filepath, function(exists) {
        if (!exists) {
            callback({status:404, error:"Not Found", where:uri}, null);
            return;
        }
        // Stat the `filepath`. Use HTTP codes 5xx for errors.
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
                        
                    if (len === 0) {
                        callback(null, fileinfo);
                    }
                    
                    for (i = 0; i < len; ++i) {
                        (function(i) {
                            var file = files[i];
                            if (!self.filter.allowed(file)) {
                                fileinfo.children.push(null);
                                return; // don't continue
                            }
                            var fp = path.join(filepath, file);
                            fs.stat(fp, function(err, st) {
                                if (err) {
                                    callback({status:503, error:"Resource not available",
                                        detail:err, where:path.join(uri, file)}, null);
                                    return;
                                }
                                var fi = {}; //parseStat(st);
                                fi['id'] = path.join(uri, file);
                                if (!st.isDirectory()) {
                                    fi['type'] = mimeForFile(fp) || 'FILE';
                                    fi['isDirectory'] = false;
                                } else {
                                    fi['isDirectory'] = true;
                                }
                                fileinfo.children.push(fi);
                                
                                // Only when all `files` have called-back, send the
                                // `fileinfo` via `callback`. But first, clean the
                                // array of all `null` values and call the callback
                                if (fileinfo.children.length === len) {
                                    fileinfo.children = fileinfo.children.filter(function(e) {
                                        return e; // filters out null values
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

// Synchronous file#info.
// The `options` is required, `callback` is optional and will be
// used if provided. `options` can either be a string representing
// absolute base path, or `root`, for the uri, or it can be an
// object containing `root` and `filter` (optional) properties.
// This method **returns** the file information
// This method may be @deprecated in the future
module.exports.infoSync = function(uri, callback) {
    
    var cb = (typeof callback === 'function');
    
    if (!options) {
        throw new TypeError("file#info: options cannot be null/undefined");
    }
    var self = prepare(options);
    if (!self.root) {
        throw new TypeError("file#info: options.root cannot be null");
    }
    var filepath = path.join(self.root, uri);
    
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
            if (!self.filter.allowed(file)) {
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