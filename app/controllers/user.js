var _ = require('underscore');
var async = require('async');
var crypto = require('crypto');
var geolib = require('geolib');
var Error = require('../utils/error');
var User = require('../models/user');
var ArchiveController = require('./archive.js');
var GeoConfig = require('../../config/auth.js').geocode;
var UserConfig = require('../../config/config.js').user.preferences;
var CryptoConfig = require('../../config/auth.js').crypto;
var FileUtil = require('../utils/file.js');
var Socket = require('../../config/socket.js');

var geocoder = require("node-geocoder")('google', 'https', {apiKey : GeoConfig.apiKey, formatter: null});

module.exports = {
	query: query,
	queryUsers: queryUsers,
	createUserInternal: createUserInternal,
	createUser: createUser,
	getUser: getUser,
	getActiveUser: getActiveUser,
    checkPassword: checkPassword,
    checkUsername: checkUsername,
    getAccount: getAccount,
    getPreferences: getPreferences,
    updateAccount: updateAccount,
    restorePreferences: restorePreferences,
    updatePreferences: updatePreferences,
    resetPassword: resetPassword,
    tryResetPassword: tryResetPassword,
    deleteUser: deleteUser,
    deleteUserImage: deleteUserImage,
    postUserImage: postUserImage,
    getUserFromHash: getUserFromHash,
    
    /* Admin Functions */
    getAllUsers: getAllUsers,
    getUsersByArea: getUsersByArea
}

function query(field, q, callback) {
	User.find().where(field, new RegExp('^' + q + '$', 'i')).exec(function(err, users) {
		if (err) 
			return callback(Error.createError(err, Error.internalError));
			
		return callback(null, users);
	})
}

function queryUsers(query, callback) {
	query = query.trim();
	if (!query.length) return callback(null, {query: query, results: []});
	
	var regExp = new RegExp(query, 'i');
	
	if (query.indexOf(' ') >= 0) { // name query
		var nameQuery = query.split(' ');
		
		if (nameQuery.length == 2) {
			User.find({ $and : [ 
							{$or: [
								{$and : [
									{'local.firstName': new RegExp(nameQuery[0], 'i')}, 
									{'local.lastName': new RegExp(nameQuery[1], 'i')},
								]},
								{'local.firstName': regExp},
								{'local.lastName': regExp}
							]},
						{'local.active': true}]}).limit(50).exec(
				function(err, users) {
					if (err) 
						return callback(Error.createError(err, Error.internalError));
					
					var userInfoArr = [];
					_.each(users, function(user) {
						userInfoArr.push(user.accountToString());
					});
					
					userInfoArr.sort(function(x,y) {
						return x.firstName.toLowerCase() > y.firstName.toLowerCase();
					});
					
					return callback(null, {query: query, results: userInfoArr});
				});
		} else if (nameQuery.length == 3) {
			User.find({ $and : [ {$or : [
									{$and : [
											{'local.firstName': new RegExp(nameQuery[0], 'i')},
											{'local.lastName': new RegExp(nameQuery[1] + ' ' + nameQuery[2], 'i')}
										]},
									{$and : [
											{'local.firstName': new RegExp(nameQuery[0] + ' ' + nameQuery[1], 'i')},
											{'local.lastName': new RegExp( nameQuery[2], 'i')}
										]}
								]},
						{'local.active': true}]}).limit(50).exec(
				function(err, users) {
					if (err) 
						return callback(Error.createError(err, Error.internalError));
					
					var userInfoArr = [];
					_.each(users, function(user) {
						userInfoArr.push(user.accountToString());
					});
					
					userInfoArr.sort(function(x,y) {
						return x.firstName.toLowerCase() > y.firstName.toLowerCase();
					});
					
					return callback(null, {query: query, results: userInfoArr});
				});
		} else if (nameQuery.length == 4) {
			User.find({ $and : [ {$and : [
									{'local.firstName': new RegExp(nameQuery[0] + ' ' + nameQuery[1], 'i')},
									{'local.lastName': new RegExp(nameQuery[2] + ' ' + nameQuery[3], 'i')}
								]},
						{'local.active': true}]}).limit(50).exec(
				function(err, users) {
					if (err) 
						return callback(Error.createError(err, Error.internalError));
					
					var userInfoArr = [];
					_.each(users, function(user) {
						userInfoArr.push(user.accountToString());
					});
					
					userInfoArr.sort(function(x,y) {
						return x.firstName.toLowerCase() > y.firstName.toLowerCase();
					});
					
					return callback(null, {query: query, results: userInfoArr});
				});
		} else {
			return callback(null, {query: query, results: []});
		}
	} else {
		User.find({$and: [{'local.active': true},
					{$or:[ {'local.username': regExp}, 
						{'local.firstName': regExp}, 
						{'local.lastName': regExp} ]}
					]}).limit(50).exec( 
			function(err, users) {
				if (err) 
					return callback(Error.createError(err, Error.internalError));
				
				var userInfoArr = [];
				_.each(users, function(user) {
					userInfoArr.push(user.accountToString());
				});
				
				userInfoArr.sort(function(x,y) {
					var xVal = '';
					var yVal = '';
					
					if (regExp.test(x.username)) {
						xVal = 'a:' + x.username.toLowerCase();
					} else if  (regExp.test(x.firstName)) {
						xVal = 'b:' + x.firstName.toLowerCase();
					} else if  (regExp.test(x.lastName)) {
						xVal = 'c:' + x.lastName.toLowerCase();
					}
					
					if (regExp.test(y.username)) {
						yVal = 'a:' + y.username.toLowerCase();
					} else if  (regExp.test(y.firstName)) {
						yVal = 'b:' + y.firstName.toLowerCase();
					} else if  (regExp.test(y.lastName)) {
						yVal = 'c:' + y.lastName.toLowerCase();
					}
					
					return xVal > yVal;
				});
				
				return callback(null, {query: query, results: userInfoArr});
		});
	}
}

