fs = require("fs")

File = {}
File.ROOT = '/'
File.INFO_FIELDS = ["size", "atime", "ctime", "mtime"]

infoFromStat = (stat, full) ->
    ret = {}
    if not full
        ret[e] = stat[e] for e in File.INFO_FIELDS
    else
        ret = stat
    ret['isDirectory'] = stat.isDirectory()
    ret['type'] = if ret.isDirectory then 'DIR' else 'FILE'
    return ret

File.infoSync = (file) ->
    root = fs.realpathSync(file)
    stat = fs.statSync(file)
    ret = infoFromStat(stat)
    if stat.isDirectory()
        files = fs.readdirSync(file)
        files = files.map (f)->
            x = "#{root}/#{f}"
            s = fs.statSync(x)
            o = infoFromStat(s)
            o['id'] = x.split(File.ROOT)[1];
            return o
        ret.children = files
    ret['id'] = file
    return ret

File.info = (file, callback) ->
    fs.realpath file, (err, root) ->
        if err
            callback(err, null)
            return
        fs.stat root, (err, stat) ->
            if err
                callback(err, null)
                return
            ret = infoFromStat(stat)
            if stat.isDirectory()
                fs.readdir root, (err, files) ->
                    if err
                        callback(err, null)
                        return
                    files = files.map (f)->
                        x = "#{root}/#{f}"
                        s = fs.statSync(x)
                        o = infoFromStat(s)
                        o['id'] = f;
                        return o
                    ret.children = files
                    callback(null, ret)
            else
                callback(null, ret)

module.exports.File = File