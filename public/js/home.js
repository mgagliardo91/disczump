var $dzNav;
var $dzLogo;
var popValue;
var stepValue;

var emailValidate;

$(document).ready(function(){
    
    $dzNav = $('.dz-nav');
    $dzLogo = $('#dz-nav-logo')
    popValue = $('#section-disczump').offset().top - 50.0;
    stepValue = 1.0 / (popValue);
    
    $('#inventory-carousel').carousel({
        interval: 8000
    });
    
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
    
    $('#submit-email').submit(function(e) {
       if (!emailValidate.isAllValid()) {
           return false;
       } 
    });
    
    var emailValidate = new ZumpValidate({
        items: [
            {id:'email', type:'email'},
        ]
    });
        
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
