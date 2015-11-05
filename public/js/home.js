var $dzNav;
var $dzLogo;
var $footer;
var $beta;
var popValue;
var stepValue;
var cycle = true;

var emailValidate;

$(document).ready(function(){
    
    $dzNav = $('.dz-nav');
    $dzLogo = $('#dz-nav-logo');
    $footer = $('#section-footer');
    $beta = $('#section-beta');
    popValue = $('#section-disczump').offset().top - 50.0;
    stepValue = 1.0 / (popValue);
    
    $.stellar({
        responsive: true,
    });
    
    $(window).scroll(function() {
        doScroll();
    });
    
    $('.scroll-icon i').click(function(e) {
        $('html, body').animate({ scrollTop: popValue + "px" }, 1000);
    });
    
    $(window).resize(function() {
        doResize();
    });
    
    $('.feature-item').mouseenter(function() {
        $(this).find('.feature-hover').stop().animate({
            height: '70px'
        }, 100);
        $(this).find('.feature-label').stop().animate({
            'line-height': '30px',
            'font-size': '60%'
        }, 100);
    }).mouseleave(function() {
        $(this).find('.feature-hover').stop().animate({
            height: '0px'
        }, 100);
        $(this).find('.feature-label').stop().animate({
            'line-height': '100px',
            'font-size': '100%'
        }, 100);
    });
    
    $('#submit-email').submit(function(e) {
       if (!emailValidate.doValidate()) {
           return false;
       } 
    });
    
    var emailValidate = new ZumpValidate({
        items: [
            {id:'email', type:'email'},
        ]
    });
    
    doResize();
        
});

function doResize() {
    popValue = $('#section-disczump').offset().top - 50.0;
    stepValue = 1.0 / (popValue);
    doScroll();
    $('.fscreen').each(function() {
        $(this).css({
            width: $(window).width(),
            'min-height':$(window).height() - $dzNav.outerHeight(),
            'height':$(window).height() - $dzNav.outerHeight(),
        });
    });
    
    $('.fitp').each(function() {
        var $parent = $(this).parent();
        $(this).css({
            height: $parent.height()
        });
    });
    
    $beta.css({
        height: $(window).height() - $footer.outerHeight() - $dzNav.outerHeight()
    });
    
    $('#disc-image-1').css({
        'background-size': $(window).height() > $(window).width() ? 'auto 100%'  :'100% auto' 
    });
}

function doScroll() {
    var offset = $(window).scrollTop();
        
    $('.scroll-icon i').css({
        '-webkit-transform': 'rotate(' + Math.min(180, offset) + 'deg)'
    });
    
    if (offset < popValue) {
        $dzNav.css( 'background-color','rgba(74,74,74,' + stepValue * offset + ')');
        $dzLogo.css('opacity', stepValue * offset);
    } else {
        $dzNav.css( 'background-color','rgba(74,74,74,1)');
        $dzLogo.css('opacity', '1');
    }
}
