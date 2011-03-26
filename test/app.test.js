
// Run $ expresso

/**
 * Module dependencies.
 */

var app = require('../app')
  , assert = require('assert');


module.exports = {
  // 'GET /': function(){
  //   assert.response(app,
  //     { url: '/' },
  //     { status: 302, headers: { 'Location': '/index.html' }},
  //     function(res){
  //       assert.includes(res.body, 'Moved');
  //     });
  // }
  
  'GET /browse/users/arunjitsingh': function() {
      assert.response(app,
          {url: '/browse/users/arunjitsingh'},
          {status: 200, headers:{"Content-Type": "application/json"}},
          function(res) {
              
          }
      );
  }
};