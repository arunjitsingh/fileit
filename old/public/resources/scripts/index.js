/**
 * @author arunjitsingh
 */
var $APP = $APP || {VERSION:'0.c.2035'};
$APP.applicationRoot = '/';
$APP.resources = {};
$APP.resources['browser'] = 'browser';
$APP.user = {home:'users/arunjitsingh'};

$APP.currentSelection = null;
$APP.currentColumn = null;

$APP.deletion = null;

$APP.getResource = function(res) {
    return $APP.applicationRoot + $APP.resources[res] + '/';
};

$APP.asResource = function(resource,request) {
    if (request && request.match(/^:root$/i)) request='';
    return ($APP.getResource(resource) + request);
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
                //$APP.renderDetails(file);
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
        var elt = ($APP.deletion) ? $APP.deletion : $('.selected').last();
        $APP.currentColumn = elt.first().parents('.column');
        if ($APP.currentColumn.length > 0) {
            var vi = $APP.currentColumn.data().viewIndex;
            $APP.columns.selectColumn(vi);
        }
        elt.remove();
        $APP.deletion = null;
        $APP.currentSelection = $('.selected').last();
        if ($APP.currentSelection.length < 1) {
            $APP.currentSelection = $('#homedata');
        }
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
//          console.log("data: " + JSON.stringify(data));
            var idx = data.viewIndex;
//          FI.log("idx="+idx);
            $APP.columns.selectColumn(idx);
            if (evt.metaKey || evt.ctrlKey) {
                $(elt).removeClass('selected');
                $APP.currentSelection = $('.selected').last();
                if ($('.list .selected').length < 1) {
                    // nothing is selected, refer to #homedata
                    $APP.currentSelection = $('#homedata');
                }
                return true;
            }
            elt.siblings('.selected').removeClass('selected');
            elt.addClass('selected');
            $APP.currentSelection = elt;
            var id = elt.data().id;
            FI.log(elt.data(), 'data');
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
        typeof($)==='undefined'         // jQuery, jquery.js
        || typeof(jQuery)==='undefined' // jQuery, jquery.js
        || typeof($.json)==='undefined' // jQuery REST, jquery.rest.js
        || typeof(Class)==='undefined'  //OO, oo-min.js
        || typeof(FI)==='undefined'     //FI, FileIt.js
        || typeof(DATEJS)==='undefined' //date.js
        || typeof($APP)==='undefined'   //this application
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
    
    $APP.columns.selectColumn(-1);
    var req = $APP.user.home;
    $APP.currentSelection = $('#homedata').data({id:req, isDirectory:true});
    $APP.fetchData(req, $APP.didFetchData);
    
    $('body')[0].style['visibility'] = 'visible';
};
