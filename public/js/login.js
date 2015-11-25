$(document).ready(function(){
    
    if (window.location.hash.length) {
        var hash = window.location.hash;
        var $redirect = $('input[name="redirect"]');
        $redirect.val($redirect.val() + hash);
        window.location.hash = '';
    }
    
    $('#auth-facebook').click(function() {
       $('#facebook-login').submit(); 
    });
    
    var loginValidate = new ZumpValidate({
        items: [
            {id:'login-username', type:'email'},
            {id:'login-password', type: 'text', min: 6}
        ]
    });
    
    $('#login-form').submit(function() {
        if (!loginValidate.doValidate()) {
            return false;
        } 
    });
    
});