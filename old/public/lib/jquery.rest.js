
// jQuery - Rest - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed) 

;(function($){
  
  // --- Version
  
  $.rest = $.json = { version : '1.1.0' };
  
  $.json.post = $.create = function(uri, data, callback) {
    return $.post(uri, data, callback, 'json');
  }
  
  $.json.get = $.read = function(uri, data, callback) {
    return $.getJSON(uri, data, callback);
  }

  $.json.put = $.update = function(uri, data, callback) {
    if ($.isFunction(data)) callback = data, data = {};
    return $.post(uri, $.extend(data, { _method: 'put' }), callback, 'json');
  }
  
  $.json.del = $.del = $.destroy = function(uri, data, callback) {
    if ($.isFunction(data)) callback = data, data = {};
    return $.post(uri, $.extend(data, { _method: 'delete' }), callback, 'json');
  }
  
})(jQuery);