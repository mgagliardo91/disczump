var url = "/admin/api";

$(document).ready(function() {
    
    getStats('user', function(success, stat) {
        $('#count-total-users').text(stat.total);
        $('#count-active-users').text(stat.active);
	});
	
	getStats('disc', function(success, stat) {
        $('#count-total-discs').text(stat.total);
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