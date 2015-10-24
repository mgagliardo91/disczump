var Error = require('../utils/error');
var User = require('../models/user');
var EventController = require('./event.js');
var _ = require('underscore');
var async = require('async');
var UserConfig = require('../../config/config.js').user.preferences;
var FileUtil = require('../utils/file.js');
var Socket = require('../../config/socket.js');
var socketManager = require('../objects/socketCache.js');

module.exports = {
	query: query,
	queryUsers: queryUsers,
	createUser: createUser,
	getUser: getUser,
	getActiveUser: getActiveUser,
	updateActivity: updateActivity,
	updateAccessCount: updateAccessCount,
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
    postUserImage: postUserImage
}

function query(field, q, callback) {
	User.find().where(field, new RegExp('^' + q + '$', 'i')).exec(function(err, users) {
		if (err) 
			return callback(Error.createError(err, Error.internalError));
			
		return callback(null, users);
	})
}

function queryUsers(query, callback) {
	var query = query.trim();
	if (!query.length) return callback(null, {query: query, results: []});
	
	var regExp = new RegExp(query, 'i');
	
	if (query.indexOf(' ') >= 0) { // name query
		var nameQuery = query.split(' ');
		User.find({ $and : [{'local.firstName': new RegExp(nameQuery[0], 'i')}, 
						{'local.lastName': new RegExp(nameQuery[1], 'i')},
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

function getUserInfo(userId, callback) {
	User.findOne({_id: userId}, function(err, user) {
       if (err) 
			return callback(Error.createError(err, Error.internalError));
			
		if (!user) return callback(Error.createError('Unknown user identifier.', Error.objectNotFoundError));
		
		return callback(null, user.accountToString());	
	});
}

function createUser(info, callback) {
	query('local.email', info.email, function(err, users) {
		if (err)
			return callback(Error.createError(err, Error.internalError));
		
		if (users && users.length) {
			return callback(Error.createError('A user with that email already exists.', Error.invalidDataError));
		}
		
		var user = new User({
			local: info
		});
		
		user.local.password = user.generateHash(user.local.password);
		user.local.active = true;
		
		user.save(function(err) {
			if (err)
				return callback(Error.createError(err, Error.internalError));
			
			return callback(null, user);
		});
	});
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

function updateAccessCount(userId, platform) {
	User.findOne({_id: userId}, function(err, user) {
        if (!err && user) {
			user.local.accessCount[platform] += 1;
			user.save();
        }
    });
}

function updateActivity(userId) {
	User.findOne({_id: userId}, function(err, user) {
        if (!err && user) {
			user.local['last_access'] = Date.now();
			user.save();
        }
    });
}

function checkPassword(password) {
	return password.length >= 6;
}

function checkUsername(username) {
	return /^[a-zA-Z0-9\_]{6,15}$/.test(username);
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
		
	   	if (_.has(prefs, 'notifications')) {
			var notifications = prefs.notifications;
			
			if (_.has(notifications, 'newMessage') && validatePreference('notifications.newMessage', notifications.newMessage)) {
				user.preferences.notifications.newMessage = notifications.newMessage;
			}
		}
		
		if (_.has(prefs, 'colorize') && validatePreference('colorize', prefs.colorize)) {
		    user.preferences.colorize = prefs.colorize;
		}
		
		if (_.has(prefs, 'colorizeVisibility') && validatePreference('colorizeVisibility', prefs.colorizeVisibility)) {
		    user.preferences.colorizeVisibility = prefs.colorizeVisibility;
		} 
		
		if (_.has(prefs, 'galleryCount') && validatePreference('galleryCount', prefs.galleryCount)) {
		    user.preferences.galleryCount = prefs.galleryCount;
		}
		
		if (_.has(prefs, 'defaultView') && validatePreference('defaultView', prefs.defaultView)) {
		    user.preferences.defaultView = prefs.defaultView;
		}
		
		if (_.has(prefs, 'defaultSort') && validatePreference('defaultSort', prefs.defaultSort)) {
		    user.preferences.defaultSort = prefs.defaultSort;
		}
		
		if (_.has(prefs, 'displayCount') && validatePreference('displayCount', prefs.displayCount)) {
		    user.preferences.displayCount = prefs.displayCount;
		}
		
		if (_.has(prefs, 'showTemplatePicker') && validatePreference('showTemplatePicker', prefs.showTemplatePicker)) {
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
		
	   	if (_.has(account, 'firstName')) {
			user.local.firstName = account.firstName;
		}
		
		if (_.has(account, 'lastName')) {
			user.local.lastName = account.lastName;
		}
		
		if (_.has(account, 'zipCode') && /^\d{5}$/.test(account.zipCode)) {
			user.local.zipCode = account.zipCode;
		}
		
		if (_.has(account, 'pdgaNumber')) {
			user.local.pdgaNumber = account.pdgaNumber;
		}
		
		async.series([
			function(cb) {
				if (_.has(account, 'username') && checkUsername(account.username)) {
					if (account.username == user.local.username) {
						return cb();
					}
					
					query('local.username', account.username, function(err, users) {
			            if (err || users.length > 0) {
			                cb(Error.createError('The username already exists.', Error.invalidDataError));
			            } else {
							user.local.username = account.username;
							cb();
			            }
					});
				} else {
					cb(Error.createError('The username does not meet the required criteria.', Error.invalidDataError));
				}
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
                
            var socket = socketManager.getSocket(user._id);
                
            if (typeof(socket) !== 'undefined') {
                Socket.sendCallback(socket, 'ResetPassword', 'Your password has been successfully changed.');
            }
            
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
		User.remove({_id: userId}, callback);
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
	getActiveUser(userId, function(err, user) {
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