function createUserInternal(info, callback) {
	createUser(info, function(err, user) {
		if (err)
			return callback(err);
		
		user.local.active = true;
		user.save(function(err) {
			if (err)
				return callback(Error.createError(err, Error.internalError));
			
			return callback(null, user);
		});
	});
}

function createUser(info, callback) {
	if (!info.email)
		return callback(Error.createError('A valid email is required to create an account.', Error.invalidDataError));
	
	if (!info.username || !checkUsername(info.username))
		return callback(Error.createError('A valid username is required to create an account.', Error.invalidDataError));
		
	if (!checkPassword(info.password)) 
		return callback(Error.createError('A valid password is required to create an account.', Error.invalidDataError));
		
	if (info.firstName && !checkName(info.firstName))
		return callback(Error.createError('First name cannot contain more than one space.', Error.invalidDataError));
		
	if (info.lastName && !checkName(info.lastName))
		return callback(Error.createError('Last name cannot contain more than one space.', Error.invalidDataError));
	
	async.series([
		function(cb) {
			query('local.email', info.email, function(err, users) {
				if (err)
					return cb(Error.createError(err, Error.internalError));
				
				if (users && users.length) {
					return cb(Error.createError('A user with that email already exists.', Error.invalidDataError));
				}
				
				cb();
			});
		},
		function(cb) {
			query('local.username', info.username, function(err, users) {
				if (err)
					return cb(Error.createError(err, Error.internalError));
				
				if (users && users.length) {
					return cb(Error.createError('A user with that username already exists.', Error.invalidDataError));
				}
				
				cb();
			});
		},
		function(cb) {
			geocoder.reverse({lat:info.locLat, lon:info.locLng}, function(err, res) {
				if (err)
					return cb(Error.createError(err, Error.internalError));
				
				if (!res || !res.length)
					return cb(Error.createError('Unable to locate zip code.', Error.invalidDataError));
				
				var loc = res[0];
				info.location = {
					lat : loc.latitude,
				    lng : loc.longitude,
				    city : loc.city,
				    state : loc.administrativeLevels.level1long,
				    stateAcr : loc.administrativeLevels.level1short,
				    country : loc.country,
				    countryCode : loc.countryCode,
				    zipcode: loc.zipcode
				};
			    
				return cb();
			});
		}
	], function(err, results) {
		if (err)
			return callback(err);
			
		var user = new User({
			local: {
				email: info.email,
				password: info.password,
				username: info.username,
				firstName: info.firstName,
				lastName: info.lastName,
				pdgaNumber: info.pdgaNumber,
				passcode: info.passcode,
				location: info.location
			}
		});
		
		user.local.password = user.generateHash(info.password);
		
		user.save(function(err) {
			if (err)
				return callback(Error.createError(err, Error.internalError));
			
			return callback(null, user);
		});
	})
}

