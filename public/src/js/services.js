angular.module('underscore', [])
 
.factory('_', ['$window', function($window) {
    return $window._;
}]);

angular.module('CryptoJS', [])

.factory('$crypt', ['$window', function($window) {
    return $window.CryptoJS;
}]);

angular.module('disczump.services', ['underscore', 'CryptoJS'])

.factory('LocalStorage', [function() {
	
	var addItem = function(key, item) {
		window.localStorage.setItem(key, item);
	}
	
	var getItem = function(key) {
		return window.localStorage.getItem(key);
	}
	
	var removeItem = function(key) {
		window.localStorage.removeItem(key);
	}
	
	var itemExists = function(key) {
		return getItem(key) != null;
	}
	
	return {
		addItem: addItem,
		getItem: getItem,
		removeItem: removeItem,
		itemExists: itemExists
	}
}])

.factory('Random', [function() {
	
	var random = function(length) {
		var text = '';
		var charArr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for(var i = 0; i < length; i++)
			text += charArr.charAt(Math.floor(Math.random() * charArr.length));

		return text;
	}
	
	return {
		random: random
	}
}])

.factory('PropService', function() {
	var properties = {
		ExploreReqSize: 40,
		ExploreDefSort: 'createDate',
		
		TrunkReqSize: 40,
		
		MessageReqSize: 20
	}
	
	var get = function(nameOfProp) {
		return properties[nameOfProp];
	}
	
	return {
		get: get
	}
})

.factory('TempStore', ['Random', function(Random) {
	var store = {};
	
	var setTemp = function(value) {
		var key = Random.random(10);
		store[key] = value;
		return key;
	}
	
	var setTempKey = function(key, value) {
		store[key] = value;
	}
	
	var getTemp = function(key) {
		return store[key];
	}
	
	var hasKey = function(key) {
		return typeof(store[key]) !== 'undefined';
	}
	
	return {
		setTemp: setTemp,
		getTemp: getTemp,
		setTempKey: setTempKey,
		hasKey: hasKey
	}
}])

.factory('StartUp', ['$q', 'AccountService', 'SocketUtils', function($q, AccountService, SocketUtils) {
	
	var init = function(forceReload) {
		var deffered = $q.defer();
		
		AccountService.initAccount(forceReload).then(function(account) {
			if (account) {
				SocketUtils.init();
			}
			
			deffered.resolve(account);
		});
		
		return deffered.promise;
	}
	
	return {
		init: init
	}
}])

.factory('FacebookPixelUtils', function() {
	
	var callFbPixel = function(request) {
		try {
			if (typeof(fbq) === 'undefined')
				throw new Exception('FacebookPixel was not initialized.')
			request();
		} catch (e) {
			console.log('Cannot connect to facebook pixel.', e);
		}
	}
	
	var trackDiscSearch = function(searchString, contentCategory) {
		if (!searchString.length) return;
		var request = function() {
			fbq('track', 'Search', {
				search_string: searchString,
				content_category: 'disc'
			});
		}
		return callFbPixel(request);
	}
	
	var trackDiscView = function(data) {
		var request = function() {
			var requestObj = {
				content_name: data.brand + ' ' + data.name,
				content_category: 'disc',
			};
			
			if (data.value) {
				requestObj.value = data.value;
				requestObj.currency = 'USD';
			}
			
			fbq('track', 'ViewContent', requestObj);
		}
		return callFbPixel(request);
	}
	
	return {
		trackDiscSearch: trackDiscSearch,
		trackDiscView: trackDiscView
	}
})

.factory('FacebookUtils', ['$http', '$window', '$q', '$ocLazyLoad', 'AccountService', function($http, $window, $q, $ocLazyLoad, AccountService) {
	var fbStatus;
	var appId = window.fbId;
	
	var initFacebook = function() {
		var deffered = $q.defer();
		
		if (typeof FB === 'undefined') {
            $ocLazyLoad.load(['https://connect.facebook.net/en_US/sdk.js']).then(function() {
				FB.init({
				  appId: appId,
				  xfbml: false,
				  version: 'v2.7'
				});
				
				try {
					FB.getLoginStatus(function(response) {
						fbStatus = response;
						deffered.resolve();
					});
				} catch (e) {
					deffered.resolve();
				}
			});
        } else {
			deffered.resolve();
        }
		
		return deffered.promise;
	}
	
	var facebookLogin = function(callback) {
		if (fbStatus.status === 'connected') {
			callback(true, fbStatus);
		} else {
			FB.login(function(response) {
				if (response.authResponse) {
					fbStatus = response;
					callback(true, response);
				} else {
					return callback();
				}
			}, {scope: 'email,user_photos', 
				return_scopes: true});
		}
	}
	
	var getFBAccountData = function(response, callback) {
		FB.api('/me?fields=first_name,last_name,email', function(account) {
			callback(true, {
				token: response.authResponse,
				account: account
			});
		});
	}
	
	var unlink = function(callback) {
		return AccountService.doFacebookUnlink(callback);
	}
	
	var link = function(callback) {
		facebookLogin(function(success, response) {
			if (response.authResponse) {
				return AccountService.doFacebookLink(response.authResponse, callback);
			} else {
				return callback();
			}
		});
	}
	
	var getFBAccount = function(callback) {
		facebookLogin(function(success, response) {
			if (success) {
				getFBAccountData(response, callback);
			} else {
				callback();
			}
		});
	}
	
	var login = function(callback) {
		facebookLogin(function(success, response) {
			if (response.authResponse) {
				return AccountService.doFacebookLogin(response.authResponse, callback);
			} else {
				return callback();
			}
		});
	}
	
	var scrapePath = function(path, callback) {
		var url = encodeURIComponent(window.serverURL + path)
		$http({
			method:'POST',
			url: 'https://graph.facebook.com/?id=' + url + '&scrape=true&access_token=1433417853616595|8f4bdccf243ed064d9446ef2f43f7054',
			timeout: 5000
		}).then(function(response) {
			var error = !response.data || !response.data.id;
			return callback(error);
		});
	}
	
	var shareFacebook = function(path) {
		FB.ui({
		  method: 'share',
		  href: window.serverURL + path,
		}, function(response){
		});
	}
	
	return {
		login: login,
		link: link,
		unlink: unlink,
		getFBAccount: getFBAccount,
		initFacebook: initFacebook,
		shareFacebook: shareFacebook,
		scrapePath: scrapePath
	}
}])

.factory('SocketUtils', ['APIService', '$rootScope', '$timeout', '_', 'AccountService', 
		 function (APIService, $rootScope, $timeout, _, AccountService) {
	var connectTries = 0;
	var socket;
	var sessionId;
	var registry = {};
	
	var parseNotification = function(notification) {
		if (registry[notification.type]) {
			registry[notification.type].forEach(function(callback) {
				callback(notification.data);
			})
		}
	}
	
	var initSocket = function() {
		socket = io.connect('/', {
			'forceNew': true,
			reconnection: false
		});
		
		socket.on('connect', function() {
			socket.emit('initialize', sessionId);
		}).on('notification', function (notification) {
				parseNotification(notification);
		}).on('disconnect', function() {
			$rootScope.$emit('ErrorEvent', {data: 'Disconnected from disc|zump. Reconnecting...', title: 'Connection Error'});
			$timeout(init, 1000);
		}).on('connect_error', function() {
			connectTries++;
			if (connectTries < 10) {
				$timeout(init, 1000);
			}
		});
	}
	
	var init = function() {
		if (typeof(socket) !== 'undefined') return;
		
		APIService.GetExt('/oauth', '/socket', function(success, newSession) {
			if (success) {
				sessionId = newSession;
				initSocket();
			} else {
				// HANDLE ERROR
			}
		}, AccountService.getToken());
	}
	
	var registerForNotification = function(type, callback) {
		if (registry[type] && registry[type].indexOf(callback) == -1) {
			registry[type].push(callback);
		} else {
			registry[type] = [callback];
		}
	}
	
	var unregisterForNotification = function(type, callback) {
		if (registry[type]) {
			registry[type] = _.without(registry[type], callback);
		}
	}
	
  return { 
		init: init,
		registerForNotification: registerForNotification,
		unregisterForNotification: unregisterForNotification
	}
}])

.factory('PageCache', ['$location', '$rootScope', function($location, $rootScope) {
	var currentPath, backActive, urlRegex;
	var pageCache = [];
	
	function setCurrentPath(path) {
		currentPath = path;
		pageCache.push({path: path, data: {}});
	}
	
	function alertPathChange(newPath) {
		backActive = currentPath === newPath;
		
		if (backActive && pageCache.length > 2) {
			pageCache.splice(pageCache.length - 2, 2);
		}
	}
	
	function isNavBack() {
		return backActive;
	}
	
	function setDataItem(key, val) {
		if (pageCache.length) {
			pageCache[pageCache.length - 1].data[key] = val;
		}
	}
	
	function setData(data) {
		if (pageCache.length) {
			pageCache[pageCache.length - 1].data = data;
		}
	}
	
	function getPageData() {
		if (pageCache.length) {
			return pageCache[pageCache.length - 1].data;
		}
		
		return undefined;
	}
	
	function init() {
		$rootScope.$on('$locationChangeSuccess', function() {
			setCurrentPath($location.url());
		});        

	   $rootScope.$watch(function () {return $location.url()}, function (newPath) {
		   alertPathChange(newPath);
		});
	}
	
	function getUrlRegex() {
		if (typeof(urlRegex) === 'undefined') {
			var baseUrl = window.serverURL.match('https://(.*).com')[1];
			var baseUrlArr = baseUrl.split('.');
			urlRegex = baseUrlArr[0];
			
			for (var i = 1; i < baseUrlArr.length; i++) {
				urlRegex += '\\.' + baseUrlArr[i];
			}
		}
		return urlRegex;
	}
	
	return {
		isNavBack: isNavBack,
		setDataItem: setDataItem,
		setData: setData,
		init: init,
		getPageData: getPageData,
		getUrlRegex: getUrlRegex
	}
}])

