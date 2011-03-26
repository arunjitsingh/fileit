var FI = require('../file/info');
var fi = new FI({root:'/Volumes/OLFS/root'});
fi.infoSync('users/arunjitsingh', function(err, info) {
    console.log(JSON.stringify(info));
});
