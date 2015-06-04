var $dzNav;
var $dzLogo;
var popValue;
var stepValue;

$(document).ready(function(){
    
    $dzNav = $('.dz-nav');
    $dzLogo = $('#dz-nav-logo')
    popValue = $('#section-disczump').offset().top - 50.0;
    stepValue = 1.0 / (popValue);
    
    $(window).scroll(function() {
        doScroll();
    });
    
    $('.scroll-icon i').click(function(e) {
        $('html, body').animate({ scrollTop: popValue + "px" }, 1000);
    });
    
    $(window).resize(function() {
        popValue = $('#section-disczump').offset().top - 50.0;
        stepValue = 1.0 / (popValue);
        doScroll();
    });
    
    $('#tutorial').css({
        height: $(document).outerHeight() + 'px'
    });
    
    createOverlay($('#section-disczump').find('.define-main'));
});

function doScroll() {
    var offset = $(window).scrollTop();
        
    $('.scroll-icon i').css({
        '-webkit-transform': 'rotate(' + Math.min(180, offset) + 'deg)'
    });
    
    if (offset < popValue) {
        $dzNav.css( 'background-color','rgba(0,0,0,' + stepValue * offset + ')');
        $dzLogo.css('opacity', stepValue * offset);
    } else {
        $dzNav.css( 'background-color','rgba(0,0,0,1)');
        $dzLogo.css('opacity', '1');
    }
}

function createOverlay($element) {
    var offset = $element.offset();
    var width = $element.outerWidth();
    var height = $element.outerHeight();
    
    var $div = $('<div></div>');
    $div.css({
        position: 'absolute',
        width: width + 'px',
        height: height + 'px',
        top: offset.top,
        left: offset.left
    });
    
    if (offset.top > 0) {
        var $top = $('<div></div>');
        $top.css({
           position: 'absolute',
           width: '100%',
           height: offset.top + 'px',
           top: 0,
           left: 0,
           backgroundColor: 'rgba(128,128,128,0.5)'
        });
        $('#tutorial').append($top);
    }
    
    if (offset.left > 0) {
        var $left = $('<div></div>');
        $left.css({
           position: 'absolute',
           width: offset.left + 'px',
           height: height + 'px',
           top: offset.top,
           left: 0,
           backgroundColor: 'rgba(128,128,128,0.5)'
        });
        $('#tutorial').append($left);
    }
    
    $('#tutorial').append($div);
    
    if(offset.left + width < $(window).width()) {
        var $right = $('<div></div>');
        $right.css({
           position: 'absolute',
           width: $(window).width() - (offset.left + width) + 'px',
           height: height + 'px',
           top: offset.top,
           right: 0,
           backgroundColor: 'rgba(128,128,128,0.5)'
        });
        $('#tutorial').append($right);
    }
    
    console.log($(document).outerHeight() - (offset.top + height));
    
    if (offset.top + height < $(document).outerHeight()) {
        var $bottom = $('<div></div>');
        $bottom.css({
           position: 'absolute',
           width: '100%',
           height: $(document).outerHeight() - (offset.top + height) + 'px',
           bottom: 0,
           left: 0,
           backgroundColor: 'rgba(128,128,128,0.5)'
        });
        $('#tutorial').append($bottom);
    }
    
}