.factory('PageUtils', [function() {
	var transitionEnd;
	var currentPath, backActive;
	
	function getDocHeight() {
		var body = document.body,
			html = document.documentElement;

		return Math.max( body.scrollHeight, body.offsetHeight, 
							   html.clientHeight, html.scrollHeight, html.offsetHeight );
	}
	
	function getDocWidth() {
		var body = document.body,
			html = document.documentElement;

		return Math.max( body.scrollWidth, body.offsetWidth, 
							   html.clientWidth, html.scrollWidth, html.offsetWidth );
	}
	
    function getScrollPos(){
			if(window.pageYOffset) {
				return window.pageYOffset;
			} else {
				return document.documentElement.scrollTop;
			}
    }
	
	function getWindowHeight() {
		return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
	}
	
	function getTop(elem) {
			var rectObject = elem.getBoundingClientRect();
			return rectObject.top + window.pageYOffset - document.documentElement.clientTop;
	}
	
	function getLeft(elem) {
			var rectObject = elem.getBoundingClientRect();
			return rectObject.left + window.pageXOffset - document.documentElement.clientLeft;
	}
    
    function getFullHeight(elem) {
        return getTop(elem) + elem.offsetHeight;
    }
	
	function getTransitionEndEventName () {
		if (transitionEnd) {
			return transitionEnd;
		}
		
		var i,
			el = document.createElement('div'),
			transitions = {
				'transition':'transitionend',
				'OTransition':'otransitionend',
				'MozTransition':'transitionend',
				'WebkitTransition':'webkitTransitionEnd'
			};

		for (i in transitions) {
			if (transitions.hasOwnProperty(i) && el.style[i] !== 'undefined') {
				transitionEnd = transitions[i];
				break;
			}
		}
		
		return transitionEnd;
	}
    
    return {
		getDocHeight: getDocHeight,
		getDocWidth: getDocWidth,
		getWindowHeight: getWindowHeight,
        getScrollPos: getScrollPos,
		getTop: getTop,
		getLeft: getLeft,
        getFullHeight: getFullHeight,
		getTransitionEndEventName: getTransitionEndEventName
		
    }
}])

.factory('VerificationService', ['APIService', function(APIService) {
	
	function resetPDGA(callback) {
		APIService.Post('/verify/pdga/reset', undefined, function(success, data) {
			if (success) {
				return callback(true, data);
			} else {
				return callback(false, data);
			}
		});
	}
	
	function verifyPDGA(username, password, callback) {
		APIService.Post('/verify/pdga', {username: username, password: password}, function(success, data) {
			if (success) {
				return callback(true, data);
			} else {
				return callback(false, data);
			}
		});
	}
	
	return {
		verifyPDGA: verifyPDGA,
		resetPDGA: resetPDGA
	}
}])

.factory('APIService', ['$http', '$window',

    function($http, $window) {
		var token;
		
        return {
            Get: Get,
			GetExt: GetExt,
            Put: Put,
            Post: Post,
            PostExt: PostExt,
            Delete: Delete,
            Query: Query,
			setToken: setToken
        }
		
		function setToken(aToken) {
			token = aToken;
		}
		
        function Query(path, query, callback) {
            var qPath = path + '?';
            for (var key in query) {
                qPath = qPath + key + '=' + query[key];
            }
            return request({
                path: qPath,
                method: 'GET',
                skipAuth: true
            }, callback);
        }

        function Get(path, callback, token) {
            return request({
                path: path,
                method: 'GET',
				token: token
            }, callback);
        }
			
		function GetExt(root, path, callback, token) {
			return request({
				path: path,
				method: 'GET',
				root: root,
				token: token
			}, callback);
		}

        function Put(path, data, callback, token) {
            return request({
                path: path,
                method: 'PUT',
                data: data,
				token: token
            }, callback);
        }

        function Post(path, data, callback, token) {
            return request({
                path: path,
                method: 'POST',
                data: data,
				token: token
            }, callback);
        }
		
		function PostExt(root, path, data, callback, token) {
            return request({
                path: path,
                method: 'POST',
                data: data,
				root: root,
				token: token
            }, callback);
        }

        function Delete(path, callback, token) {
            return request({
                path: path,
                method: 'DELETE',
				token: token
            }, callback);
        }
		
		function Login(path, callback) {
			return request({
                path: path,
                method: 'POST',
                data: data
            }, callback);
		}
		
        function request(params, callback) {
			var headers = {
				'Authorization': 'Basic ZHpXZWI6JDJhJDA4JHNRRnVkSERCenYvNzNEbmVCbUVUYnVlR3E5dWxwRzNsUElLLjY4bVJJVVFUL3hqZFVIa1dX',
				'If-Modified-Since': 'Mon, 26 Jul 1997 05:00:00 GMT',
				'Cache-Control': 'no-cache',
				'Pragma': 'no-cache'
			};
			
			if (params.headers) { 
				for(var i in params.headers) {
					headers[i] = params.headers[i];
				}
			}
			
			if (token) {
				headers.Authorization = 'Bearer ' + token;
			}
			
			if (params.token) {
				headers.Authorization = 'Bearer ' + params.token;
			}
			
            return $http({
                method: params.method,
                url: (params.root || '/api') + params.path,
                data: params.data,
                timeout: 5000,
				headers: headers,
				timeout: 15000
            }).then(function(response) {
                var retObj = parseResponse(response);
				if (callback) {
                	return callback(retObj.success, retObj.data);
				}

            }, function(response) {
				if (callback) {
					if (response.status == 403) {
						return callback(false, {
							message: 'Invalid username or password.',
							type: 'Login Failed'
						});
					}
					
					return callback(false, parseError(response));
				}
            });
        }
		
		function parseError(response) {
			if (response.data && response.data.error) {
				return response.data.error;
			} else {
				return {
					message: 'Failed to hit server with request.',
					type: 'Internal Error'
				};
			}
		}

        function parseResponse(response) {
            if (response.data && response.data.error) {
                return {
                    sucess: false,
                    data: response.data.error
                };
            }
            else {
                return {
                    success: true,
                    data: response.data
                };
            }
        }
    }
])

.factory('LocationService', ['$http', function($http) {
	var geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json?key=' + window.googleId;
	var geoAvailable = 'geolocation' in navigator;
	var curLocation;
	var geoCache = {};
	
	function formatLocResult(result) {
		return {
			address: result.formatted_address,
			latitude: result.geometry.location.lat,
			longitude: result.geometry.location.lng
		}
	}
	
	function parseResponse(response, typeRestrict) {
		var ret = {
			success: false
		}
		if (response.data.status == 'OK') {
			ret.data = [];
			ret.success = true;
			response.data.results.forEach(function(result) {
				if (typeRestrict) {
					for (var i = 0; i < typeRestrict.length; i++) {
						if (result.types.indexOf(typeRestrict[i]) > -1) {
							ret.data.push(formatLocResult(result));
							break;
						}
					}
				} else {
					ret.data.push(formatLocResult(result));
				}
			});
		} else {
			ret.data = {'type': 'Invalid Data Error', 'message': 'The supplied address supplied no results.'}
		}
		
		return ret;
	}
	
	function getReverseGeo(lat, lng, callback, skipCache) {
		if (!skipCache && geoCache[String(lat + ',' + lng)]) {
			return callback(true, geoCache[String(lat + ',' + lng)]);
		}
		
		$http({
			method: 'GET',
			 headers: {
			    'Content-type': 'application/json'
			 },
			url: geocodeUrl + '?latlng=' + encodeURI(lat + ',' + lng),
			timeout: 5000
		}).then(function(response) {
			var ret = parseResponse(response, ['postal_code']);
			
			if (ret.success) {
				geoCache[String(lat + ',' + lng)] = ret.data;
			}
			
			return callback(ret.success, ret.data);
		}, function(response) {
			return callback(false, {
				message: 'Failed to hit Google server with request.',
				type: 'Internal Error'
			});
		});
	}
	
	function getGeoLocation(address, callback, restrict) {
		$http({
			method: 'GET',
			 headers: {
			    'Content-type': 'application/json'
			 },
			url: geocodeUrl + '?key=AIzaSyB7kWqjg0Yei5bPUhwmKmvLVk6Zugh_-Fw&result_type=locality&address=' + encodeURI(address),
			timeout: 5000
		}).then(function(response) {
			var ret = parseResponse(response, restrict);
			
			if (ret.success) {
				ret.data.forEach(function(loc) {
					geoCache[String(loc.latitude + ',' + loc.longitude)] = [loc];
				});
			}
			
			return callback(ret.success, ret.data);
		}, function(response) {
			return callback(false, {
				message: 'Failed to hit Google server with request.',
				type: 'Internal Error'
			});
		});
	}
	
	function isGeoAvailable() {
		return geoAvailable;
	}
	
	function isLocationAvailable() {
		return isGeoAvailable() || typeof(curLocation) !== 'undefined';
	}
	
	function getLocation(callback) {
		if (typeof(curLocation) !== 'undefined') {
			return callback(true, curLocation);
		}
		
		if (!isGeoAvailable()) {
			return callback(false, {message: 'Geolocation is not available.', type: 'Geolocation Unavailable'})
		}
		
		navigator.geolocation.getCurrentPosition(function(position) {
			curLocation = position.coords;
		  	return callback(true, curLocation);
		},function(error) {
			return callback(false, error);
		});
	}
	
	return {
		isGeoAvailable: isGeoAvailable,
		isLocationAvailable: isLocationAvailable,
		getLocation: getLocation,
		getGeoLocation: getGeoLocation,
		getReverseGeo: getReverseGeo
	}
}])

