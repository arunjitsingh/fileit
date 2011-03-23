/**
 * @author arunjitsingh
 */
var $APP = $APP || {VERSION:'1.a.2041'};
$APP.applicationRoot = '/OnlineFileBrowser';
$APP.resources = {};
$APP.resources['browser'] = '/browser';
$APP.resources['data-transfer'] = '/data-transfer';
$APP.resources['upload'] = '/upload';
$APP.resources['auth'] = '/auth';
$APP.LOGOUT = "logout.jsp";

$APP.user = {};

$APP.currentSelection = null;
$APP.previousSelection = null;
$APP.currentColumn = null;

$APP.deletionQueue = {
	queue: [],
	add: function(elt) {
		$APP.deletionQueue.queue.push(elt);
	},
	execute: function() {
		$.each($APP.deletionQueue.queue, function(idx,elt) {
			$(elt).remove();
		});
	}
};

$APP.getResource = function(res) {
	return $APP.applicationRoot + $APP.resources[res] + '/';
};

$APP.asResource = function(resource,request) {
	if (request && request.match(/:root/i)) request='';
	return $APP.getResource(resource) + request;
};

$APP.fetchData = function(uri, callback){
	FI.log(uri, "Fetching");
	var resource = $APP.asResource('browser', uri);
	$.read(resource, {}, callback);
};

$APP.didFetchData = function(response) {
	if (response && response.status) {
		if(response.content) {
			var file = response.content;
			if (file.isDirectory) {
				$APP.renderFetchedData(file.children);
			} else {
				$APP.renderDetails(file);
			}			
		}
	}
};

$APP.renderFetchedData = function(content) {
	var list = FI.ListView.createSimpleList({template:$APP.ListItemTemplate});
	list.updateContent(content);
	$APP.columns.newColumn().addSubview(list.view());
	$APP.columns.renderColumns();
};

$APP.renderDetails = function(file) {
	$('#overlay').css({'visibility':'visible'});
	var elt = $('#details').css({'visibility':'visible'});
	elt.data(file);
	FI.View.renderView(elt, {VIEW:$APP.DetailsViewAttributes});
};

$APP.deleteResource = function(uri, callback) {
	FI.log(uri, "Deleting");
	var resource = $APP.asResource('browser', uri);
	//$.destroy(resource, {}, callback);//DOES NOT WORK.. sends POST
	$.ajax({
		url: resource,
		type: 'DELETE',
		dataType: 'json',
		success: callback
	});
};

$APP.didDelete = function(response) {
	if (response.status) {
		$APP.deletionQueue.execute();
		$APP.currentSelection = $APP.previousSelection;
		var vi = ($APP.currentColumn) ? $APP.currentColumn.data().viewIndex : -1;
		$APP.columns.selectColumn(vi);
	}
};

$APP.Transformers = {};
$APP.Transformers.ID = function(value) {
	return value.substring(value.lastIndexOf('/')+1);
};
$APP.Transformers.Date = function(value) {
	var date =  new Date(value);
		str = date.getMonthName() + " " + date.getDate() + " " + date.getFullYear();
	return str;
};
$APP.Transformers.Size = function(value) {
	var units = ['B', 'KB', 'MB', 'GB', 'TB', 'EB'];
	var size = value,
		i;
	for (i=0;;++i) {
		if (size > 1024) size /= 1024;
		else break;
	}
	return Math.round(size)+" "+units[i];
};