function getUser(userId, callback) {
	User.findOne({_id: userId}, function(err, user) {
       if (err) 
			return callback(Error.createError(err, Error.internalError));
			
		if (!user) return callback(Error.createError('Unknown user identifier.', Error.objectNotFoundError));
		
		return callback(null, user);	
	});
}

function getActiveUser(userId, callback) {
	getUser(userId, function(err, user) {
		if (err)
			return callback(err);
		
		if (!user.local.active)
			return callback(Error.createError('Unknown user identifier.', Error.invalidDataError));
		
		return callback(null, user);
	});
}

function getAccount(userId, callback) {
	getActiveUser(userId, function(err, user) {
       if (err) 
			return callback(err);
		
		return callback(null, user.accountToString());
    });
}

function getPreferences(userId, callback) {
	getActiveUser(userId, function(err, user) {
       if (err) 
			return callback(err);
		
		return callback(null, user.preferences);
    });
}

function restorePreferences(userId, callback) {
	getActiveUser(userId, function(err, user) {
       if (err) 
			return callback(err);
		
	   	user.preferences = UserConfig;
	   	
	   	user.save(function(err) {
		    if (err)
    			return callback(Error.createError(err, Error.internalError));
    		else
    			return callback(null, user.preferences);
		});
    });
}

function updatePreferences(userId, prefs, callback) {
	getActiveUser(userId, function(err, user) {
       if (err) 
			return callback(err);
		
		if (typeof prefs.notifications !== 'undefined') {
			var notifications = prefs.notifications;
			
			if (typeof notifications.newMessage !== 'undefined' && validatePreference('notifications.newMessage', notifications.newMessage)) {
				user.preferences.notifications.newMessage = notifications.newMessage;
			}
		}
		
		if (typeof prefs.colorize !== 'undefined' && validatePreference('colorize', prefs.colorize)) {
		    user.preferences.colorize = prefs.colorize;
		}
		
		if (typeof prefs.colorizeVisibility !== 'undefined' && validatePreference('colorizeVisibility', prefs.colorizeVisibility)) {
		    user.preferences.colorizeVisibility = prefs.colorizeVisibility;
		} 
		
		if (typeof prefs.galleryCount !== 'undefined' && validatePreference('galleryCount', prefs.galleryCount)) {
		    user.preferences.galleryCount = prefs.galleryCount;
		}
		
		if (typeof prefs.defaultView !== 'undefined' && validatePreference('defaultView', prefs.defaultView)) {
		    user.preferences.defaultView = prefs.defaultView;
		}
		
		if (typeof prefs.defaultSort !== 'undefined' && validatePreference('defaultSort', prefs.defaultSort)) {
		    user.preferences.defaultSort = prefs.defaultSort;
		}
		
		if (typeof prefs.displayCount !== 'undefined' && validatePreference('displayCount', prefs.displayCount)) {
		    user.preferences.displayCount = prefs.displayCount;
		}
		
		if (typeof prefs.showTemplatePicker !== 'undefined' && validatePreference('showTemplatePicker', prefs.showTemplatePicker)) {
		    user.preferences.showTemplatePicker = prefs.showTemplatePicker;
		}
		
		user.save(function(err) {
		    if (err)
    			return callback(Error.createError(err, Error.internalError));
    		else
    			return callback(null, user.preferences);
		});
    });
}

