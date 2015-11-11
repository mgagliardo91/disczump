var adminUrl = "/admin";
var url = adminUrl + "/api";

$(document).ready(function() {

	$('li.sidebar-select.nav').click(function() {
		window.location = $(this).attr('href');
	});
    
 //   getStats('user', function(success, stat) {
 //   	if (success) {
	//         $('#count-total-users').text(stat.total);
	//         $('#count-confirmed-users').text(stat.confirmed);
	//         $('#count-active-users').text(stat.active);
 //   	}
	// });
	
	// getStats('disc', function(success, stat) {
	// 	if (success) {
 //       	$('#count-total-discs').text(stat.total);
	// 	}
	// });
	
	// $('#search-users').click(function() {
	// 	var query = $('#user-query').val();
		
	// 	if (!query.length) return;
		
	// 	var queryTypeSelection = $('input[name="optQuery"]').is(':checked');
	// 	var queryType = queryTypeSelection.length ? queryTypeSelection.attr('value') : 'email';
		
	// 	queryUser(queryType, query, function(success, user) {
	// 		if (success) {
	// 			$('#query-result').empty().append('<a class="dz-color" href="' + adminUrl + '/users/' + user._id +'">[' + user._id + '] ' + user.local.email + '</a>');
	// 		} else {
	// 			$('#query-result').empty().append('No Results');
	// 		}
	// 	});
	// });
	
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
});

function getStats(table, callback) {
    doAjax({
	    url: url,
		path: '/statistics/' + table, 
		type: 'GET',
		callback: callback
	});
}

function queryUser(type, query, callback) {
    doAjax({
	    url: url,
		path: '/user?' + type + '=' + query, 
		type: 'GET',
		callback: callback
	});
}