.factory('QueryUserService', ['_', 'APIService', function(_, APIService) {
	var validSort = ['rel', 'proximity', 'alpha'];
	var validTypes = ['distance','pdga', 'facebook'];
	var propText = {
		pdga: 'PDGA',
		facebook: 'Facebook'
	}
	var validProx = [10, 25, 50, 100, 500];	
	var geoFacets = {
		d_10: {val: 10, count: 0},
		d_25: {val: 25, count: 0},
		d_50: {val: 50, count: 0},
		d_100: {val: 100, count: 0},
		d_500: {val: 500, count: 0}
	}
	var locationCache = {};
	
	function validateFilters(filters) {
        var validFilters = [];
        
        validFilters = _.filter(filters, function(filter) {
            return _.contains(validTypes, filter.name);
        });
		
		_.each(validFilters, function(filter) {
			filter.text = propText[filter.name];
		});
        
        return validFilters;
    }
	
	function parseUrlQuery(query) {
        var ret = {
            search: '',
            filters: []
        };
        
        if (query.q) {
            ret.search = query.q;
        }
        
        if (query.s) {
            ret.sort = validSort.indexOf(query.s) > -1 ? query.s : undefined;
        }
		
		if (query.d) {
			var distance = parseInt(query.d);
			if (validProx.indexOf(distance) > -1) {
				ret.geo = {
					distance: distance
				}
			}
		}
		
		if (query.loc) {
			if (/^(\-?\d+(\.\d+)?),(\-?\d+(\.\d+)?)$/.test(query.loc)) {
				var coords = query.loc.split(',');
				if (!ret.geo) ret.geo = {};
				ret.geo.latitude = coords[0];
				ret.geo.longitude = coords[1];
			}
		}
        
        var i = 0;
        while (query['f_' + i]) {
            var fString = query['f_' + i].split(/[\:\|]+/);
            if (fString.length > 1) {
                var name = fString.shift();
                ret.filters.push({name: name, fields: fString});
            }
            i++;
        }
        
        ret.filters = validateFilters(ret.filters);
        
        return ret;
    }
    
    function getQueryString(opts) {
        var qString = '?';
        
        if (opts.query && opts.query !== '') {
            qString += 'q=' + opts.query;
        }
        
        if (opts.sort) {
            qString += (qString.length > 1 ? '&' : '') + 's=' + opts.sort;
        }
		
		if (opts.geo) {
			if (opts.geo.distance) {
				qString += (qString.length > 1 ? '&' : '') + 'd=' + opts.geo.distance;
			}
			
			if (opts.locSet) {
				qString += (qString.length > 1 ? '&' : '') + 'loc=' + opts.geo.latitude + ',' + opts.geo.longitude;
			}
		}
        
        if (opts.filter) {
            for (var i = 0; i < opts.filter.length; i++) {
                qString += (qString.length > 1 ? '&' : '') + 'f_' + i + '=' + opts.filter[i].name + ':'
                for (var j = 0; j < opts.filter[i].fields.length; j++) {
                    qString += (j > 0 ? '|' : '') + opts.filter[i].fields[j];
                }
            }
        }
        
        return qString;
    }
	
	function buildQuery(opts) {
		if (!opts.query) opts.query = '';
        
        var reqParam = {
            query: opts.query,
            sort: opts.sort
        };
		
        if (opts.start) {
            reqParam.start = opts.start;
        }
        
        if (opts.limit) {
            reqParam.limit = opts.limit;
        }
        
        if (opts.filter && opts.filter.length) {
            reqParam.filter = opts.filter;
        }
        
        if (opts.geo) {
            reqParam.geo = opts.geo;
			reqParam.geo.filter = typeof(opts.geo.distance) !== 'undefined';
        }
			
		return reqParam;
	}
    
    function queryAll(opts, callback) {
        var urlString = '/query/users';
        var reqParam = buildQuery(opts);
        
        APIService.Post(urlString, reqParam, function(success, data) {
            if (success) {
                var response = parseResponse(data);
                
                if (response.error) {
                    return callback(false, response.error);
                }
                
                return callback(true, response);
            } else {
                return callback(false, data);
            }
        });
    }
	
	function parseResponse(data) {
        var response = {};
        
        if (data.responseHeader.status !== 0) {
            return {
                error: 'Error performing search: ' + data.responseHeader.status
            }
        }
        
        response = {
			results: data.response.docs,
			start: data.response.start,
			total: data.response.numFound,
			facets: parseFacets(data.facets)
		};
        
        return response;
    }
    
    function parseFacets(facets) {
		var statFilters = {
            facebook: {text: 'Facebook', prop: 'facebook', filters: []},
            pdga: {text: 'PDGA', prop: 'pdga', filters: []}
        }
		
        for (var facet in facets) {
			if (geoFacets[facet]) {
				geoFacets[facet].count = facets[facet].count;
			} else if (statFilters[facet]) {
                statFilters[facet].filters = facets[facet].buckets;
            }
        }
        
        return {
			statFilters: statFilters,
            geoFacets: geoFacets
        };
    }
	
	return {
		queryAll: queryAll,
		getQueryString: getQueryString,
		parseUrlQuery: parseUrlQuery
	}
}])

