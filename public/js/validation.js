var $verifyPassword;
var $password;
var $submit;
var $username;
var $passcode;

var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;

$(document).ready(function(){
       
       $verifyPassword = $('#verify-password');
        $password = $('#password');
        $submit = $('#submit');
        $username = $('#username');
        $passcode = $('#passcode');
        
        $('form').submit(function() {
            var validEmail = validateEmail();
            var validPw = validatePassword();
            
            if (validEmail && validPw) {
                return true;
            }
            
           return false; 
        });
    
        $password.on('keyup', function(e){
            addValidation($password, function(){
                var len = $password.val().length;
                return (len == 0 ? undefined : len >= 6);
            });
        }).focusout(function(){
            addValidation($password, function(){
                var len = $password.val().length;
                return (len == 0 ? undefined : len >= 6);
            });
         });
        
        $username.focusin(function() {
            addValidation($username, validateEmail);
        }).on('keyup',function(e) {
            addValidation($username, validateEmail);
         }).focusout(function(){
            addValidation($username, validateEmail);
         });
         
        $passcode.focusin(function() {
            addValidation($passcode, function() {
                return $passcode.val().length == 0 ? undefined : true;
            });
        }).on('keyup',function(e) {
            addValidation($passcode, function() {
                return $passcode.val().length == 0 ? undefined : true;
            });
         }).focusout(function(){
            addValidation($passcode, function() {
                return $passcode.val().length == 0 ? undefined : true;
            });
         });
    
         $verifyPassword.focusin(function(){
            addValidation($verifyPassword, validatePassword);
         }).on('keyup',function(e) {
         	addValidation($verifyPassword, validatePassword);
         }).focusout(function(){
         	addValidation($verifyPassword, validatePassword);
         	
         });
    });

function validatePassword(){
    
    if ($verifyPassword.length == 0) {
        return $password.val().length > 0;
    } else {
        return ($password.val().length == 0 && $verifyPassword.val().length == 0) ?
        undefined : ($password.val() == $verifyPassword.val());
    }
}

function validateEmail(){
    return ($username.val().length == 0 ? undefined : regex.test($username.val()));
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