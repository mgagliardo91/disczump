var adminUrl = "/admin";
var url = adminUrl + "/api";

$(document).ready(function() {
	$('#test').click(function() {
		var val = $('#testVal').val();
		var val2 = $('#testVal2').val();
		    doAjax({
			    url: url,
				path: '/user/geo?loc=' + val + '&radius=' + val2, 
				type: 'GET',
				callback: function(success, retData) {
					if (success) {
						$('#result').empty();
						
						_.each(retData, function(user) {
							$('#result').append('<li>' + user.local.username + " " + user.local.firstName + " " + user.local.lastName + " " + user.local.location.city + ", " + user.local.location.stateAcr + '</li>')
						});
					} else {
						console.log(retData);
					}
				}
			});
	});
	
	doAjax({
		path: '/active', 
		type: 'GET',
		url: url,
		callback: handleActive
	});
});

var handleActive = function(success, users) {
    if (success) {
        var $table = $('#object-table');
        
        _.each(users, function(user) {
            var $row = $('<tr></tr>');
            $row.append('<td>' + user._id + '</td>');
            $row.append('<td>' + user.local.username + '</td>');
            $row.append('<td>' + user.local.firstName + '</td>');
            $row.append('<td>' + user.local.lastName + '</td>');
            $row.append('<td>' + user.local.email + '</td>');
            $row.append('<td>' + user.local.dateJoined + '</td>');
            $row.append('<td>' + user.local.lastAccess + '</td>');
            $table.append($row);
        });
    }
}