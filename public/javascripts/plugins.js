(function($) {
    
    $.fn.absoluteCenter = function() {
        return this.each(function() {
            var elt = $(this);
            var w = elt.width(),
                h = elt.height();
            elt.css({
                position: 'absolute',
                top: '50%',
                left: '50%',
                'margin-top': '-'+(h/2)+'px',
                'margin-left': '-'+(w/2)+'px'
            });
        });        
    };
    
    $._enable = $.enable;
    $.fn._enable = $.fn.enable;
    
    $.fn.enable = function() {
        return this.each(function() {
            $(this).removeClass('disabled');
            $(this)._enable(true);
        });
    };
    $.enable = function(sel) {
        return $(sel).enable();
    };
    
    $.fn.disable = function() {
        return this.each(function() {
            $(this).addClass('disabled');
            $(this)._enable(false);
        });
    };
    $.disable = function(sel) {
        return $(sel).disable();
    };
    
})(jQuery);