.factory('QueryService', ['_', 'APIService', function(_, APIService) {
    
    var valueRangeConfig = {
        start: 0,
        end: 40,
        gap: 10
    };
    
    var validValueRange = [];
	var validSort = ['rel', 'new', 'alpha', 'createDate', 'modDate'];
	var validMode = ['all-market','sale','trade','all'];
	var validTypes = ['brand', 'name', 'type', 'tag', 'material', 'color', 'weight', 'condition', 'speed', 'glide', 'turn', 'fade', 'value'];
	var propText = {
		brand: 'Brand',
		name: 'Name',
		type: 'Type',
		tag: 'Tags',
		material: 'Material',
		color: 'Color',
		weight: 'Weight',
		condition: 'Condition',
		speed: 'Speed',
		glide: 'Glide',
		turn: 'Turn',
		fade: 'Fade',
		value: 'Value'
	}
    
    for (var i = valueRangeConfig.start; i <= valueRangeConfig.end - valueRangeConfig.gap; i += valueRangeConfig.gap) {
        if (i >= valueRangeConfig.end - valueRangeConfig.gap) {
            validValueRange.push('[' + i + ' TO *]');
        } else {
            validValueRange.push('[' + i + ' TO ' + (i + valueRangeConfig.gap) + ']');
        }
    }
	
	function tradeActive(mode) {
		return mode && mode == 'trade' || mode == 'all-market';
	}
	
	function saleActive(mode) {
		return mode && mode == 'sale' || mode == 'all-market';
	}
	
	function marketActive(mode) {
		return mode && mode != 'all';
	}
	
	function validateFilters(filters, mode) {
        
        var validFilters = [];
        
        validFilters = _.filter(filters, function(filter) {
            return _.contains(validTypes, filter.name);
        });
        
        _.each(validFilters, function(filter) {
            filter.text = propText[filter.name];
        });
        
        var valueFilter = _.findWhere(validFilters, {name: 'value'});
        if (valueFilter) {
            if (!marketActive(mode)) {
                validFilters = _.without(validFilters, valueFilter);
            } else {
                var i = valueFilter.fields.length;
                while (i >= 0) {
                    if (isCustomRange(valueFilter.fields[i]) && valueFilter.fields.length > 1) {
                        valueFilter.fields.splice(i, 1);
                    }
					i--;
                }
            }
        }
        
        return validFilters;
    }
	
    function parseUrlQuery(query) {
        var ret = {
            search: '',
            filters: []
        };
        
        if (query.q) {
            ret.search = query.q;
        }
        
        if (query.s) {
            ret.sort = validSort.indexOf(query.s) > -1 ? query.s : undefined;
        }
		
		if (query.v) {
			ret.visible = query.v === 'true' ? true : (query.v === 'false' ? false : undefined);
		}
        
        var i = 0;
        while (query['f_' + i]) {
            var fString = query['f_' + i].split(/[\:\|]+/);
            if (fString.length > 1) {
                var name = fString.shift();
                ret.filters.push({name: name, fields: fString});
            }
            i++;
        }
		
		if (query.mode && query.mode.length) {
			ret.mode = validMode.indexOf(query.mode) > -1 ? query.mode : 'all';
		}
        
        ret.filters = validateFilters(ret.filters, ret.mode);
        
        return ret;
    }
    
    function getQueryString(opts) {
        var qString = '?';
        
        if (opts.query && opts.query !== '') {
            qString += 'q=' + encodeURIComponent(opts.query);
        }
        
        if (opts.sort) {
            qString += (qString.length > 1 ? '&' : '') + 's=' + encodeURIComponent(opts.sort);
        }
		
		if (opts.marketplace) {
			var mode = opts.marketplace.forSale ? (opts.marketplace.forTrade ? 'all-market' : 'sale') : (opts.marketplace.forTrade ? 'trade' : 'all');
            qString += (qString.length > 1 ? '&' : '') + 'mode=' + mode;
		}
		
		if (typeof(opts.visible) !== 'undefined') {
			qString += (qString.length > 1 ? '&' : '') + 'v=' + opts.visible.toString();
		}
        
        if (opts.filter) {
            for (var i = 0; i < opts.filter.length; i++) {
                qString += (qString.length > 1 ? '&' : '') + 'f_' + i + '=' + opts.filter[i].name + ':'
                for (var j = 0; j < opts.filter[i].fields.length; j++) {
                    qString += (j > 0 ? '|' : '') + encodeURIComponent(opts.filter[i].fields[j]);
                }
            }
        }
        
        return qString;
    }
	
	function buildQuery(opts) {
		if (!opts.query) opts.query = '';
        
        var reqParam = {
            query: opts.query,
            sort: opts.sort
        };
        
        if (opts.filter && opts.filter.length) {
            reqParam.filter = opts.filter;
        }
        
        if (opts.start) {
            reqParam.start = opts.start;
        }
        
        if (opts.limit) {
            reqParam.limit = opts.limit;
        }
        
        if (opts.group) {
            reqParam.group = opts.group;
        }
        
        if (opts.valueRange) {
            reqParam.valueRange = valueRangeConfig;
        }
		
		if (opts.marketplace) {
			reqParam.marketplace = opts.marketplace;
		}
		
		reqParam.visible = opts.visible;
			
		return reqParam;
	}
    
    function queryAll(opts, callback) {
        var urlString = '/query/discs';
        var reqParam = buildQuery(opts);
        
        if (opts.userId) {
            urlString = '/query/trunk' + (opts.userId ? '/' + opts.userId : '');
        }
        
        
        APIService.Post(urlString, reqParam, function(success, data) {
            if (success) {
                var response = parseResponse(data);
                
                if (response.error) {
                    return callback(false, response.error);
                }
                
                return callback(true, response);
            } else {
                return callback(false, data);
            }
        });
    }
    
    function queryFacet(opts, callback) {
		var reqParam = buildQuery(opts);
		var urlString = '/query/discs/facet';

		if (opts.facet) {
			reqParam.facet = {
				name: opts.facet.name,
				limit: opts.facet.limit,
				offset: opts.facet.offset,
				query: opts.facet.query
			}
		}
		
		reqParam.userId = opts.userId;
		
        APIService.Post(urlString, reqParam, function(success, data) {
            if (success) {
                var response = parseResponse(data);
                if (response.error) {
                    return callback(false, response.error);
                }
                
                return callback(true, response);
            } else {
                return callback(false, data);
            }
        });
    }
    
    function parseResponse(data) {
        var response = {};
        
        if (data.responseHeader.status !== 0) {
            return {
                error: 'Error performing search: ' + data.responseHeader.status
            }
        }
        
        if (data.grouped) {
            response = {
                results: parseGroups(data.grouped),
                facets: parseFacets(data.facets)
            };
        } else {
            response = {
                results: data.response.docs,
                start: data.response.start,
                total: data.response.numFound,
                facets: parseFacets(data.facets)
            };
        }
        
        return response;
    }
    
    
    // Only extracts first group at this time
    function parseGroups(grouped) {
        var groups = {};
        
        for (var groupField in grouped) {
            
            var fieldGroupings = grouped[groupField].groups;
            
            for (var i = 0; i < fieldGroupings.length; i++) {
                groups[fieldGroupings[i].groupValue] = fieldGroupings[i].doclist.docs;
            }
            break;
        }
        
        return groups;
    }
    
    function isCustomRange(value) {
        return !_.contains(validValueRange, value);
    }
    
    function parseFacets(facets) {
        var dynFilters = {
            brand: {text: 'Brand', prop: 'brand', filters: []},
            name: {text: 'Name', prop: 'name', filters: []},
            type: {text: 'Type', prop: 'type', filters: []},
            tag: {text: 'Tags', prop: 'tag', filters: []},
            material: {text: 'Material', prop: 'material', filters: []},
            color: {text: 'Color', prop: 'color', filters: []},
            weight: {text: 'Weight', prop: 'weight', filters: []},
            condition: {text: 'Condition', prop: 'condition', filters: []},
            speed: {text: 'Speed', prop: 'speed', filters: []},
            glide: {text: 'Glide', prop: 'glide', filters: []},
            turn: {text: 'Turn', prop: 'turn', filters: []},
            fade: {text: 'Fade', prop: 'fade', filters: []},
        }
        
        var statFilters = {
            forSale: {text: 'For Sale', prop: 'forSale', filters: []},
            forTrade: {text: 'For Trade', prop: 'forTrade', filters: []}
        }
        
        var rangeFilters = {
            value: {text: 'Value', prop: 'value', filters: []}
        }
        
        for (var facet in facets) {
            if (dynFilters[facet]) {
                dynFilters[facet].filters = facets[facet].buckets;
            } else if (statFilters[facet]) {
                statFilters[facet].filters = facets[facet].buckets;
            } else if (rangeFilters[facet]) {
                rangeFilters[facet].filters = facets[facet].buckets;
                if (facets[facet].after) {
                    rangeFilters[facet].filters[rangeFilters[facet].filters.length - 1].count += facets[facet].after.count;
                }
            }
        }
        
        return {
            dynFilters: dynFilters,
            statFilters: statFilters,
            rangeFilters: rangeFilters
        };
    }
    
    function getSolrPrimaryImage(disc) {
        if (disc.primaryImage) {
            for (var key in disc) {
                if (/^imageList\.\d+\._id$/.test(key) && disc[key] == disc.primaryImage) {
                    return '/files/' + disc[key.replace('_id', 'thumbnailId')];
                }
            }
        }
        return '/static/img/dz_disc.png';
    }
    
    return {
        parseUrlQuery: parseUrlQuery,
        getQueryString: getQueryString,
        queryAll: queryAll,
        queryFacet: queryFacet,
        isCustomRange: isCustomRange,
        getSolrPrimaryImage: getSolrPrimaryImage
    }
}])

.factory('RedirectService', ['$location', 'AccountService', function($location, AccountService) {
    var redirect;
    
    var setRedirect = function(path) {
        redirect = path;
		$location.path('redirect');
    }
	
    var resolvePath = function(path) {
        if (/^\/trunk(\/)?$/.test(path)) {
            if (AccountService.isLoggedIn()) {
                return 'trunk/' + AccountService.getAccountId();
            }
            
            return 'login';
        }
        
        return '';
    }
    
    var getRedirectPath = function() {
        if (typeof (redirect) === 'undefined') {
            return resolvePath($location.path());
        } else {
            var redPath = redirect;
            setRedirect();
            return redPath;
        }
    }
    
    return {
        getRedirectPath: getRedirectPath,
        setRedirect: setRedirect
    }
}])

.factory('MembershipService', ['APIService', function(APIService) {
	var accountPermissions = {
		'msDelete': 'basic',
		'msVisibility': 'basic',
		'msTag': 'entry',
		'msMarketplace': 'entry',
		'msBump': 'pro',
		'msSelect': 'pro'
	};
	
	var hasPermission = function(msFn, accountType) {
    return true; // NO MOOR ACCOUNTS

		if (!msFn || !accountType) return false;
		
		switch (accountPermissions[msFn]) {
			case 'basic': return true;
			case 'entry': return accountType.toLowerCase() == 'entry' || accountType.toLowerCase() == 'pro';
			case 'pro': return accountType.toLowerCase() == 'pro';
			default: return false;
		}
	}
	
	var getChangeType = function(fromType, toType) {
		switch (fromType.toLowerCase()) {
			case 'basic': {
				switch(toType.toLowerCase()) {
					case 'entry':
					case 'pro': {
						return 'no-profile';
					}
				}
				break;
			}
			case 'entry': {
				switch(toType.toLowerCase()) {
					case 'basic': {
						return 'clear-profile';
					}
					case 'pro': {
						return 'upgrade-profile';
					}
				}
				break;
			}
			case 'pro': {
				switch(toType.toLowerCase()) {
					case 'basic': {
						return 'clear-profile';
					}
					case 'entry': {
						return 'downgrade-profile';
					}
				}
				break;
			}
		}
		
		return undefined;
	}
	
	var getAccountName = function(type) {
		if (!type)
			return 'Freelancer';
		
		switch(type.toLowerCase()) {
			case 'basic': return 'Freelancer';
			case 'entry': return 'Entrepreneur';
			case 'pro': return 'Chief Executive';
			default: return 'Freelancer';
		}
	}
		
	var getAccountCost = function(type) {
		if (!type)
			return '';
		
		switch(type.toLowerCase()) {
			case 'basic': return '0.00';
			case 'entry': return '0.99';
			case 'pro': return '5.99';
		}

		return '';
	}
	
	var createHostedPage = function(type, billing, promo, callback) {
		APIService.PostExt('/membership', '/create', {
			type: type,
			billing: billing,
			promoCode: promo
		}, callback);
	}
	
	var createHostedPageAdj = function(billing, callback) {
		APIService.PostExt('/membership', '/changePayment', {
			billing: billing
		}, callback);
	}
	
	var modifyExisting = function(type, promo, callback) {
		APIService.PostExt('/membership', '/modify', {
			type: type,
			promoCode: promo
		}, callback);
	}
	
	var clearExisting = function(callback) {
		APIService.PostExt('/membership', '/cancel', {}, callback);
	}
	
	var reactivate = function(type, promo, callback) {
		APIService.PostExt('/membership', '/activate', {
			type: type,
			promoCode: promo
		}, callback);
	}
	
	return {
		hasPermission: hasPermission,
		getChangeType: getChangeType,
		getAccountName: getAccountName,
		getAccountCost: getAccountCost,
		createHostedPage: createHostedPage,
		createHostedPageAdj: createHostedPageAdj,
		modifyExisting: modifyExisting,
		clearExisting: clearExisting,
		reactivate: reactivate
	}
}])