function updateAccount(userId, account, callback) {
	getActiveUser(userId, function(err, user) {
       if (err) 
			return callback(err);
		
		if (typeof account.firstName !== 'undefined' && checkName(account.firstName)) {
			user.local.firstName = account.firstName;
		}
		
		if (typeof account.lastName !== 'undefined' && checkName(account.lastName)) {
			user.local.lastName = account.lastName;
		}
		
		if (typeof account.pdgaNumber !== 'undefined') {
			user.local.pdgaNumber = account.pdgaNumber;
		}
		
		async.series([
			function(cb) {
				if (typeof account.username !== 'undefined') {
					if (account.username == user.local.username) {
						return cb();
					}
					if (!checkUsername(account.username))
						return cb(Error.createError('The username does not meet the required criteria.', Error.invalidDataError));
					
					query('local.username', account.username, function(err, users) {
			            if (err || users.length > 0) {
			                cb(Error.createError('The username already exists.', Error.invalidDataError));
			            } else {
							user.local.username = account.username;
							cb();
			            }
					});
				} else {
					cb();
				}
			},
			function(cb) {
				if (typeof account.locLat !== 'undefined' && typeof account.locLng !== 'undefined') {
					geocoder.reverse({lat:account.locLat, lon:account.locLng}, function(err, res) {
						if (err)
							return cb(Error.createError(err, Error.internalError));
						
						if (!res || !res.length)
							return cb(Error.createError('Unable to locate zip code.', Error.invalidDataError));
						
						var loc = res[0];
						user.local.location = {
							zipcode: loc.zipcode,
							lat : loc.latitude,
						    lng : loc.longitude,
						    city : loc.city,
						    state : loc.administrativeLevels.level1long,
						    stateAcr : loc.administrativeLevels.level1short,
						    country : loc.country,
						    countryCode : loc.countryCode
						};
					    
						return cb();
					});
				} else return cb();
			
			}],
			function(err) {
				if (err) {
		    		return callback(err);
				}
				
				user.save(function(err) {
				    if (err) {
		    			return callback(Error.createError(err, Error.internalError));
				    } else {
		    			return callback(null, user.accountToString());
				    }
				});	
			});
    });
}

function resetPassword(userId, password, callback) {
	getActiveUser(userId, function(err, user) {
       if (err) 
			return callback(err);
		
	   	 if (!password || !checkPassword(password)) {
	        
			return callback(Error.createError('Password must be 6 or more characters.',
			    Error.invalidDataError));
	    }
	    
	    user.local.password = user.generateHash(password);
        user.save(function(err){
            if (err)
                return callback(err);
            
            Socket.sendCallback(user._id, 'ResetPassword', 'Your password has been successfully changed.');
            
            callback(null, user);
        });
    });
}

function tryResetPassword(userId, currentPw, newPw, callback) {
	getActiveUser(userId, function(err, user) {
       if (err) 
			return callback(err);
		
	   	if (!user.validPassword(currentPw))
        	return callback(Error.createError('The current password is incorrect.', Error.invalidDataError));
        	
        if (user.validPassword(newPw))
        	return callback(Error.createError('The new password must differ from your previous one.', Error.invalidDataError));
        	
        return resetPassword(userId, newPw, callback);
    });
}

function deleteUser(userId, gfs, callback) {
	deleteUserImage(userId, gfs, function(err, user) {
		if (err)
			return callback(err);
		
		getUser(userId, function(err, user) {
			if (err)
				return callback(Error.createError(err, Error.internalError));
				
			ArchiveController.archiveUser(user);
			User.remove({_id: userId}, callback);
		});
	});
}

