var formPreprocessing = function() {    
	// To detect native support for the HTML5 placeholder attribute
    var fakeInput = document.createElement("input"),
        placeHolderSupport = ("placeholder" in fakeInput);

    // Applies placeholder attribute behavior in web browsers that don't support it
    if (!placeHolderSupport) {
    	$.each($("#username, #password"), function() {
    		var elt = $(this);
    		var originalText = elt.attr("placeholder");

    		elt.val(originalText);
    		elt.addClass("placeholder");
    		elt.bind("focus", function () {
    			elt.removeClass("placeholder");
    			if (elt.val() === originalText) {
    				elt.val("");
    			}
    		});

    		elt.bind("blur", function () {
    			if (elt.val().length === 0) {
    				elt.val(originalText);
    				elt.addClass("placeholder");
    			}
    		});            	
    	});
    }	
	
	var testSubmit = function(event) {
        var t = $(event.target);
        if (event.keyCode == 13) {
            var success = false;
            $.each($('#username, #password'), function() {
                var elt = $(this);
            	if (elt.val() == '') {
                    elt.addClass('invalid');
                    success = false;
                    if (t.val() == '') {t.focus();}else {elt.focus();}
                } else {
                    elt.removeClass('invalid');
                    success = true;
                }
            }); 
            if (success) {
                $('#login_form').submit();
            }
        } else {
            if (t.val() != '') {t.removeClass('invalid');}
        }
    };
    
    $('#login_form input').bind('keypress', testSubmit);

    console.log("Finished Form Preprocessing");
};

var blurred = function() {
    elt = $(this);
    if (elt.val() != '') {
        elt.addClass('full').removeClass('invalid');
    } else {
        elt.addClass('invalid').removeClass('full');
    }
};

var invalidateForm = function() {
    $("#login_form input").addClass('invalid');
};

var loginLoaded = function() {
    formPreprocessing();
    $('#username, #password').bind('blur', blurred);
    $('#login_footer a').click(function(){alert('No requests accepted yet');});
    console.log("Finished Loading");
};