.factory('AccountService', ['$rootScope', '$q', '_', '$crypt', 'APIService', 'CacheService', 'LocalStorage', function($rootScope, $q, _, $crypt, APIService, CacheService, LocalStorage) {
  var account, accountId, accountMarket;
	var authToken;
	var registry = [];
	
	var sendNotification = function(msg) {
		for (var i = 0; i < registry.length; i++) {
			if (typeof(registry[i]) !== undefined) {
				registry[i](msg);
			}
		}
	}
	
	var saveMiddleWare = function(callback) {
		return function(success, updated) {
			if (success) {
				account = updated;
				CacheService.pushUser(account);
				sendNotification('AccountUpdated');
				callback(success, account);
			} else {
				callback(success, updated);
			}
		}
	}
	
	var getUA = function() {
		return (navigator.userAgent.split(' ')[0]);
	}
    
  var getAccount = function(reloadCallback) {
		if (reloadCallback && isLoggedIn()) {
			APIService.Get('/account', saveMiddleWare(reloadCallback));
		} else {
			return account;
		}
	}
	
	var clearToken = function() {
		authToken = undefined;
		account = undefined;
		LocalStorage.removeItem('dz-token');
		APIService.setToken(undefined);
	}
	
	var getToken = function() {
		return typeof(authToken !== 'undefined') ? authToken.access_token : undefined;
	}
	
	var setAuth = function(auth) {
		authToken = auth;
		var toStore = $crypt.AES.encrypt(JSON.stringify(auth), getUA());
		LocalStorage.addItem('dz-token', toStore.toString());
		APIService.setToken(getToken());
		sendNotification('AccountLoggedIn');
	}
	
	var doLogout = function(callback) {
		APIService.PostExt('/oauth', '/logout', {}, function(success, result) {
			clearToken();
			sendNotification('AccountLoggedOut');
			if (callback) callback();
		});
	}
	
	var doAccountDelete = function(callback) {
		APIService.Delete('/account', callback);
	}
	
	var doAccountDeleteConfirm = function(authorizationId, callback) {
		APIService.Post('/account/delete', {
			authorizationId: authorizationId
		}, function(success, data) {
			doLogout();
			callback(success, data);
		});
	}
	
	var doAccountConfirm = function(authorizationId, callback) {
		APIService.PostExt('/oauth', '/confirm', {
			authorizationId: authorizationId
		}, function(success, data) {
			if (success) {
				setAuth(data);
				initAccount().then(function(account) {
					callback(true, account);
				}, function() {
					callback(false);
				});
			} else {
				callback(success, data);
			}
		});
	}
	
	var doFacebookUnlink = function(callback) {
		APIService.PostExt('/oauth', '/facebook/unlink', {}, saveMiddleWare(callback));
	}
	
	var doFacebookLink = function(auth, callback) {
		APIService.PostExt('/oauth', '/facebook/link', auth, saveMiddleWare(callback));
	}
	
	var doFacebookLogin = function(auth, callback) {
		APIService.PostExt('/oauth', '/facebook/login', auth, function(success, data) {
			if (success) {
				setAuth(data);
			}
			
			callback(success, data);
		});
	}
	
	var initAccount = function(forceReload) {
		var deffered = $q.defer();
		
		if (typeof(account) !== 'undefined') {
			if (forceReload) {
				getAccount(function(success, account) {
					deffered.resolve(account);
				});
			} else {
				deffered.resolve(account);
			}
			return deffered.promise;
		}
		
		var token = LocalStorage.getItem('dz-token');
		
		if (token != null) {
			try {
				token = $crypt.AES.decrypt(token.toString(), getUA()).toString($crypt.enc.Utf8);
				token = JSON.parse(token);
			} catch (e) { 
				doLogout();
				return undefined;
			}
		
			APIService.Get('/account', function(success, data) {
				if (success) {
					setAuth(token);
					//console.log('Using Token: ' + authToken.access_token);
					account = data;
					CacheService.pushUser(account);
				} else {
					doLogout();
				}

				deffered.resolve(account);
			}, token.access_token);

			return deffered.promise;
		} else {
			deffered.resolve(account);
			return deffered.promise;
		}
	}
	
	var doLogin = function(username, password, callback) {
		APIService.PostExt('/oauth', '/token', {
			username: username,
			password: password,
			grant_type: 'password'
		}, function(success, data) {
			if (success) {
				setAuth(data);
			}
			
			callback(success, data);
		});
	}
	
	var putAccount = function(updates, callback) {
		APIService.Put('/account', updates, saveMiddleWare(callback));
	}
	
	var putAccountImage = function(imageObj, callback) {
		APIService.Post('/account/image', imageObj, saveMiddleWare(callback));
	}
	
	var deleteAccountImage = function(callback) {
		APIService.Delete('/account/image', saveMiddleWare(callback));
	}
	
	var getNotifications = function(callback) {
		return APIService.Get('/account/notifications', callback);
	}
	
	var putNotifications = function(notifications, callback) {
		return APIService.Put('/account/notifications', notifications, callback);
	}
	
	var putVerifications = function(verifications, callback) {
		return APIService.Put('/account/verifications', verifications, saveMiddleWare(callback));
	}
	
	function resetPDGA(callback) {
		APIService.Post('/verify/pdga/reset', undefined, saveMiddleWare(callback));
	}
	
	function verifyPDGA(username, password, callback) {
		APIService.Post('/verify/pdga', {username: username, password: password}, saveMiddleWare(callback));
	}
	
	var updateAccount = function(updated) {
		if (typeof(authToken) !== 'undefined') {
			account = updated;
			CacheService.pushUser(account);
		}
	}
    
    var isLoggedIn = function() {
        return typeof(account) !== 'undefined';
    }
	
	var activatePromo = function(promo, callback) {
		APIService.PostExt('/membership', '/promo', {promoCode: promo}, function(success, request) {
			if (!success)
				return callback(success, request);
			
			getAccount(function(success, newAccount) {
				if (!success)
					return callback(false, {
						promo: request.promo,
						account: account
					});
				
				return callback(true, {
					promo: request.promo,
					account: newAccount
				})
			});
		});
	}
    
	var getAccountId = function() {
		return account ? account._id : undefined;
    }
	
	var getAccountMarket = function(callback) {
		if (!isLoggedIn()) {
			return callback(false, {type: 'Unauthorized', message: 'User not logged in.'});
		}
		
		return APIService.Get('/account/market', callback);
	}
	
	var getAccountImage = function() {
		if (isLoggedIn()) {
			if (typeof(account.image) !== 'undefined') {
				return account.image;
			} else {
				return '/static/img/dz_profile.png';
			}
		}
	}
    
    var hasAccountId = function() {
        return account && account._id;
    }
	
	var compareTo = function(id) {
		return account && account._id == id;
	}
	
	var addListener = function(callback) {
		if (registry.indexOf(callback) == -1) {
			registry.push(callback);
		}
	}
	
	var removeListener = function(callback) {
		var index = registry.indexOf(callback);
		if (index > -1) {
			registry.splice(index, 1);
		}
	}
    
    return {
			isLoggedIn: isLoggedIn,
			hasAccountId: hasAccountId,
			putAccount: putAccount,
			putAccountImage:putAccountImage,
			getNotifications: getNotifications,
			putNotifications: putNotifications,
			putVerifications: putVerifications,
			resetPDGA: resetPDGA,
			verifyPDGA: verifyPDGA,
			deleteAccountImage: deleteAccountImage,
			getAccount: getAccount,
			getAccountId: getAccountId,
			getAccountMarket: getAccountMarket,
			getAccountImage: getAccountImage,
			initAccount: initAccount,
			updateAccount: updateAccount,
			doLogin: doLogin,
			activatePromo: activatePromo,
			doAccountConfirm: doAccountConfirm,
			doAccountDeleteConfirm: doAccountDeleteConfirm,
			doAccountDelete: doAccountDelete,
			doFacebookLogin: doFacebookLogin,
			doFacebookLink: doFacebookLink,
			doFacebookUnlink: doFacebookUnlink,
			doLogout: doLogout,
			compareTo: compareTo,
			getToken: getToken,
			addListener: addListener,
			removeListener: removeListener
    }
    
}])

.factory('CacheService', ['_', 'APIService', function(_, APIService){
  var userCache = [];
	var discCache = [];
	
	function pushDisc(disc) {
		discCache = _.filter(userCache, function(userObj) { return userObj._id != disc._id});
		discCache.push(disc);
	}
	
	function pushUser(user) {
		userCache = _.filter(userCache, function(userObj) { return userObj._id != user._id});
		userCache.push(user);
	}
    
	function getUserByUsername(username, callback) {
		return getUserObjByUsername(username, false, callback);
	}
	
	function getUserObjByUsername(username, forceReload, callback) {
        var user = _.findWhere(userCache, {username: username});
        
        if (user && !forceReload) {
            return callback(true, user);
        } 
        
        APIService.Get('/users/username/' + username, function(success, data) {
            if (success) {
                if (forceReload) userCache = _.filter(userCache, function(user) { return user._id != userId});
                userCache.push(data);
                return callback(true, data);
            } else {
                return callback(false, data);
            }
        });
    }
	
	function reloadUser(userId, callback) {
        return getUserObj(userId, true, callback);
	}
	
    function getUser(userId, callback) {
        return getUserObj(userId, false, callback);
    }
    
    function getUserObj(userId, forceReload, callback) {
        var user = _.findWhere(userCache, {_id: userId});
        
        if (user && !forceReload) {
            return callback(true, user);
        } 
        
        APIService.Get('/users/' + userId, function(success, data) {
            if (success) {
                if (forceReload) userCache = _.filter(userCache, function(user) { return user._id != userId});
                userCache.push(data);
                return callback(true, data);
            } else {
                return callback(false, data);
            }
        });
    }
	
	function reloadDisc(discId, callback) {
        return getDiscObj(discId, true, callback);
	}
	
	function getDisc(discId, callback) {
		return getDiscObj(discId, false, callback);
	}
	
	function getDiscObj(discId, forceReload, callback) {
		var disc = _.findWhere(discCache, {_id: discId});
		
		if (disc && !forceReload) {
            return callback(true, disc);
        }
		
		APIService.Get('/discs/' + discId, function(success, data) {
            if (success) {
                if (forceReload) discCache = _.filter(discCache, function(disc) { return disc._id != discId});
                discCache.push(data);
                return callback(true, data);
            } else {
                return callback(false, data);
            }
        });
	}
    
    return {
    getUser: getUser,
		reloadUser: reloadUser,
		reloadDisc: reloadDisc,
		getUserByUsername: getUserByUsername,
		pushUser: pushUser,
		pushDisc: pushDisc,
		getDisc: getDisc
    }
    
}])

