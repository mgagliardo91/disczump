$(document).ready(function(){
    
    if (window.location.hash.length) {
        var hash = window.location.hash;
        var $redirect = $('input[name="redirect"]');
        $redirect.val($redirect.val() + hash);
        window.location.hash = '';
    }
       
    var signUpValidate = new ZumpValidate({
        items: [
            {id:'email', type:'email', hint: 'This will be how you log in to your inventory.'},
            {id:'password', type: 'text', min: 6, hint: 'Password must be at least 6 characters in length.'},
            {id:'verify-password', type:'compare', refId:'password'},
            {id:'username', type:'username', output: 'username-feedback', min: 6, max: 15, hint: 'Username must be 6-15 characters and can only consist of letters, numbers, and underscore.'},
            {id:'zipCode', type:'zipcode', output: 'citystate'},
            {id:'firstName', optional: true, type:'function', fn: function(val) { return val.length == 0 ? undefined : !/\s/.test(val) }, hint: 'Enter your first name to help people find you. (Cannot contain spaces)'},
            {id:'lastName', optional: true,  type:'function', fn: function(val) { return val.length == 0 ? undefined : !/\s/.test(val) }, hint: 'Enter your last name to help people find you. (Cannot contain spaces)'},
            {id:'pdgaNumber', optional: true, type:'function', fn: function(val) { return val.length == 0 ? undefined : /^[0-9]*$/.test(val) }, max: 6}
        ],
        feedbackOnInit: true
    });
    
    $('#signup-form').submit(function() {
        if (!signUpValidate.isAllValid()) {
            return false;
        } 
    });
    
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
        if (!loginValidate.isAllValid()) {
            return false;
        } 
    });
    
});


function convertHash(hash) {
    return "~" + hash.substring(1);
}