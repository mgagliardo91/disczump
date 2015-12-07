var url = "/api";
var dzID = '1433417853616595';

$(document).ready(function() {
	var $scroller = $('.page-scroll');
	
	
	if ($scroller.length) {
		$scroller.find('.page-container').css({
			
		});
		
		$(window).on('resize', resizeScroller);
		resizeScroller();
	}
});

function resizeScroller() {
	$('.page-scroll').css({
		'max-height': $(window).height() - $('.zump-navbar').outerHeight(true)
	});
}

function preloadImage() {
    var image = new Image();
    image.src = '/static/logo/logo_small.svg';
    
    var image2 = new Image();
    image2.src = 'static/logo/logo_block.svg';
}

function isInternetExplorer() {
    return (window.navigator.userAgent.indexOf("MSIE ") > 0);
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

var shareFacebook = function(discId, callback) {
	FB.api('/?id=' + serverURL + '/disc/' + discId + '&scrape=true', 'post', {}, function(response) {
		
		if (callback) callback();
		
		var popupWindow = generatePopup('https://www.facebook.com/sharer/sharer.php?app_id=' + dzID + '&u=' + serverURL + '/disc/' + discId + 
	    	'&display=popup&ref=plugin&src=share_button', 'sharer', 600, 400);
    });
}

/*
* Code credited to: http://www.xtf.dk/2011/08/center-new-popup-window-even-on.html
* Modified to fit our code
*/
function generatePopup(url, title, w, h) {
    // Fixes dual-screen position                         Most browsers      Firefox
    var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
    var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;

    var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

    var left = ((width / 2) - (w / 2)) + dualScreenLeft;
    var top = ((height / 2) - (h / 2)) + dualScreenTop;
    var popupWindow = window.open(url, title, 'toolbar=0 ,status=0, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);
    try {
		popupWindow.focus();
		return popupWindow;
	}
	catch (e) {
		generateError('A popup blocker is enabled in this browser. Please allow popups and try again.', 'Unable To Open', true);
		return undefined;
	}
}

function getUserImage(user) {
	return isDef(user.image) ? user.image : '/static/logo/logo_high_nobg.svg';
}

/*
* Checks to see if an element has an attribute
*/
function hasAttr($elem, attribute) {
	var attr = $elem.attr(attribute);
	return (typeof attr !== typeof undefined && attr !== false);
}

/*
* Excutes a function after a specified period of time
*/
var delay = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();

/*
* Handles a standard server error
*/
function handleError(error) {
	generateError(error.message, error.type, false);
}

/*
* Generates a information message
*/
function generateInfo(message, title, autoClose, links) {
	
	$('.page-alert').remove();
	$('body').prepend(generateMessage('info', message, title, links));
	$('.page-alert').slideDown(300);
	if (autoClose) {
		autoCloseAlert($('.page-alert'), '.close', 3000);
	}
}

/*
* Generates an error message
*/
function generateError(message, title, autoClose, links) {
	
	$('.page-alert').remove();
	$('body').prepend(generateMessage('danger', message, title, links));
	$('.page-alert').slideDown(300);
	if (autoClose) {
		autoCloseAlert($('.page-alert'), '.close', 3000);
	}
}

/*
* Generates a success message
*/
function generateSuccess(message, title, autoClose, links) {
	
	$('.page-alert').remove();
	$('body').prepend(generateMessage('success', message, title, links));
	$('.page-alert').slideDown(300);
	if (autoClose) {
		autoCloseAlert($('.page-alert'), '.close', 3000);
	}
}

/*
* Generates a standard message based on arguments
*/
function generateMessage(type, message, title, links) {
    var endMessage = '';
    
    if (links && links.length) {
	    var j = 0;
	    var parsed = message.split('<');
	    endMessage = parsed[0];
	    for (var i = 1; i < parsed.length; i++) {
	    	var linkParsed = parsed[i].split('>');
	    	if (linkParsed.length != 2 || j > links.length) {
	    		endMessage += parsed[i];
	    	} else {
	    		endMessage += '<a href="' + links[j++] + '">' + linkParsed[0] + '</a>' + linkParsed[1]; 
	    	}
	    }
    } else {
    	endMessage = message;
    }
    
    return '<div class="alert alert-' + type + ' alert-dismissible page-alert" role="alert">' +
        		'<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
        		'<div class="alert-body">' +
        			'<strong>' + (title ? title + '!' : '') + '</strong>' + endMessage +
        		'</div>' +
    		'</div>';
}

/*
* Automatically closes an alert based on delay time
*/
function autoCloseAlert($element, selector, delay) {
	var id = setTimeout(function() {
		if ($element.hasClass('page-alert')) {
			$element.slideUp(300);
		} else {
			$element.find(selector).trigger('click');
		}
	}, delay);
	$element.on('mouseenter', function() {
		clearTimeout(id);	
	}).on('mouseleave', function() {
		$element.find(selector).trigger('click');
	});
}

/*
* Generates an error message containing a list of invalid fields.
*/
function generateInvalidDataError(invalidItems) {
		var errorText = '';
		
		for(var i = 0; i < invalidItems.length; i++) {
			var item = invalidItems[i];
			
			if (i == invalidItems.length - 1 && invalidItems.length > 1) {
				errorText = errorText + ' and ';
			} else if (i > 0) {
				errorText = errorText + ', ';
			}
			
			errorText = errorText + $('#' + item.id).attr('param');
		}
		
		return generateError('Invalid responses to the following fields: ' + errorText + '.', 'ERROR', false);
}


function getCityState(zipcode, callback) {
	
	var success = false;
	var retData;
	return $.ajax({
		type: "GET",
		dataType: "json",
		url: 'https://maps.googleapis.com/maps/api/geocode/json?address=' + zipcode,
		success: function (data) {
			retData = parseGeo(data);
			success = true;
		},
		error: function (request, textStatus, errorThrown) {
		   if (request.status == 404) {
		   		retData = 'Invalid postal code';
		   }
		},
		complete: function() {
			if (callback) {
				callback(success, retData);
		   }
		}
	});
}

function parseGeo(results) {
	var geoResults = [];
	
	if (results.status == 'OK') {
		_.each(results.results, function(loc) {
			var stringRes = loc.formatted_address;
			var zip;
			
			_.each(loc.address_components, function(comps) {
				if (_.contains(comps.types, 'postal_code')) {
					zip = comps.long_name;
				}
			});
			
			if (stringRes && zip) {
				geoResults.push({
					formatted: stringRes,
					locLat: loc.geometry.location.lat,
					locLng: loc.geometry.location.lng,
					zipcode: zip
				});
			}
		});
		
		_.sortBy(geoResults, 'formatted');
	}
	
	return geoResults;
}

function formatGeolocation(results) {
	var location = {};
	
	_.each(results.address_components, function(component) {
		if (_.contains(component.types, 'locality')) {
			location.local = component.long_name;
		} else if (_.contains(component.types, 'administrative_area_level_1')) {
			location.admin = component.short_name;
		} else if (_.contains(component.types, 'postal_code')) {
			location.postal = component.long_name;
		}
	});
	
	location.lat = results.geometry.location.lat;
	location.lng = results.geometry.location.lng;
	
	return location;
}

function doAjax(param) {
	var success = false;
	var retData;
	return $.ajax({
		cache: false,
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
		   retData = undefined;
    		generateError('Unable to connect to disc|zump. Please <refresh> your page and try again.', 'Connection Error', false, ['/dashboard']);
		},
		complete: function(){
		   if (param.callback) {
				param.callback(success, retData);
		   }
		}
	});
}

function getTemplates(callback) {
	doAjax({
		path: '/templates', 
		type: 'GET',
		callback: callback
	});
}

function queryUser(type, text, callback) {
	doAjax({
		path: '/validate/' + type + '?q=' + text, 
		type: 'GET',
		callback: callback
	});
}

var profileQuery;

function getProfiles(query, callback) {
	if (profileQuery && profileQuery.readystate != 4){
        profileQuery.abort();
    }
	
	profileQuery = doAjax({
		path: '/users?q=' + query, 
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

function deleteAccountImage(callback) {
	doAjax({
		path: '/account/image', 
		type: 'DELETE',
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

function postThread(receivingUser, callback) {
	doAjax({
		path: '/threads', 
		type: 'POST',
		data: {receivingUser: receivingUser},
		callback: callback
	});
}

function deleteThread(threadId, callback) {
	doAjax({
		path: '/threads/' + threadId,
		type: 'DELETE',
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

function getPrimaryDiscImage(disc) {
	if (disc.primaryImage) {
		return _.findWhere(disc.imageList, {_id: disc.primaryImage});
	} else {
		return undefined;
	}
}

function getAllDiscs(callback) {
	doAjax({
		path: '/discs/',
		type: 'GET',
		callback: callback
	});
}

function getProfilePreview(userId, callback) {
	doAjax({
		path: '/users/' + userId + '/preview',
		type: 'GET',
		callback: callback
	});
}

function getPublicPreview(userId, refDiscId, callback) {
	doAjax({
		path: '/users/' + userId + '/preview?refDiscId=' + refDiscId,
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

function deleteImage(discId, imageId, callback) {
	doAjax({
		path: '/discs/' + discId + '/images/' + imageId,
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