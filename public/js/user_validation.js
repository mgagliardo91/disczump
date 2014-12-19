var $verifyPassword;
var $password;
var $submit;
var $username;

var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
var validLen, validPw, validEmail;

$(document).ready(function(){

    $verifyPassword = $('#verify-password');
    $password = $('#password');
    $submit = $('#submit');
    $username = $('#username');

    $password.on('keyup', function(e){
        addValidation($password, function(){
            var len = $password.val().length;
            return (len == 0 ? undefined : len >= 6);
        });
        
        addAccess($verifyPassword, function(){
            return $password.val().length >= 6;
        });
        
        addAccess($submit, function() {
            return $('.has-success').length == $('input').length;
        });
    }).focusout(function(){
        addValidation($password, function(){
            var len = $password.val().length;
            return (len == 0 ? undefined : len >= 6);
        });
        
        addAccess($verifyPassword, function(){
            return $password.val().length >= 6;
        });
        
        addAccess($submit, function() {
            return $('.has-success').length == $('input').length;
        });
     });
    
    $username.focusin(function() {
        addValidation($username, validateEmail);
    }).on('keyup',function(e) {
        addValidation($username, validateEmail);
        
        addAccess($submit, function() {
            return $('.has-success').length == $('input').length;
        });
     }).focusout(function(){
        addValidation($username, validateEmail);
        
        addAccess($submit, function() {
            return $('.has-success').length == $('input').length;
        });
     });

     $verifyPassword.focusin(function(){
        addValidation($verifyPassword, validatePassword);
     }).on('keyup',function(e) {
     	addValidation($verifyPassword, validatePassword);
     	
     	addAccess($submit, function() {
            return $('.has-success').length == $('input').length;
        });
     }).focusout(function(){
     	addValidation($verifyPassword, validatePassword);
     	
        addAccess($submit, function() {
            return $('.has-success').length == $('input').length;
        });
     });
});

function validatePassword(){
    return ($password.val().length == 0 && $verifyPassword.val().length == 0) ?
        undefined : ($password.val() == $verifyPassword.val());
}

function validateEmail(){
    return ($username.val().length == 0 ? undefined : regex.test($username.val()));
}

function toggleButton() {
    if (validEmail && validPw) {
        $submit.removettr('disabled');
    } else {
        $submit.attr('disabled', 'disabled');
    }
}

function addValidation($input, fn) {
    var valid = fn();
    if (valid != undefined) {
        $input.parent().removeClass((valid ? 'has-error' : 'has-success'))
            .addClass((valid ? 'has-success' : 'has-error'));
    } else {
        $input.parent().removeClass('has-success').removeClass('has-error');
    }
}

function addAccess($input, fn) {
    var valid = fn();
    if (!valid) {
        $input.attr('disabled', 'disabled');
    } else {
        $input.removeAttr('disabled');
    }
}