.factory('DiscService', ['$q', 'APIService', 'CacheService', function($q, APIService, CacheService){
	
	var discMiddleWare = function(callback) {
		return function(success, updated) {
			if (success) {
				CacheService.pushDisc(updated);
				callback(success, updated);
			} else {
				callback(success, updated);
			}
		}
	}
	
	function editDisc(disc, callback) {
		return APIService.Put('/discs/' + disc._id, disc, discMiddleWare(callback));
	}
	
	function bumpDisc(discId, callback) {
		return APIService.Put('/discs/' + discId + '/bump', {}, callback);
	}
	
	function getBumpRemaining(discId, callback) {
		return APIService.Get('/discs/' + discId + '/bump', callback);
	}
	
	function createDisc(disc, callback) {
		return APIService.Post('/discs', disc, discMiddleWare(callback));
	}
	
	function deleteDisc(disc, callback) {
		return APIService.Delete('/discs/' + disc._id, callback);
	}
	
	function deleteDiscs(discs, callback) {
		var prom = [];
        discs.forEach(function (disc, i) {
			var defer = $q.defer();
			deleteDisc(disc, function(success, data) {
				if (success) {
					defer.resolve(data);
				} else {
					defer.reject(data);
				}
			});
			prom.push(defer.promise);
        });
		
        $q.all(prom).then(function (results) {
            callback(true, results);
        }, function(error) {
			callback(false, error);
		});
	}
	
	return {
		editDisc: editDisc,
		bumpDisc: bumpDisc,
		getBumpRemaining: getBumpRemaining,
		createDisc: createDisc,
		deleteDisc: deleteDisc,
		deleteDiscs: deleteDiscs
	}
}])

.factory('MessageService', ['$location', 'AccountService', 'APIService', 'SocketUtils', function($location, AccountService, APIService, SocketUtils) {
	var attachments = [];
	var isRegistered = false;
	var registry = [];
	var messageCount;
	
	function sendNotification(msg) {
		for (var i = 0; i < registry.length; i++) {
			if (typeof(registry[i]) !== 'undefined') {
				registry[i](msg);
			}
		}
	}
	
	function setAttachment(type, id) {
		attachments.push({
			type: type,
			id: id
		});
	}
	
	function setAttachments(list) {
		list.forEach(function(item) {
			setAttachment(item.type, item.id);
		})
	}
	
	function getAttachments() {
		return attachments.splice(0, attachments.length);
	}
	
	function reloadUnreadCount() {
		APIService.Get('/threads/messageCount', function(success, count) {
			if (success) {
				messageCount = count.totalUnread;
				sendNotification({messageCount: messageCount});
			}
		});
	}
	
	var handleIncMessage = function(message) {
		var regex = new RegExp('threadId=' + message.threadId);
		if (!regex.test($location.url())) {
			messageCount++;
			sendNotification({messageCount: messageCount});
		}
	}
	
	var addListener = function(callback) {
		if (registry.indexOf(callback) == -1) {
			registry.push(callback);
		}
		
		if (typeof(messageCount) !== 'undefined') {
			sendNotification({messageCount: messageCount});
		}
	}
	
	var removeListener = function(callback) {
		var index = registry.indexOf(callback);
		if (index > -1) {
			registry.splice(index, 1);
		}
	}
	
	AccountService.addListener(function(notification) {
		if (notification == 'AccountLoggedIn' && !isRegistered) {
			SocketUtils.registerForNotification('MessageNotification', handleIncMessage);
			reloadUnreadCount();
			isRegistered = true;
		} else if (notification == 'AccountLoggedOut') {
			SocketUtils.unregisterForNotification('MessageNotification', handleIncMessage);
			isRegistered = false;
		}
	});
	
	if (AccountService.isLoggedIn()) {
		SocketUtils.registerForNotification('MessageNotification', handleIncMessage);
		reloadUnreadCount();
		isRegistered = true;
	}
	
	return {
		TypeDisc: 'd',
		TypeUser: 't',
		setAttachment: setAttachment,
		setAttachments: setAttachments,
		getAttachments: getAttachments,
		reloadUnreadCount: reloadUnreadCount,
		addListener: addListener,
		removeListener: removeListener
	}
}])

// DELETE BELOW THIS POTENTIALLY

.factory('DataService', ['$q', '$rootScope', '_', 'APIService', function($q, $rootScope, _, APIService) {
    var account = {};
    var userPrefs = {};
    var discs = [];
    
    var userCache = [];
    var users = [];
    var userQuery = '';
    
    var pubDiscs = undefined;
    var pubAccount = undefined;
    var publicActive = false;
    var isLoggedIn = false;

    function initialize(callback) {
        var tasks = [];

        var acctReq = $q.defer();
        tasks.push(acctReq.promise);
        APIService.Get('/account', function(success, data) {
            if (success) {
                angular.copy(data, account);
                isLoggedIn = true;
                acctReq.resolve();
            } else {
                acctReq.reject({process:'Error loading account.', error: data});
            }
        });

        var prefsReq = $q.defer();
        tasks.push(prefsReq.promise);
        APIService.Get('/account/preferences', function(success, data) {
            if (success) {
                angular.copy(data, userPrefs);
                prefsReq.resolve();
            } else {
                prefsReq.reject({process:'Error loading preferences.', error: data});
            }
        });

        var discReq = $q.defer();
        tasks.push(discReq.promise);
        APIService.Get('/discs', function(success, data) {
            if (success) {
                angular.copy(data, discs);
                discReq.resolve();
            } else {
                discReq.reject({process:'Error loading discs.', error: data});
            }
        });

        $q.all(tasks).then(function(results) {
            $rootScope.$emit('DZUserPrefsUpdated');
            if (callback) callback(true);
        }, function(err) {
            if (callback) callback(false, err);
        });
    }

    function getPrimaryImage(disc, isThumbnail) {
        if (disc) {
            var image = _.findWhere(disc.imageList, {
                _id: disc.primaryImage
            });
            if (image) {
                return siteUrl + '/files/' + (isThumbnail ? image.thumbnailId : image.fileId);
            }
            else {
                return siteUrl + '/static/logo/logo_small_faded.svg';
            }
        }
    }

    function getColorize(disc) {
        if (disc.type == "Distance Driver") {
            return userPrefs.colorize['distance'];
        }
        else if (disc.type == "Fairway Driver") {
            return userPrefs.colorize['fairway'];
        }
        else if (disc.type == "Mid-range") {
            return userPrefs.colorize['mid'];
        }
        else if (disc.type == "Putt/Approach") {
            return userPrefs.colorize['putter'];
        }
        else if (disc.type == "Mini") {
            return userPrefs.colorize['mini'];
        }
        else {
            return '#FFFFFF';
        }
    }

    function getDisc(id, callback) {
        var disc = _.findWhere(discs, {
            _id: id
        });
        var pubDisc = _.findWhere(pubDiscs, {
            _id: id
        });

        if (typeof(disc) !== 'undefined') {
            return callback(true, {disc: disc, user: account});
        }

        if (typeof(pubDisc) !== 'undefined') {
            APIService.Get('/users/' + pubDisc.userId, function(success, user) {
                if (success) {
                    return callback(true, {disc: pubDisc, user: user});
                }
                else {
                    return callback(false, user);
                }
            });
        }

        APIService.Get('/discs/' + id, function(success, disc) {
            if (success) {
                APIService.Get('/users/' + disc.userId, function(success, user) {
                    if (success) {
                        return callback(true, {disc: disc, user: user});
                    }
                    else {
                        return callback(false, user);
                    }
                });
            }
            else {
                return callback(false, disc);
            }
        });
    }
    
    function getUser(id, callback) {
        var user = _.findWhere(userCache, {
            _id: id
        });

        if (typeof(user) !== 'undefined') {
            return getUserPreview(user, callback);
        }

        APIService.Get('/users/' + id, function(success, user) {
            if (success) {
                userCache = _.uniq(_.union(userCache,  [user]), false, _.property('_id'));
                return getUserPreview(user, callback);
            }
            else {
                return callback(false, user);
            }
        });
    }
    
    function getUserPreview(user, callback) {
        if (typeof(user) === 'undefined') return callback();
        
        APIService.Get('/users/' +user._id + '/preview', function(success, preview) {
            if (success) {
                return callback(true, {user: user, preview: preview});
            } else {
                return callback(false, preview);
            }
        });
    }
    
    function createDisc(disc, callback) {
        APIService.Post('/discs', disc, function(success, data) {
            if (success) {
                discs.push(angular.copy(data));
                return callback(true, data._id);
            } else {
                return callback(false, data);
            }
        });
    }
    
    function updateDisc(disc, callback) {
        APIService.Put('/discs/' + disc._id, disc, function(success, data) {
            if (success) {
                var disc = _.findWhere(discs, {
                    _id: data._id
                });
                copyDisc(disc, data);
                return callback(true, data._id);
            }
            
            callback(false, data);
        });
    }
    
    function deleteDisc(disc, callback) {
        APIService.Delete('/discs/' + disc._id, function(success, data) {
            if (success) {
                var index = _.findIndex(discs, function(disc) {
                    return disc._id == data._id;
                })
                discs.splice(index, 1);
                return callback(true, data._id);
            }
            
            callback(false, data);
        });
    }
    
    function copyDisc(disc, copy) {
        disc.brand = copy.brand;
        disc.name = copy.name;
        disc.type = copy.type;
        disc.material = copy.material;
        disc.weight = copy.weight;
        disc.color = copy.color;
        disc.speed = copy.speed;
        disc.turn = copy.turn;
        disc.glide = copy.bgliderand;
        disc.fade = copy.fade;
        disc.notes = copy.notes;
        disc.condition = copy.condition;
        disc.visible = copy.visible;
        disc.tagList = copy.tagList;
        disc.imageList = copy.imageList;
        disc.primaryImage = copy.primaryImage;
    }

    function getPublicDiscs(userId, callback) {
        if (userId == account._id) {
            callback(true, {discs: discs, user: account});
        }
        else {
            var tasks = [];
            var accReq = $q.defer();
            tasks.push(accReq.promise);
            APIService.Get('/users/' + userId, function(success, data) {
                if (success) {
                    pubAccount = data;
                    accReq.resolve();
                }
                else {
                    pubAccount = undefined;
                    accReq.reject({process: 'Error loading user account.', error: data});
                }
            });

            var discReq = $q.defer();
            tasks.push(discReq.promise);
            APIService.Get('/users/' + userId + '/discs', function(success, data) {
                if (success) {
                    pubDiscs = data;
                    discReq.resolve();
                }
                else {
                    pubDiscs = undefined;
                    discReq.reject({process: 'Error loading user account.', error: data});
                }
            });

            $q.all(tasks).then(function() {
                callback(true, {discs: pubDiscs, user: pubAccount});
            }), function(errorObj) {
                callback(false, errorObj);
            };
        }
    }

    function setPublicState(active) {
        publicActive = active;
    }

    function getActiveDiscList() {
        return publicActive ? pubDiscs : discs;
    }

    function isPublic() {
        return publicActive;
    }
    
    function queryUsers(query) {
        userQuery = query;
        
        if (typeof(query) === 'undefined' || !query.trim().length) {
            users.splice(0, users.length);
            return;
        }
        
        APIService.Get('/users?q=' + query.trim(), function(success, qResults) {
            if (success) {
                if (qResults.query != userQuery) return;
                
                userCache = _.uniq(_.union(userCache,  qResults.results), false, _.property('_id'));
                users.splice(0,users.length);
                qResults.results.forEach(function(v) {users.push(v)}, users);    
            }
        });
    }

    function isAuthenticated() {
        return isLoggedIn;
    }

    return {
        initialize: initialize,
        discs: discs,
        users: users,
        userQuery: userQuery,
        account: account,
        userPrefs: userPrefs,
        getPrimaryImage: getPrimaryImage,
        getColorize: getColorize,
        getDisc: getDisc,
        getPublicDiscs: getPublicDiscs,
        setPublicState: setPublicState,
        updateDisc: updateDisc,
        createDisc: createDisc,
        deleteDisc: deleteDisc,
        getActiveDiscList: getActiveDiscList,
        isPublic: isPublic,
        getUser: getUser,
        queryUsers: queryUsers,
        isAuthenticated: isAuthenticated
    }
}])

