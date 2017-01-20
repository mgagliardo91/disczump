var adminUrl = "/admin";
var url = adminUrl + "/api";

$(document).ready(function() {

	$('li.sidebar-select.nav').click(function() {
		window.location = $(this).attr('href');
	});
});
