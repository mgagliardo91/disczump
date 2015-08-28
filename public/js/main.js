var url = "/api";

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

function doAjax(param) {
	var success = false;
	var retData;
	$.ajax({
		type: param.type,
		dataType: "json",
		url: (param.url ? param.url : url) + param.path,
		contentType: "application/json",
		data: JSON.stringify(param.data),
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
		   if (param.callback) {
				param.callback(success, retData);
		   }
		}
	});
}

function queryUser(type, text, callback) {
	doAjax({
		path: '/validate/' + type + '?q=' + text, 
		type: 'GET',
		callback: callback
	});
}

function resetPassword(currentPw, newPw, callback) {
	doAjax({
		path: '/account/reset', 
		type: 'PUT', 
		data: {'currentPw': currentPw, 'newPw': newPw}, 
		callback: callback
	});
}

function getUser(userId, callback) {
	doAjax({
		path: '/users/' + userId, 
		type: 'GET',
		callback: callback
	});
}

function getSession(callback) {
	doAjax({
		path: '/initialize', 
		type: 'GET',
		url: '/connect',
		callback: callback
	});
}

function getAccount(callback) {
	doAjax({
		path: '/account', 
		type: 'GET',
		callback: callback
	});
}

function putAccount(account, callback) {
	doAjax({
		path: '/account', 
		type: 'PUT',
		data: account,
		callback: callback
	});
}

function getThreads(callback) {
	doAjax({
		path: '/threads', 
		type: 'GET',
		callback: callback
	});
}

function postThread(thread, callback) {
	doAjax({
		path: '/threads', 
		type: 'POST',
		data: thread,
		callback: callback
	});
}

function getThreadState(threadId, callback) {
	doAjax({
		path: '/threads/' + threadId, 
		type: 'GET',
		callback: callback
	});
}

function putThreadState(threadId, threadState, callback) {
	doAjax({
		path: '/threads/' + threadId, 
		type: 'PUT',
		data: threadState,
		callback: callback
	});
}

function getMessages(threadId, params, callback) {
	var queryString = '';
	if (typeof(params) !== 'undefined') {
		if (typeof(params.count) !== 'undefined') {
			queryString = 'count=' + params.count;
		}
		
		if (typeof(params.refId) !== 'undefined') {
			queryString = queryString + 
				(queryString.length > 0 ? '&' : '') + 
				'refId=' + 
				params.refId;
		}
		
		if (queryString.length > 0) {
			queryString = '?' + queryString;
		}
	}
	
	doAjax({
		path: '/threads/' + threadId + '/messages' + queryString, 
		type: 'GET',
		callback: callback
	});
}

function postMessage(threadId, message, callback) {
	doAjax({
		path: '/threads/' + threadId + '/messages',
		type: 'POST',
		data: message,
		callback: callback
	});
}

function getAllDiscImages(discId, callback) {
	doAjax({
		path: '/discs/' + discId + '/images',
		type: 'GET',
		callback: callback
	});
}

function getPrimaryDiscImage(imageId, callback) {
	if (!isDef(imageId)) {
		return callback(false);
	}
	
	doAjax({
		path: '/images/' + imageId,
		type: 'GET',
		callback: callback
	});
}

function getAllDiscs(callback) {
	doAjax({
		path: '/discs/',
		type: 'GET',
		callback: callback
	});
}

function getAllPublicDiscsByUser(userId, callback) {
	doAjax({
		path: '/users/' + userId + '/discs',
		type: 'GET',
		callback: callback
	});
}

function getDiscById(discId, callback) {
	doAjax({
		path: '/discs/' + discId,
		type: 'GET',
		callback: callback
	});
}


function getUserPreferences(callback) {
	doAjax({
		path: '/account/preferences',
		type: 'GET',
		callback: callback
	});
}

function updatePreferences(prefs, callback) {
        var success = false;
        var type = typeof prefs === 'undefined' ? 
        	'POST' : 'PUT';
        
	    doAjax({
			path: '/account/preferences',
			type: type,
			data: prefs,
			callback: callback
		});
    }

function postDisc(disc, callback) {
	doAjax({
		path: '/discs',
		type: 'POST',
		data: disc,
		callback: callback
	});
}

function putDisc(disc, callback) {
	doAjax({
		path: '/discs/' + disc._id,
		type: 'PUT',
		data: disc,
		callback: callback
	});
}

function deleteDisc(discId, callback) {
	doAjax({
		path: '/discs/' + discId,
		type: 'DELETE',
		callback: callback
	});
}

function deleteImage(imageId, callback) {
	doAjax({
		path: '/images/' + imageId,
		type: 'DELETE',
		callback: callback
	});
}

function postFeedback(feedback, callback) {
	doAjax({
		path: '/feedback',
		type: 'POST',
		data: {data: feedback},
		callback: callback
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