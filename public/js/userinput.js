var $inputForm;

$(document).ready(function(){
    $inputForm = $('#user-input-form');
       
    var inputValidate = new ZumpValidate({
        items: [
            {id:'email', type:'email'},
            {id:'current-password', type: 'text', min: 6},
            {id:'new-password', type: 'text', min: 6, hint: 'Password must be at least 6 characters in length.'},
            {id:'verify-password', type:'compare', refId:'new-password'},
        ]
    });
    
    $('#submit').click(function() {
        $('.page-alert').remove();
        $inputForm.submit();
    });
    
    $inputForm.submit(function() {
        if (!inputValidate.isAllValid()) {
            generateError('Invalid data.', 'ERROR', false);
            return false;
        } 
    });
});