function validatePreference(preference, value) {
	var displayCount = ['20', '40', '60', '80', '100', 'All']
	var colorKey = ['mini', 'distance', 'fairway', 'mid', 'putter'];
	var sortProp = ['name', 'brand', 'tagList', 'type', 'material', 'weight', 'color', 'speed', 'glide', 'turn', 'fade', 'condition', 'createDate'];
	var views = ['gallery', 'inventory', 'statistics'];
	var enables = [true, false];
	
	if (preference == 'displayCount') {
		return _.contains(displayCount, value);
	}
	
	if (preference == 'colorize') {
		var failed = _.find(_.keys(value), function(key) {
			return 	!_.contains(colorKey, key) || !/^(rgb\(\d{1,3}, ?\d{1,3}, ?\d{1,3}\)|#\d{6})$/.test(value[key]);
		});
		
		return (typeof failed === 'undefined');
	}
	
	if (preference == 'notifications.newMessage') {
		return _.contains(enables, value);
	}
	
	if (preference == 'colorizeVisibility') {
		return _.contains(enables, value);
	}
	
	if (preference == 'showTemplatePicker') {
		return _.contains(enables, value);
	}
	
	if (preference == 'defaultSort') {
		var failed = _.find(value, function(sort) {
			return !_.contains(sortProp, sort.property) || !_.isBoolean(sort.sortAsc);
		});
		
		return (value.length > 0 && typeof failed === 'undefined');
	}
	
	if (preference == 'defaultView') {
		return _.contains(views, value);
	}
	
	if (preference == 'galleryCount') {
		var count = parseInt(value);
		if (!_.isNaN(count)) {
			return count >= 2 && count <= 12;
		}
	}
	
	return false;
}

function deleteUserImage(userId, gfs, callback) {
	getUser(userId, function(err, user) {
       if (err) 
			return callback(err);
		
	   	if (typeof(user.local.image) !== 'undefined') {
	   		FileUtil.deleteImage(user.local.image, gfs, function() {
	   			user.local.image = undefined;
	   			user.save(function(err) {
					if (err)
						return callback(Error.createError(err, Error.internalError));
					
					callback(null, user.accountToString());
	   			});
	   		});
	   	} else {
	   		callback(null, user.accountToString());
	   	}
    });
}

function postUserImage(userId, fileId, gfs, callback) {
	getActiveUser(userId, function(err, user) {
       if (err) 
			return callback(err);
		
	   	async.series([
	   		function(cb) {
	   			if (typeof(user.local.image) !== 'undefined') {
			   		FileUtil.deleteImage(user.local.image, gfs, cb);
			   	} else cb();
	   		}
	   	], function(err, results) {
	   		user.local.image = fileId;
		   	user.save(function(err) {
				if (err)
					return callback(Error.createError(err, Error.internalError));
					
				return callback(null, user.accountToString());
		   	});
	   	});
    });
}

function getUserFromHash(hashId, callback) {
	var decipher = crypto.createDecipher(CryptoConfig.algorithm, CryptoConfig.password);
	var dec = decipher.update(hashId,'hex','utf8');
	dec += decipher.final('utf8');
	
	getUser(dec, function(err, user) {
		if (err) {
			return callback(err);
		}
		
		return callback(null, user);
	});
}

/* Admin Functions */
function getUsers(callback) {
	User.find({}, function(err, users) {
		if (err)
            return callback(Error.createError(err, Error.internalError));
           
        return callback(null, users);
	});
}

function getAllUsers(params, callback) {
    var filters = [];
    
    if (!params.sort.length) {
        params.sort.push(['username', 1])
    }
    
    _.each(_.keys(params.filter), function(key) {
        var filter = {};
        filter[key] = new RegExp(params.filter[key], 'i');
        filters.push(filter);
    });
    
    User.count(filters.length ? {$and: filters} : {}, function(err, count) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
            
        if (params.size > count) {
            params.size = count;
        }
        
        if (params.size * (params.page - 1) > count) {
            params.page = Math.floor(count / params.size) + 1;
        }
        
        User
        .find(filters.length ? {$and: filters} : {})
        .sort(params.sort)
        .skip(params.size * (params.page - 1))
        .limit(params.size)
        .exec(function(err, users) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
                
            return callback(null, {
                users: users,
                total: count,
                page: params.page,
                size: params.size
            });
        });
    });

}

function getUsersByArea(zipcode, radius, callback) {
	var center = {};
	var userList = [];
	var radiusMeters = radius * 1609.34;
	
	async.series([
		function(cb) {
			geocoder.geocode(zipcode, function(err, res) {
				if (err)
					return cb(Error.createError(err, Error.internalError));
				
				if (!res || !res.length)
					return cb(Error.createError('Unable to locate zip code.', Error.invalidDataError));
				
				var loc = res[0];
				
				center.latitude = loc.latitude;
				center.longitude = loc.longitude;
			    
				return cb();
			});
		},
		function(cb) {
			getUsers(function(err, users) {
				if (err)
					return cb(err);
				
				async.each(users, function(user, userCb) {
					var loc = user.local.location;
					
					if (!loc.lat || !loc.lng) {
						return userCb();
					}
					
					var result = geolib.isPointInCircle(
					    {latitude: loc.lat, longitude: loc.lng},
					    center,
					    radiusMeters
					);
					
					if (result) {
						userList.push(user);
					}
					
					return userCb();
				}, function(err) {
					cb();
				});
			});
		}
	], function(err, results) {
		if (err)
			return callback(err);
		
		return callback(null, userList);
	});
}

/* Private Functions */
function checkPassword(password) {
	return password.length >= 6;
}

function checkUsername(username) {
	return /^[a-zA-Z0-9\_]{6,15}$/.test(username);
}

function checkName(val) {
	return val.split(' ').length <= 2;
}