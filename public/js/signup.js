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
            {id:'zipcode', type:'zipcode', output: 'citystate', hint: 'Enter zip code and select location.'},
            {id:'firstName', optional: true, type:'function', fn: function(val) { return val.length == 0 ? undefined : val.split(' ').length < 3 }, hint: 'Enter your first name to help people find you. (Can only contain one space)'},
            {id:'lastName', optional: true,  type:'function', fn: function(val) { return val.length == 0 ? undefined : val.split(' ').length < 3 }, hint: 'Enter your last name to help people find you. (Can only contain one space)'},
            {id:'pdgaNumber', optional: true, type:'function', fn: function(val) { return val.length == 0 ? undefined : /^[0-9]*$/.test(val) }, max: 6}
        ],
        feedbackOnInit: true
    });
    
    $('#submit').click(function() {
        if (!signUpValidate.doValidate()) {
            var invalidItems = signUpValidate.getInvalidItems();
            if (invalidItems.length) {
				generateInvalidDataError(invalidItems);
            }
            return false;
        }
        
        var locObj = signUpValidate.getValue('zipcode');
        if (!locObj) return false;
        
        var $form = $('<form action="/signup" method="post" id="signup-form">' +
                            '<input type="text" name="email" value="' + $('#email').val() + '">' +
                            '<input type="password" name="password" value="' + $('#password').val() + '">' +
                            '<input type="text" name="username" value="' + $('#username').val() + '">' +
                            '<input type="text" name="locLat" value="' + locObj.locLat + '">' +
                            '<input type="text" name="locLng" value="' + locObj.locLng + '">' +
                            '<input type="text" name="firstName" value="' + $('#firstName').val() + '">' +
                            '<input type="text" name="lastName" value="' + $('#lastName').val() + '">' +
                            '<input type="text" name="pdgaNumber" value="' + $('#pdgaNumber').val() + '">' +
                        '</form>');
        
        $form.submit();
    });
    
});