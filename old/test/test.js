(function() {
  var f, handler, json;
  f = require('../browser').File;
  json = JSON.stringify;
  handler = function(err, info) {
    if (err) {
      console.log(json({
        error: err.message
      }));
      return;
    }
    return console.log(json(info));
  };
  f.info('../testroot', handler);
  f.info('../testroot/test.txt', handler);
  f.info('../testroot/asdf.txt', handler);
}).call(this);