$APP.ListItemTemplate = {
	VIEW: {
		':root': {			
			'content': {
				'key': 'id',
				'type': 'text',
				transformedValue: $APP.Transformers.ID
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
			var elt = $(evt.target);
			$APP.currentColumn = elt.parents('.column');
			var data = $APP.currentColumn.data();
//			console.log("data: " + JSON.stringify(data));
			var idx = data.viewIndex;
//			FI.log("idx="+idx);
			$APP.columns.selectColumn(idx);
			if (evt.metaKey || evt.ctrlKey) {
				$(elt).removeClass('selected');
				$APP.currentSelection = $APP.previousSelection;
				if ($('.list .selected').length < 1) {
					// nothing is selected, refer to #homedata
					$APP.currentSelection = $('#homedata');
				}
				return true;
			}
			elt.parent().children().removeClass('selected');
			elt.addClass('selected');
			if ($APP.previousSelection != $APP.currentSelection)
				$APP.previousSelection = $APP.currentSelection;
			$APP.currentSelection = elt;
			var id = elt.data().id;
//			FI.log(elt.data(), 'data');
			$APP.fetchData(id, $APP.didFetchData);
			return true;
		}
	}
};

$APP.DetailsViewAttributes = {
	'.file-name': {'content':{'key':'id', 'type':'text', transformedValue: $APP.Transformers.ID}},
	'.file-size': {'content':{'key':'size', 'type':'text', transformedValue: $APP.Transformers.Size}},
	'.file-date': {'content':{'key':'modifiedAt', 'type':'text', transformedValue: $APP.Transformers.Date}}
};

$APP.columnWidth = 325;

var loadApplication = function() {
	
	if ( /*Dependancies*/
		typeof($)==='undefined'			// jQuery, jquery.js
		|| typeof(jQuery)==='undefined'	// jQuery, jquery.js
		|| typeof($.json)==='undefined' // jQuery REST, jquery.rest.js
		|| typeof(Class)==='undefined' 	//OO, oo-min.js
		|| typeof(FI)==='undefined'		//FI, FileIt.js
		|| typeof(DATEJS)==='undefined' //date.js
		|| typeof($APP)==='undefined'	//this application
		) {
		alert("Application load failed. Try reloading");
		throw new Error("Application load failed");
	}
	
	var left = 0, incr = 25, wdth = 75;
	$('#toolbar .image-button').each(function(idx, elt){
		$(elt).css({'left':(left*wdth+incr)});
		left++;
	});
	
	$APP.columns = new FI.ColumnView('browser', {columnWidth: $APP.columnWidth,
												autoScrollX: false,
												columnCSS: {
													'width':$APP.columnWidth, 
													'height':'inherit'
												}
									});	
	
	$('#toolbar #logout_btn').click(function(evt) {
		if (confirm("Log out for sure?")) {
			window.location.href = $APP.LOGOUT;
		}
	});	
	
	$('#toolbar #home_btn').click(function(evt) {
		$APP.columns.selectColumn(-1);
		var req = $APP.user.home;
		$APP.previousSelection = $APP.currentSelection = $('#homedata').data({id:req, isDirectory:true});
		$APP.fetchData(req, $APP.didFetchData);
	});
	
	$('#toolbar #groups_btn').click(function(evt) {
		$APP.columns.selectColumn(-1);
		var content = $APP.user.groups;
		$APP.renderFetchedData(content);
	});
	
	$('#toolbar #trash_btn').click(function(evt) {
		if ($APP.currentSelection && $('.selected').length > 0) {
			if (!confirm('Deletion cannot be reversed! Continue?'))
				return false;
			var d = $APP.currentSelection.data();
			var id = d.id ? d.id : null;
			if (id) {
				$APP.deleteResource(id, $APP.didDelete);
			}
			$APP.deletionQueue.add($APP.currentSelection);
		}
		return true;
	});
	
	$('#toolbar #create_btn').click(function(evt) {
		if ($APP.currentSelection) {
			//FI.log($APP.currentSelection.data(), "$APP.currentSelection.data()");
			var id = $APP.currentSelection.data().id,
				isD = $APP.currentSelection.data().isDirectory;
			if (id) {
				if (isD !== undefined && isD == false) {
					id = id.substring(0, id.lastIndexOf('/'));
					$APP.currentSelection = $APP.previousSelection;
				}
				$('#overlay').css({'visibility':'visible'});
				var elt = $('#new-dir');
				elt.css({'visibility':'visible'});
				$('.currentSelection', elt).text($APP.Transformers.ID(id)+"/");
				var resource = $APP.asResource('browser', id);
				$('#new-dir-ok').click(function(evt) {
					var newdir = $('#new-dir-name', elt).val();
					if (newdir && newdir !== "") {
						resource += "/" + newdir;
						FI.log(resource, "Creating");
						$.create(resource,{},function(response) {
							FI.log(response, "Creation response");
							// hide everything
							elt.css({'visibility':'hidden'});
							$('#overlay').css({'visibility':'hidden'});
							$('#new-dir-name').val("");
							var vi = ($APP.currentColumn) ? $APP.currentColumn.data().viewIndex-1 : -1;
							$APP.columns.selectColumn(vi);
							$APP.fetchData($APP.currentSelection.data().id, $APP.didFetchData);
						});
					} else {
						$('#new-dir-name')[0].focus();
					}
					return true;
				});
			}
		}
		return true;
	});
	
	$('#toolbar #upload_btn').click(function(evt) {
		if ($APP.currentSelection) {
			//FI.log($APP.currentSelection.data(), "$APP.currentSelection.data()");
			var id = $APP.currentSelection.data().id,
				isD = $APP.currentSelection.data().isDirectory;
			if (id) {
				if (isD !== undefined && isD == false) {
					id = id.substring(0, id.lastIndexOf('/'));
				}
				$('#overlay').css({'visibility':'visible'});
				var elt = $('#upload-file');
				elt.css({'visibility':'visible'});
				$('.currentSelection', elt).text($APP.Transformers.ID(id)+"/");
				var resource = $APP.asResource('upload', id);
				$('#upload-frame', elt).attr('src', ('upload-frame.html#'+resource));
			}
		}
		return true;
	});
	
	$('#file-download').click(function() {
		if($APP.currentSelection) {
			var id = $APP.currentSelection.data().id;
			var resource = $APP.asResource('data-transfer', id) + '?do=download';
			var iframe = document.createElement("iframe");
	        iframe.src = resource;
	        iframe = $(iframe);
	        iframe.css({position:'absolute', left:-10000, top:-10000, display:'hidden'});
	        $('#dlsection').append(iframe);
		}
	});
	
	$('.close.button').click(function() {
		$(this).parent().css({'visibility':'hidden'});
		$(this).parent('#upload-file').children('#upload-frame').attr('src', "");
		$('#overlay').css({'visibility':'hidden'});
	});
	
	$.read($APP.getResource('auth'), {}, function(response) {
	    if (response && response.status) {
	    	var info = "";
		    if (typeof(response.content) === 'object'){
			    info = JSON.stringify(response.content);
		    } else {
		    	info = response.content;
		    }
	    	window.sessionStorage['user'] = (response.content);
	    	$APP.user = JSON.parse(sessionStorage['user']);	    	
	    }
	});
	
	$('body')[0].style['visibility'] = 'visible';
};

window.uploadCompleted = function(success) {
	if (success) {
		var vi = ($APP.currentColumn) ? $APP.currentColumn.data().viewIndex : -1;
		$APP.columns.selectColumn(vi);
		var data = $APP.currentSelection.data(),
			id = data.id;
		$APP.fetchData(id, $APP.didFetchData);
	}
};