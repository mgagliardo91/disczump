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

/*
* Checks to see if an element has an attribute
*/
function hasAttr($elem, attribute) {
	var attr = $elem.attr(attribute);
	return (typeof attr !== typeof undefined && attr !== false);
}

function getCityState(zipcode, callback) {
	var success = false;
	var retData;
	$.ajax({
		type: "GET",
		dataType: "json",
		url: 'https://api.zippopotam.us/us/' + zipcode,
		success: function (data) {
			if (data.places.length) {
			    var place = data.places[0];
			    retData = place['place name'] + ", " + place['state abbreviation'];
			} else {
				retData = 'Unknown';
			}
			success = true;
		},
		error: function (request, textStatus, errorThrown) {
		   if (request.status == 404) {
		   		retData = 'Invalid zip code';
		   }
		},
		complete: function() {
			if (callback) {
				callback(success, retData);
		   }
		}
	});
}

function resetPassword(currentPw, newPw, callback) {
	var success = false;
	var retData;
	var reset = {'currentPw': currentPw, 'newPw': newPw};
	$.ajax({
		type: "PUT",
		dataType: "json",
		url: url + '/account/reset',
		contentType: "application/json",
		data: JSON.stringify(reset),
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
		   console.log(request.responseText);
		   console.log(textStatus);
		   console.log(errorThrown);
		   retData = {'error' : {message : request.responseText, type : 'Server Communication Error'}};
		},
		complete: function(){
		   if (callback) {
				callback(success, retData);
		   }
		}
	});
}

function getUser(userId, callback) {
	var success = false;
	var retData;
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + '/users/' + userId,
		contentType: "application/json",
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
			retData = {'error' : {message : request.responseText, type : 'Server Communication Error'}};
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
			}
		}
     });
}

function getAccount(callback) {
	var success = false;
	var retData;
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + '/account',
		contentType: "application/json",
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
			}
		}
     });
}

function putAccount(account, callback) {
	var success = false;
	var retData;
	$.ajax({
		type: "PUT",
		dataType: "json",
		url: url + '/account',
		contentType: "application/json",
		data: JSON.stringify(account),
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
		   console.log(request.responseText);
		   console.log(textStatus);
		   console.log(errorThrown);
		   retData = {'error' : {message : request.responseText, type : 'Server Communication Error'}};
		},
		complete: function(){
		   if (callback) {
				callback(success, retData);
		   }
		}
	});
}

function getThreads(callback) {
	var success = false;
	var retData;
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + '/threads',
		contentType: "application/json",
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
			retData = {'error' : {message : request.responseText, type : 'Server Communication Error'}};
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
			}
		}
     });
}

function postThread(thread, callback) {
	var success = false;
	var retData;
    $.ajax({
		type: "POST",
		dataType: "json",
		url: url + 'threads/',
		contentType: "application/json",
		data: JSON.stringify(thread),
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
			retData = {'error' : {message : request.responseText, type : 'Server Communication Error'}};
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
		   	}
		}
     });
}

function getThreadState(threadId, callback) {
	var success = false;
	var retData;
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + '/threads/' + threadId,
		contentType: "application/json",
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
			retData = {'error' : {message : request.responseText, type : 'Server Communication Error'}};
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
			}
		}
     });
}

function getMessages(threadId, callback) {
	var success = false;
	var retData;
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + '/threads/' + threadId + '/messages',
		contentType: "application/json",
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
			retData = {'error' : {message : request.responseText, type : 'Server Communication Error'}};
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
			}
		}
     });
}

function postMessage(threadId, message, callback) {
	var success = false;
	var retData;
    $.ajax({
		type: "POST",
		dataType: "json",
		url: url + 'threads/' + threadId + '/messages',
		contentType: "application/json",
		data: JSON.stringify(message),
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
			retData = {'error' : {message : request.responseText, type : 'Server Communication Error'}};
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
		   	}
		}
     });
}

function getAllDiscImages(discId, callback) {
	var success = false;
	var retData;
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + 'discs/' + discId + '/images',
		contentType: "application/json",
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
			}
		}
     });
}

function getPrimaryDiscImage(imageId, callback) {
	if (!isDef(imageId)) {
		return callback(false);
	}
	
	var success = false;
	var retData;
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + 'images/' + imageId,
		contentType: "application/json",
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
			}
		}
     });
}

