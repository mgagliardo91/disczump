$(document).ready(function(){
       
    var signUpValidate = new ZumpValidate({
        items: [
            {id:'username', type:'email', hint: 'This will be how you log in to your inventory.'},
            {id:'password', type: 'text', min: 6, hint: 'Password must be at least 6 characters in length.'},
            {id:'verify-password', type:'compare', refId:'password'},
            {id:'zipCode', type:'zipcode', output: 'citystate'},
            {id:'alias', type:'none', hint: 'This will be how your name is publicly displayed.'},
            {id:'passcode', type:'none', hint: 'Enter your beta passcode.'}
        ],
        feedbackOnInit: true
    });
    
    $('#signup-form').submit(function() {
        if (!signUpValidate.isAllValid()) {
            return false;
        } 
    });
   
    var recoverValidate = new ZumpValidate({
        items: [
            {id:'recover-username', type:'email'}
        ]
    });
    
    $('#recover-form').submit(function() {
        if (!recoverValidate.isAllValid()) {
            return false;
        } 
    });
    
    var resetValidate = new ZumpValidate({
        items: [
            {id:'password', type: 'text', min: 6, hint: 'Password must be at least 6 characters in length.'},
            {id:'verify-password', type:'compare', refId:'password'}
        ]
    });
    
    $('#reset-form').submit(function() {
        if (!resetValidate.isAllValid()) {
            return false;
        } 
    });
});