f = require('../browser').File
json = JSON.stringify

#console.log(json(f.infoSync('../testroot')))
#console.log(json(f.infoSync('../testroot/test.txt')))
#console.log(json(f.infoSync('/Volumes/OLFS/root/users/arunjitsingh')))
handler = (err, info) ->
    if err
        console.log json({error:err.message})
        return
    console.log json(info)

f.info '../testroot', handler
f.info '../testroot/test.txt', handler
f.info '../testroot/asdf.txt', handler