.factory('SearchService', ['_', function(_) {
    var searchProps = ['brand', 'name', 'type', 'color', 'weight', 'material', 'tagList'];
    var lastQuery = '';

    function search(query, obj) {
        if (query == '') {
            query = '*';
        }

        for (var i = 0; i < searchProps.length; i++) {
            var propVal = obj[searchProps[i]];

            if (typeof propVal === 'undefined') continue;

            if (_.isArray(propVal)) {
                for (var j = 0; j < propVal.length; j++) {
                    if (doCompare(query, propVal[j])) {
                        return true;
                    }
                }
            }
            else {
                if (doCompare(query, propVal)) {
                    return true;
                }
            }
        }

        return false;
    }

    function doCompare(query, param) {
        try {
            var value = param.toString().toLowerCase();
            return value.indexOf(query.toLowerCase()) >= 0;
        }
        catch (e) {
            return false;
        }

    }

    return {
        lastQuery: lastQuery,
        search: search
    }
}])

.factory('AutoFillService', ['_', 'APIService', 'DataService', function(_, APIService, DataService) {
    var templates = [];
    var initialized = false;

    function initialize(callback) {
        if (initialized) return callback();

        APIService.Get('/templates', function(success, data) {
            if (success) {
                templates = data;
            }

            initialized = true;
            callback();
        })
    }

    function getOptions(prop, val) {
        if (typeof val === 'undefined') {
            return [];
        }

        var queryArr = prop == 'tagList' ? DataService.discs : templates.concat(DataService.discs);
        var properties = getProperties(queryArr, prop);

        var results = _.filter(properties, function(item) {
            var curItem;

            if (typeof item === 'undefined') {
                return false;
            }

            if (_.isNumber(item)) {
                curItem = String(item);
            }
            else {
                curItem = item;
            }
            return curItem.toLowerCase().indexOf(val.toLowerCase()) >= 0;
        });

        return _.sortBy(results, function(item) {
            return item.toLowerCase();
        });
    }

    function getProperties(items, property) {
        var list = [];
        if (items.length && _.isArray(items[0][property])) {
            var arrList = _.pluck(items, property);
            _.each(arrList, function(arr) {
                list = list.concat(arr);
            });
        }
        else {
            list = _.pluck(items, property);
        }

        return _.uniq(list);
    }


    return {
        initialize: initialize,
        getOptions: getOptions
    }
}])

