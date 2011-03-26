var log = require('logging');
var FI = require('../file/info');
var fi = new FI({root:'/Volumes/OLFS/root'});
fi.info('users/arunjitsingh', function(err, info) {
    if (err) log(err);
    else log(info);
});
