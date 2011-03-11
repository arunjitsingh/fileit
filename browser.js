/*
needs:
filesystem access and info.
*/

var fs = require("fs");

var File = {};
File.DETAILED_INFO = ["size", "atime", "ctime", "mtime"];

var infoFromStat = function(stat, full) {
    if (full) return stat;
    var ret = {};
    File.DETAILED_INFO.forEach(function(e) {
        ret[e] = stat[e];
    });
    return ret;
};
File.infoFor = function(file) {
    var ret = {contents:[], info:{}};
    var stat = fs.statSync(file);
    if (stat.isDirectory()) {
        var files = fs.readdirSync(file);
        ret.contents = files;
        ret.info = infoFromStat(stat);
    } else {
        ret.info = infoFromStat(stat);
    }
    return ret;
};

module.exports.File = File;