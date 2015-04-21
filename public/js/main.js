var url = "/api/";

function preloadImage() {
    var image = new Image();
    image.src = '/static/logo/logo_small.svg';
    
    var image2 = new Image();
    image2.src = 'static/logo/logo_block.svg';
}

/*
* Name: getSafe
* Date: 01/07/2015
*/
function getSafe(obj, backup) {
    return isDef(obj) ? obj : backup;
}

/*
* Name: isDef
* Date: 01/07/2015
*/
function isDef(obj) {
	return typeof obj !== 'undefined';
}

function getAllDiscImages(discId, callback) {
	var success = false;
	var images = [];
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + 'discs/' + discId + '/images',
		contentType: "application/json",
		success: function (data) {
		   	images = data;
			success = true;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success, images);
			}
		}
     });
}

function getPrimaryDiscImage(imageId, callback) {
	if (!isDef(imageId)) {
		return callback(false);
	}
	
	var success = false;
	var image = {};
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + 'images/' + imageId,
		contentType: "application/json",
		success: function (data) {
		   	image = data;
			success = true;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success, image);
			}
		}
     });
}

function getAllDiscs(callback) {
	var success = false;
	var discs = [];
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + 'discs/',
		contentType: "application/json",
		success: function (data) {
		   	discs = data;
			success = true;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success, discs);
			}
		}
     });
}

function getAllPublicDiscsByUser(userId, callback) {
	var success = false;
	var discs = [];
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + 'users/' + userId + '/discs',
		contentType: "application/json",
		success: function (data) {
		   	discs = data;
			success = true;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success, discs);
			}
		}
     });
}

function getDiscById(discId, callback) {
	var success = false;
	var disc = {};
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + 'discs/' + discId,
		contentType: "application/json",
		success: function (data) {
			disc = data;
			success = true;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success, disc);
			}
		}
     });
}