function getAllDiscs(callback) {
	var success = false;
	var retData;
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + 'discs/',
		contentType: "application/json",
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
			}
		}
     });
}

function getAllPublicDiscsByUser(userId, callback) {
	var success = false;
	var retData;
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + 'users/' + userId + '/discs',
		contentType: "application/json",
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
			}
		}
     });
}

function getDiscById(discId, callback) {
	var success = false;
	var retData = {};
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + 'discs/' + discId,
		contentType: "application/json",
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
			}
		}
     });
}


function getUserPreferences(callback) {
	var success = false;
	var retData = {};
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + 'account/preferences',
		contentType: "application/json",
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
			}
		}
     });
}

function updatePreferences(prefs, callback) {
        var success = false;
        var type = typeof prefs === 'undefined' ? 
        	'POST' : 'PUT';
    	var retData = {};
        $.ajax({
    		type: type,
    		dataType: "json",
    		data: JSON.stringify(prefs),
    		url: url + 'account/preferences',
    		contentType: "application/json",
    		success: function (data) {
    		   	retData = {'error' : {message : 'Unable to process request.', type : 'Unknown Error'}};
    			
    			if (!data) {
    				success = false;
    				return;
    			}
    			
    			if (data.error) {
    				retData = data.error;
    				success = false;
    				return;
    			}
    			
    			retData = data;
    			success = true;
    		},
    		error: function (request, textStatus, errorThrown) {
    			console.log(request.responseText);
    			console.log(textStatus);
    			console.log(errorThrown);
    		},
    		complete: function(){
    			if (callback) {
    				callback(success, retData);
    			}
    		}
         });
    }

function postDisc(disc, callback) {
	var success = false;
	var retData;
    $.ajax({
		type: "POST",
		dataType: "json",
		url: url + 'discs/',
		contentType: "application/json",
		data: JSON.stringify(disc),
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
			retData = {'error' : {message : request.responseText, type : 'Server Communication Error'}};
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
		   	}
		}
     });
}

function putDisc(disc, callback) {
	var success = false;
	var retData;
	$.ajax({
		type: "PUT",
		dataType: "json",
		url: url + 'discs/' + disc._id,
		contentType: "application/json",
		data: JSON.stringify(disc),
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
		   console.log(request.responseText);
		   console.log(textStatus);
		   console.log(errorThrown);
		   retData = {'error' : {message : request.responseText, type : 'Server Communication Error'}};
		},
		complete: function(){
		   if (callback) {
			callback(success, retData);
		   }
		}
	});
}

function deleteDisc(discId, callback) {
	var success = false;
	var retData;
	$.ajax({
		type: "DELETE",
		dataType: "json",
		url: url + 'discs/' + discId,
		contentType: "application/json",
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
		   console.log(request.responseText);
		   console.log(textStatus);
		   console.log(errorThrown);
		},
		complete: function(){
		   if (callback) {
			callback(success, retData);
		   }
		}
	});
}

function deleteImage(imageId, callback) {
	var success = false;
	var retData;
	$.ajax({
		type: "DELETE",
		dataType: "json",
		url: url + 'images/' + imageId,
		contentType: "application/json",
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
		   console.log(request.responseText);
		   console.log(textStatus);
		   console.log(errorThrown);
		},
		complete: function(){
		   if (callback) {
			callback(success, retData);
		   }
		}
	});
}

function postFeedback(feedback, callback) {
	var success = false;
	var retData;
    $.ajax({
		type: "POST",
		dataType: "json",
		url: url + 'feedback',
		contentType: "application/json",
		data: JSON.stringify({data: feedback}),
		success: function (data) {
			var retVal = validateServerData(data);
			success = retVal.success;
			retData = retVal.retData;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
			retData = {'error' : {message : request.responseText, type : 'Server Communication Error'}};
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
		   	}
		}
     });
}

function validateServerData(data) {
	
	if (!data) {
		return {success: false, retData: {message : 'Unable to process request.', type : 'Unknown Error'}};
	}
				
	if (data.error) {
		return {success: false, retData: data.error};
	}
	
	return {success: true, retData: data};
}