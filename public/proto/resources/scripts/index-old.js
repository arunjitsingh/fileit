/**
 * @author arunjitsingh
 */
var $APP = $APP || {};
$APP.applicationRoot = '/OnlineFileBrowser';
$APP.resources = {};
$APP.resources['browser'] = '/browser';
$APP.resources['data-transfer'] = '/data-transfer';
$APP.resources['auth'] = '/auth';

$APP.ListItemTemplate = {
		VIEW: {
			':root': {			
				'content': {
					'key': 'id',
					'type': 'text',
					transformedValue: function(value) {
						return value.substring(value.lastIndexOf('/')+1);
					}
				},
				'class': {
					'key': 'isDirectory',
					transformedValue: function(value) {
						return value?"DIR":"FILE";
					}
				}
			}
		},
		ACTION: {
			click: function(evt) {
				var elt = evt.target;
				if (evt.metaKey || evt.ctrlKey) {
					$(elt).removeClass('selected');
					return true;
				}
				$(elt.parentNode).children().removeClass('selected');
				$(elt).addClass('selected');
				alert($(evt.target).data().id);
				console.log(evt);
			}
		}
	};

$APP.user = {};

$APP.getResource = function(res) {
	return $APP.applicationRoot + $APP.resources[res] + '/';
};

var loadApplication = function() {
	$.getJSON($APP.getResource('auth'), function(data) {
	    if (data && data.status) {
	    	var info = "";
		    if (typeof(data.content) === 'object'){
			    info = JSON.stringify(data.content);
		    } else {
		    	info = data.content;
		    }
	    	window.sessionStorage['user'] = (data.content);
	    	$APP.user = JSON.parse(sessionStorage['user']);
	    	if (location.hash != '') {
	    		var resource = $APP.getResource('browser') + window.location.hash.substring(1);
	    	    $.getJSON(resource, function(data) {
	    	        console.log("GET:");
	    	        console.log(data);
	    	    });
	    	}
	    }
	});
	
	$('#GET_btn').click(function(){
	    var resource = $APP.getResource('browser') + $('#resource').val();
	    $.getJSON(resource, function(data) {
	        console.log("GET:");
	        console.log(data);
	    });
	});
	$('#POST_btn').click(function(){
        var resource = $APP.getResource('browser') + $('#resource').val();
        $.post(resource, function(data) {
            console.log("POST:");
            console.log(data);
        });
    });
	$('#DELETE_btn').click(function() {
		var resource = $APP.getResource('browser') + $('#resource').val();
		$.ajax({
			url: resource,
			type: 'DELETE',
			dataType: 'json',
			success: function(data) {
				console.log("DELETE:");
				console.log(data);
			}
		});
	});
	$('#DL_btn').click(function(){
        var resource = $APP.getResource('data-transfer') + $('#resource').val() + "?do=download";
        var iframe = document.createElement("iframe");
        iframe.src = resource;
        iframe = $(iframe);
        iframe.css({position:'absolute', left:-10000, top:-10000, display:'hidden'});
        $('#dlsection').append(iframe);
    });
};