.factory('FilterService', ['$window', '_', 'DataService', function($window, _, DataService) {
    var filterProps = [{
        property: 'brand',
        text: 'Brand',
        filters: []
    }, {
        property: 'name',
        text: 'Name',
        filters: []
    }, {
        property: 'tagList',
        text: 'Tags',
        filters: []
    }, {
        property: 'type',
        text: 'Type',
        filters: []
    }, {
        property: 'material',
        text: 'Material',
        filters: []
    }, {
        property: 'weight',
        text: 'Weight',
        filters: []
    }, {
        property: 'color',
        text: 'Color',
        filters: []
    }, {
        property: 'speed',
        text: 'Speed',
        filters: []
    }, {
        property: 'glide',
        text: 'Glide',
        filters: []
    }, {
        property: 'turn',
        text: 'Turn',
        filters: []
    }, {
        property: 'fade',
        text: 'Fade',
        filters: []
    }, {
        property: 'condition',
        text: 'Condition',
        filters: []
    }];
    var filterOrder = []; // ['brand', 'name']
    var tempArrFilters = undefined;

    function getFilterCount(prop) {
        var filter = _.findWhere(filterProps, {
            property: prop
        });
        if (filter) {
            return filter.count;
        }

        return 0;
    }
    
    function isFilterActive() {
        var sum = _.reduce(filterProps, function(memo, filter){ return memo + filter.filters.length }, 0);
        return sum > 0;
    }

    function getFilterItem(prop) {
        return _.findWhere(filterProps, {
            property: prop
        });
    }

    function getFilterOptions(prop) {
        var discList = DataService.getActiveDiscList();
        var newFilters = [];

        for (var i = 0; i < filterOrder.length; i++) {
            var filterProp = filterOrder[i];
            if (prop == filterProp) {
                break;
            }
            var filterItem = _.findWhere(filterProps, {
                property: filterProp
            });
            newFilters.push(filterItem);
            discList = executeFilter(discList, newFilters);
        }

        return getProperties(prop, discList);
    }

    function clearFilters() {
        _.each(filterProps, function(filterItem) {
            filterItem.filters = [];
        });

        filterOrder = [];
        tempArrFilters = undefined;
    }

    function setOption(prop, option) {
        var filterItem = _.findWhere(filterProps, {
            property: prop
        });
        if (filterItem) {
            filterItem.filters.push(option);
            if (!_.contains(filterOrder, prop)) {
                filterOrder.push(prop);
            }
        }
        tempArrFilters = undefined;
    }

    function clearOption(prop, option) {
        var filterItem = _.findWhere(filterProps, {
            property: prop
        });
        if (filterItem) {
            filterItem.filters = _.without(filterItem.filters, option);
            if (!filterItem.filters.length) {
                filterOrder = _.without(filterOrder, prop);
            }
        }
        tempArrFilters = undefined;
    }

    function isOptionActive(prop, option) {
        var filter = _.findWhere(filterProps, {
            property: prop
        });
        if (filter) {
            return _.contains(filter.filters, option);
        }

        return false;
    }

    function getFilters(filterList) {
        var arrFilters = {};
        if (!filterList) filterList = filterProps;

        _.each(filterProps, function(filter) {
            arrFilters[filter.property] = filter.filters;
        });
        return arrFilters;
    }

    function filterObj(obj) {
        if (!tempArrFilters) tempArrFilters = getFilters();
        for (var property in tempArrFilters) {
            if (tempArrFilters[property].length > 0) {
                if (_.has(obj, property)) {
                    if (_.isArray(obj[property])) {
                        var hasProp = false;
                        _.each(obj[property], function(propVal) {
                            if (_.contains(tempArrFilters[property], String(propVal))) {
                                hasProp = true;
                            }
                        });
                        if (!hasProp) {
                            return false;
                        }
                    }
                    else {
                        if (!(_.contains(tempArrFilters[property], String(obj[property])))) {
                            return false;
                        }
                    }
                }
                else {
                    if (!_.contains(tempArrFilters[property], 'undefined')) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    function executeFilter(arr, filterList) {
        tempArrFilters = getFilters(filterList);
        var results = _.filter(arr, function(obj) {
            return filterObj(obj, tempArrFilters);
        });

        return results;
    }

    function getProperties(prop, arr) {
        var list = [];
        if (arr.length && _.isArray(arr[0][prop])) {
            var arrList = _.pluck(arr, prop);
            _.each(arrList, function(arr) {
                list = list.concat(arr);
            });
        }
        else {
            list = _.pluck(arr, prop);
        }

        return _.uniq(list);
    }

    return {
        filterProps: filterProps,
        getFilters: getFilters,
        getFilterItem: getFilterItem,
        getFilterOptions: getFilterOptions,
        clearFilters: clearFilters,
        setOption: setOption,
        clearOption: clearOption,
        isOptionActive: isOptionActive,
        executeFilter: executeFilter,
        filterObj: filterObj,
        isFilterActive: isFilterActive
    }
}])

.factory('SortService', ['$window', '$rootScope', '_', 'DataService',
    function($window, $rootScope, _, DataService) {
        var sortItems = [{
            property: 'brand',
            text: 'Brand',
            sortOn: true,
            sortAsc: false,
            sortOrder: 0,
            type: 'text'
        }, {
            property: 'name',
            text: 'Name',
            sortOn: true,
            sortAsc: false,
            sortOrder: 1,
            type: 'text'
        }, {
            property: 'type',
            text: 'Type',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'text'
        }, {
            property: 'material',
            text: 'Material',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'text'
        }, {
            property: 'weight',
            text: 'Weight',
            sortOn: false,
            sortAsc: false,
            sortOrder: 1,
            type: 'number'
        }, {
            property: 'color',
            text: 'Color',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'text'
        }, {
            property: 'speed',
            text: 'Speed',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'number'
        }, {
            property: 'glide',
            text: 'Glide',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'number'
        }, {
            property: 'turn',
            text: 'Turn',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'number'
        }, {
            property: 'fade',
            text: 'Fade',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'number'
        }, {
            property: 'condition',
            text: 'Condition',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'number'
        }, {
            property: 'createDate',
            text: 'Create Date',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'date'
        }];

        $rootScope.$on('DZUserPrefsUpdated', function() {
            setUserPrefs();
        });

        function setUserPrefs() {
            _.each(sortItems, function(sortItem) {
                sortItem.sortOn = false;
                sortItem.sortOrder = -1;
            });
            
            _.each(DataService.userPrefs.defaultSort, function(pref) {
                addSortItem(pref.property, pref.sortAsc);
            });
        }

        function addSortItem(prop, asc) {
            var i = _.max(_.pluck(sortItems, 'sortOrder')) + 1;
            var sortItem = _.findWhere(sortItems, {
                property: prop
            });
            if (sortItem) {
                sortItem.sortOn = true;
                sortItem.sortAsc = asc;
                sortItem.sortOrder = i;
            }
        }

        function clearSort(prop) {
            var sortItem = _.findWhere(sortItems, {
                property: prop
            });
            var activeCount = _.where(sortItems, {
                sortOn: true
            }).length;
            if (sortItem && activeCount > 1) {
                var sortOrder = sortItem.sortOrder;
                sortItem.sortOn = false;
                sortItem.sortOrder = -1;

                _.each(sortItems, function(sortItem) {
                    if (sortItem.sortOn) {
                        if (sortItem.sortOrder >= sortOrder) {
                            sortItem.sortOrder -= 1;
                        }
                    }
                });
            }
        }

        function updateSortOrder(prop, fromIndex, toIndex) {
            var updateItem = _.findWhere(sortItems, {
                property: prop
            });
            _.each(sortItems, function(sortItem) {
                if (sortItem.sortOn) {
                    if (sortItem.sortOrder >= toIndex &&
                        sortItem.sortOrder < fromIndex) {
                        sortItem.sortOrder += 1;
                    }
                }
            });

            updateItem.sortOrder = toIndex;
        }

        function getSortString() {
            var sortArray = [];
            var toSort = _.sortBy(_.where(sortItems, {
                sortOn: true
            }), 'sortOrder');
            _.each(toSort, function(sortItem) {
                sortArray.push((sortItem.sortAsc ? '+' : '-') + sortItem.property);
            });
            return sortArray.toString();
        }

        function executeSort(arr) {
            var toSort = _.sortBy(_.where(sortItems, {
                sortOn: true
            }), 'sortOrder');
            if (!toSort.length) {
                return arr;
            }
            return groupAndSort(arr, toSort, 0);
        }

        function groupAndSort(sorted, toSort, i) {
            if (i == toSort.length) {
                sorted = genericSort(toSort[i - 1], sorted);
                return sorted;
            }

            var sorter = toSort[i];

            if (i == 0) {
                sorted = genericSort(sorter, groupAndSort(sorted, toSort, i + 1));
                return sorted;
            }
            else {
                var grouper = toSort[i - 1];
                var grouped = _.groupBy(sorted, function(obj) {
                    return obj[grouper.property];
                });
                var newArray = [];
                _.each(grouped, function(valArray) {
                    valArray = genericSort(sorter, groupAndSort(valArray, toSort, i + 1));
                    newArray = newArray.concat(valArray);
                });
                sorted = newArray;
                return sorted;
            }
        }

        function genericSort(sorter, array) {
            if (sorter.type == 'number') {
                array = _.sortBy(array, function(obj) {
                    return parseInt(obj[sorter.property])
                });
            }
            else if (sorter.type == 'date') {
                array = _.sortBy(array, function(obj) {
                    return new Date(obj[sorter.property])
                });
            }
            else {
                array = _.sortBy(array, function(obj) {
                    return obj[sorter.property] ?
                        obj[sorter.property].toLowerCase() :
                        undefined;
                });
            }

            if (!sorter.sortAsc) {
                array = array.reverse();
            }

            return array;
        }

        return {
            sortItems: sortItems,
            addSortItem: addSortItem,
            updateSortOrder: updateSortOrder,
            clearSort: clearSort,
            getSortString: getSortString,
            executeSort: executeSort,
            setUserPrefs: setUserPrefs
        }
    }
])

.factory('ImageService', function() {

    var detectVerticalSquash = function(img) {
        var alpha, canvas, ctx, data, ey, ih, iw, py, ratio, sy;
        iw = img.naturalWidth;
        ih = img.naturalHeight;
        canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = ih;
        ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        data = ctx.getImageData(0, 0, 1, ih).data;
        sy = 0;
        ey = ih;
        py = ih;
        while (py > sy) {
            alpha = data[(py - 1) * 4 + 3];
            if (alpha === 0) {
                ey = py;
            }
            else {
                sy = py;
            }
            py = (ey + sy) >> 1;
        }
        ratio = py / ih;
        if (ratio === 0) {
            return 1;
        }
        else {
            return ratio;
        }
    };

    var drawImageIOSFix = function(o, ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
        var vertSquashRatio, transX, transY;
        vertSquashRatio = detectVerticalSquash(img);
        dh = dh / vertSquashRatio;

        transX = Math.abs(o) == 90 ? dx + dh / 2 : dx + dw / 2;
        transY = Math.abs(o) == 90 ? dy + dw / 2 : dy + dh / 2;

        ctx.translate(transX, transY);
        ctx.rotate(-1 * o * Math.PI / 180);
        dx = -dw / 2;
        dy = -dh / 2;
        return ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

    };

    var fixImageOrientation = function(file, callback) {

        var fileReader;
        fileReader = new FileReader;
        fileReader.onload = function() {
            var img;
            img = document.createElement('img');
            img.onload = function() {
                var orientation = 0;
                EXIF.getData(img, function() {
                    switch (parseInt(EXIF.getTag(this, "Orientation"))) {
                        case 3:
                            orientation = 180;
                            break;
                        case 6:
                            orientation = -90;
                            break;
                        case 8:
                            orientation = 90;
                            break;
                    }

                    var canvas, ctx, dataURL;
                    var targetWidth, targetHeight;
                    file.width = img.naturalWidth;
                    file.height = img.naturalHeight;

                    targetWidth = file.width;
                    targetHeight = file.height;

                    canvas = document.createElement("canvas");
                    ctx = canvas.getContext("2d");
                    canvas.width =  Math.abs(orientation) == 90 ? targetHeight : targetWidth;
                    canvas.height = Math.abs(orientation) == 90 ? targetWidth : targetHeight;
                    drawImageIOSFix(orientation, ctx, img, 0, 0, img.width, img.height, 0, 0, targetWidth, targetHeight);
                    dataURL = canvas.toDataURL(file.type, 0.6);
                    callback(dataURL);
                });
            }
            img.onerror = callback;
            img.src = fileReader.result;
        };
        fileReader.readAsDataURL(file);
    }

    var dataURItoBlob = function(dataURI) {
        var byteString = atob(dataURI.split(',')[1]);
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], {
            type: 'image/jpeg'
        });
    }

    return {
        getDataUri: fixImageOrientation,
        dataURItoBlob: dataURItoBlob
    }
});
