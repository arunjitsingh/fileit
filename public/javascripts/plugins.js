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
    
})(jQuery);