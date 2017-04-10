var _ = require('underscore');
var async = require('async');
var fs = require('fs');
var crypto = require('crypto');
var geolib = require('geolib');
var fbGraph = require('fbgraph');
var Error = require('../utils/error');
var User = require('../models/user');
var UserInternal = require('../models/userInternal');
var ImageController = require('./imageCache.js');
var ArchiveController = require('./archive.js');
var EventController = require('./event.js');
var CryptoConfig = require('../../config/auth.js').crypto;
var MemberConfig = require('../../config/config.js').membership;
var FileUtil = require('../utils/file.js');
var Socket = require('../utils/socket.js');
var SocketCache = require('../objects/socketCache.js');
var logger = require('../utils/logger.js');
var MembershipTypes = require('../utils/membershipTypes.js');
var Geo = require('../utils/geo.js');

var LocalConfig = require('../../config/localConfig.js');
var Mailer = require('../utils/mailer.js');
var handleConfig = require('../utils/handleConfig.js');


module.exports = {
	query: query,
	createActiveUser: createActiveUser,
	createUser: createUser,
	getUser: getUser,
	getUserInternal: getUserInternal,
	getUserByUsername: getUserByUsername,
	getUserByEmail: getUserByEmail,
	getUserByFacebook: getUserByFacebook,
	getActiveUser: getActiveUser,
    checkPassword: checkPassword,
    checkUsername: checkUsername,
    getAccount: getAccount,
	getMarketCap: getMarketCap,
    updateAccount: updateAccount,
	setAccountProfile: setAccountProfile,
	setAccountProfileImmed: setAccountProfileImmed,
	getAccountNotifications: getAccountNotifications,
	setAccountNotifications: setAccountNotifications,
	setAccountVerifications: setAccountVerifications,
	setPDGA: setPDGA,
	resetPDGA: resetPDGA,
    resetPassword: resetPassword,
    tryResetPassword: tryResetPassword,
    deleteUser: deleteUser,
    deleteUserImage: deleteUserImage,
    postUserImage: postUserImage,
    getUserFromHash: getUserFromHash,
	unsubscribe: unsubscribe,
	linkFacebook: linkFacebook,
	unlinkFacebook: unlinkFacebook,
	addUserEvent: addUserEvent,

	FBConnect: FBConnect,

    /* Admin Functions */
	getTopUsers: getTopUsers,
	getOnlineUsers: getOnlineUsers,
	getRecentlyJoined: getRecentlyJoined,
	getRecentlyActive: getRecentlyActive
}

function isDef(x) {
	return typeof x !== 'undefined';
}

/* Private Functions */
function checkPassword(password) {
	return password.length >= 6;
}

function checkUsername(username) {
	return /^[a-zA-Z0-9_]{6,15}$/.test(username);
}

function checkName(val) {
	return val.trim().length > 0 && val.indexOf('"') == -1;
}

function query(field, q, callback) {
	var query = q.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	User.find().where(field, new RegExp('^' + query + '$', 'i')).exec(function(err, users) {
		if (err)
			return callback(Error.createError(err, Error.internalError));

		return callback(null, users);
	})
}

function addUserEvent(userId, type, message) {

	UserInternal.findOne({userId: userId}, function(err, intUser) {
		if (err) return cb(err);

		if (intUser) {
			intUser.addEvent(type, message);
		} else {
			var user = new UserInternal({
				userId: userId,
			});

			user.save(function(err) {
				if (!err) {
					user.addEvent(type, message);
				}
			});
		}
	});
}

function createActiveUser(info, callback) {
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
	if (!isDef(info.email))
		return callback(Error.createError('A valid email is required to create an account.', Error.invalidDataError));

	if (!isDef(info.username) || !checkUsername(info.username))
		return callback(Error.createError('A valid username is required to create an account.', Error.invalidDataError));

	if (!isDef(info.password) || !checkPassword(info.password))
		return callback(Error.createError('A valid password is required to create an account.', Error.invalidDataError));

	if (!isDef(info.firstName) || !checkName(info.firstName))
		return callback(Error.createError('A valid first name is required to create an account.', Error.invalidDataError));

	if (!isDef(info.lastName) || !checkName(info.lastName))
		return callback(Error.createError('A valid last name is required to create an account.', Error.invalidDataError));

	if (!isDef(info.geoLat) || !isDef(info.geoLng))
		return callback(Error.createError('Geocoordinates (lat/lng) are required to create an account.', Error.invalidDataError));

	async.series([
		function(cb) {
			getUserByEmail(info.email, function(err, user) {
				if (err)
					return cb(Error.createError(err, Error.internalError));

				if (user) {
					return cb(Error.createError('A user with that email already exists.', Error.invalidDataError));
				}

				cb();
			});
		},
		function(cb) {
			getUserByUsername(info.username, function(err, user) {
				if (err)
					return cb(Error.createError(err, Error.internalError));

				if (user) {
					return cb(Error.createError('A user with that username already exists.', Error.invalidDataError));
				}

				cb();
			});
		},
		function(cb) {
			Geo.getReverse(info.geoLat, info.geoLng, function(err, loc) {
				if (err)
					return cb(err);

				if (!loc)
					return cb(Error.createError('Unknown location.', Error.internalError));

				info.location = loc;

				return cb();
			}, ['postal_code']);
		}
	], function(err, results) {
		if (err)
			return callback(err);

		var user = new User({
			local: {
				email: info.email.toLowerCase(),
				password: info.password,
				username: info.username,
				firstName: info.firstName,
				lastName: info.lastName,
				passcode: info.passcode,
				location: info.location
			}
		});

		user.local.password = user.generateHash(info.password);

		user.save(function(err) {
			if (err)
				return callback(Error.createError(err, Error.internalError));

			if (info.facebook && info.facebook.userID && info.facebook.accessToken) {
				linkFacebook(info.facebook.userID, info.facebook.accessToken, user, function(err, user) {
					if (err)
						return callback(err);

					return callback(null, user);
				});
			} else {
				return callback(null, user);
			}
		});
	})
}

function getUserInternal(userId, callback) {
	User.findOne({_id: userId}, function(err, user) {
       if (err)
			return callback(Error.createError(err, Error.internalError));

		return callback(null, user);
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

function getUserByUsername(username, callback) {
	User.findOne({'local.username': username}, function(err, user) {
       if (err)
			return callback(Error.createError(err, Error.internalError));

		return callback(null, user);
	});
}

function getUserByEmail(email, callback) {
	User.findOne({'local.email': email}, function(err, user) {
       if (err)
			return callback(Error.createError(err, Error.internalError));

		return callback(null, user);
	});
}

function getUserByFacebook(facebookId, callback) {
	User.findOne({'facebook.id': facebookId}, function(err, user) {
       if (err)
			return callback(Error.createError(err, Error.internalError));


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
			
		user.updateActivity();

		return callback(null, user);
    });
}

function getMarketCap(userId, callback) {
	getActiveUser(userId, function(err, user) {
       if (err)
			return callback(err);

		return callback(null, user.account.marketCap);
    });
}

function updateAccount(userId, account, callback) {
	getActiveUser(userId, function(err, user) {
       if (err)
			return callback(err);

		if (isDef(account.firstName) && checkName(account.firstName)) {
			user.local.firstName = account.firstName;
		}

		if (isDef(account.lastName) && checkName(account.lastName)) {
			user.local.lastName = account.lastName;
		}

		if (isDef(account.bio)) {
			var bio = account.bio.trim();
			user.local.bio = bio.substring(0, Math.min(bio.length, 600));
		}

		async.series([
			function(cb) {
				if (isDef(account.username)) {
					if (account.username == user.local.username) {
						return cb();
					}

					if (!checkUsername(account.username))
						return cb(Error.createError('The username does not meet the required criteria.', Error.invalidDataError));

					getUserByUsername(account.username, function(err, users) {
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
				logger.info('Checking to update location');
				if (isDef(account.geoLat) && isDef(account.geoLng)) {
					logger.info('Updating location');
					Geo.getReverse(account.geoLat, account.geoLng, function(err, loc) {
						if (err)
							return cb(err);

						if (!loc)
							return cb(Error.createError('Unknown location.', Error.internalError));

						logger.info('Using location', loc);

						user.local.location = loc;

						return cb();
					}, ['postal_code']);
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
		    			return callback(null, user);
				    }
				});
			});
    });
}

function mergeProfile(profile, updates) {
	if (!profile) {
		profile = {};
	}

	for (var key in updates) {
		profile[key] = updates[key];
	}

	profile.lastModified = new Date();
}

function setAccountProfileImmed(userId, profile, callback) {
	getUser(userId, function(err, user) {
		var promos = user.account.profile.promoCodes.length ? user.account.profile.promoCodes.slice(0) : undefined;

		user.account.profile = profile;
		user.account.profile.promoCodes = promos;
		user.account.type = profile.type;
		user.save(function(err) {
			if (err)
				return callback(err);

			addUserEvent(user._id, EventController.Types.AccountReset, 'The user account profile was reset by the system.');
			return callback(null, user);
		});
	});
}

function setAccountProfile(userId, changeRequest, profile, callback) {
	getUser(userId, function(err, user) {
		if (err) {
			logger.error('Error occurred in locating user with id [' + userId + ']', err);
			return callback(err);
		}

		var newType;
		var lastId = user.account.profile.profileId;

		if (changeRequest.toAccount.type) {
			newType = changeRequest.toAccount.type;
		} else {
			newType = user.account.type;
			changeRequest.toAccount = changeRequest.fromAccount;
		}

		switch (user.account.type) {
			case MemberConfig.TypeBasic: {
				switch (newType) {
					case MemberConfig.TypeBasic: {
						mergeProfile(user.account.profile, profile);
						user.account.profile.type = MemberConfig.TypeBasic;
						break;
					}
					case MemberConfig.TypeEntry: {
						user.account.type = MemberConfig.TypeEntry;
						user.account.marketCap = MemberConfig.CapEntry;
						mergeProfile(user.account.profile, profile);
						user.account.profile.type = MemberConfig.TypeEntry;
						break;
					}
					case MemberConfig.TypePro: {
						user.account.type = MemberConfig.TypePro;
						user.account.marketCap = MemberConfig.CapPro;
						mergeProfile(user.account.profile, profile);
						user.account.profile.type = MemberConfig.TypePro;
						break;
					}
				}
				break;
			}
			case MemberConfig.TypeEntry: {
				switch (newType) {
					case MemberConfig.TypeBasic: {
						mergeProfile(user.account.profile, profile);
						user.account.profile.type = MemberConfig.TypeBasic;
						break;
					}
					case MemberConfig.TypeEntry: {
						mergeProfile(user.account.profile, profile);
						user.account.profile.type = MemberConfig.TypeEntry;
						break;
					}
					case MemberConfig.TypePro: {
						user.account.type = MemberConfig.TypePro;
						user.account.marketCap = MemberConfig.CapPro;
						mergeProfile(user.account.profile, profile);
						user.account.profile.type = MemberConfig.TypePro;
						break;
					}
				}
				break;
			}
			case MemberConfig.TypePro: {
				switch (newType) {
					case MemberConfig.TypeBasic: {
						mergeProfile(user.account.profile, profile);
						user.account.profile.type = MemberConfig.TypeBasic;
						break;
					}
					case MemberConfig.TypeEntry: {
						mergeProfile(user.account.profile, profile);
						user.account.profile.type = MemberConfig.TypeEntry;
						break;
					}
					case MemberConfig.TypePro: {
						mergeProfile(user.account.profile, profile);
						user.account.profile.type = MemberConfig.TypePro;
						break;
					}
				}
				break;
			}
		}

		if (typeof(user.account.profile.profileId) !== 'undefined' && lastId !== user.account.profile.profileId) {
			user.account.assocProfiles.push(user.account.profile.profileId);
		}

		user.save(function(err) {
			if (err) {
				logger.error('Error occurred in saving user with id [' + userId + ']', err);
				return callback(Error.createError(err, Error.internalError));
			}

			var eventProf = user.account.profile.profileId ? 'with ID [' + user.account.profile.profileId + '] ' : '';
			addUserEvent(user._id, EventController.Types.AccountTypeChange, 'The user account profile ' + eventProf + 'was altered by the user. From: [' + changeRequest.fromAccount.type + '] To: [' + changeRequest.toAccount.type + ']');

            var email = generateAccountChangedEmail(user, changeRequest.toObject());
			logger.info('Sending email to notify account change to %s', user.local.email);
			Mailer.sendMail(user.local.email, Mailer.TypeAccountChange, email);
			return callback(null, user);
		});
	});
}

function getAccountNotifications(userId, callback) {
	getUser(userId, function(err, user) {
		if (err)
			return callback(err);

		return callback(null, user.account.notifications);
	});
}

function setAccountNotifications(userId, notifications, callback) {
	getUser(userId, function(err, user) {
		if (err)
			return callback(err);

		for (var notName in notifications) {
			if (user.account.notifications.hasOwnProperty(notName) && _.isBoolean(notifications[notName])) {
				user.account.notifications[notName] = notifications[notName];
			}
		}

		user.save(function(err) {
			if (err)
				return callback(Error.createError(err, Error.internalError));

			return callback(null, user.account.notifications);
		});
	});
}

function setAccountVerifications(userId, verifications, callback) {
	getUser(userId, function(err, user) {
		if (err)
			return callback(err);

		if (verifications.hasOwnProperty('facebook') && _.isBoolean(verifications.facebook)) {
			user.account.verifications.facebook = user.facebook.id !== 'undefined' && verifications.facebook;
		}

		user.save(function(err) {
			if (err)
				return callback(Error.createError(err, Error.internalError));

			return callback(null, user);
		});
	});
}

function setPDGA(userId, pdgaNumber, callback) {
	getActiveUser(userId, function(err, user) {
		 if (err)
			return callback(err);

		User.findOne({'local.pdgaNumber': pdgaNumber}, function(err, foundUser) {
		   if (err)
				return callback(Error.createError(err, Error.internalError));

			if (foundUser && foundUser._id != userId)
				return callback(Error.createError('The PDGA Number associated with the account (#' + pdgaNumber + ') is already in use.', Error.invalidDataError));

			user.local.pdgaNumber = pdgaNumber;
			user.account.verifications.pdga = true;
			user.save(function(err) {
				if (err)
					return callback(err);

				addUserEvent(user._id, EventController.Types.AccountPDGAClaim, 'The account has successfully claimed the PDGA number [' + pdgaNumber + '].');

				callback(null, user);
			});
		});
	});
}

function resetPDGA(userId, callback) {
	getActiveUser(userId, function(err, user) {
		 if (err)
			return callback(err);

		user.local.pdgaNumber = undefined;
		user.account.verifications.pdga = false;
		user.save(function(err) {
			if (err)
                return callback(err);

			addUserEvent(user._id, EventController.Types.AccountPDGAReset, 'The account has successfully reset the PDGA verification.');
            callback(null, user);
		});
	});
}

function resetPassword(userId, password, callback) {
	getActiveUser(userId, function(err, user) {
       if (err)
			return callback(err);

	   	 if (!isDef(password) || !checkPassword(password)) {
			return callback(Error.createError('Password must be 6 or more characters.', Error.invalidDataError));
	    }

	    user.local.password = user.generateHash(password);
        user.save(function(err){
            if (err)
                return callback(err);

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

function deleteUserImage(userId, gfs, callback) {
	getUser(userId, function(err, user) {
       if (err)
			return callback(err);

	   	if (isDef(user.local.image)) {
	   		FileUtil.deleteImage(user.local.image, gfs, function() {
	   			user.local.image = undefined;
	   			user.save(function(err) {
					if (err)
						return callback(Error.createError(err, Error.internalError));

					callback(null, user);
	   			});
	   		});
	   	} else {
	   		callback(null, user);
	   	}
    });
}

function postUserImage(userId, imageId, gfs, callback) {
	getActiveUser(userId, function(err, user) {
       if (err)
			return callback(err);

		var newImage;
	   	async.series([
			function(cb) {
				ImageController.getImageCache(imageId, function(err, imageObj) {
					if (err) {
						return cb(err);
					}

					if (!imageObj) {
						return cb(Error.createError('Invalid image file identifier.', Error.objectNotFoundError));
					}

					newImage = imageObj;
					return cb();
				});
			},
	   		function(cb) {
	   			if (isDef(user.local.image)) {
			   		FileUtil.deleteImage(user.local.image, gfs, cb);
			   	} else cb();
	   		}
	   	], function(err, results) {
			if (err)
				return callback(err);

	   		user.local.image = newImage.fileId;
		   	user.save(function(err) {
				if (err)
					return callback(Error.createError(err, Error.internalError));

				return callback(null, user);
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

function unsubscribe(hashId, notification, callback) {
	getUserFromHash(hashId, function(err, user) {
		if (err)
			return callback(err);

		if (user.account.hasOwnProperty(notification)) {
			user.account[notification] = false;

			user.save(function(err) {
				if (err)
					return callback(err);

				callback(null, user);
			});

		} else {
			return callback(null, user);
		}
	});
}

function FBConnect(user, token, callback, fbID) {
	fbGraph.get('me?fields=email,first_name,last_name&access_token=' + token, function(err, data) {
		if (err)
			return callback(Error.createError('Unable to access facebook with the provided access_token.', Error.unauthorizedError));

		if (!user.facebook.fbID) {
			user.facebook = {
				id: fbID
			};
		}

		user.facebook.image = '//graph.facebook.com/' + fbID + '/picture?type=large';
		user.facebook.name = data.first_name + ' ' + data.last_name;
		user.facebook.email = data.email;

		user.save(function(err) {
		   if (err)
				return callback(Error.createError(err, Error.internalError));

			callback(null, user);
		});
	});
}

function linkFacebook(fbID, token, user, callback) {
	if (!fbID)
		return callback(Error.createError('A valid facebook user ID is required to access this route.', Error.unauthorizedError));

	getUserByFacebook(fbID, function(err, qUser) {
		if (err)
			return callback(err);

		if (qUser && qUser._id != user._id)
			return callback(Error.createError('The Facebook account is already linked by another user.', Error.unauthorizedError));

		FBConnect(user, token, function(err, user) {
			if (err)
				return callback(err);

			addUserEvent(user._id, EventController.Types.AccountLink, 'The account has been successfully linked to Facebook.');
			callback(null, user);
		}, fbID);
	});
}

function unlinkFacebook(user, callback) {
	if (!user.local.active)
		return callback(Error.createError('Account not activated.', Error.inactiveError));

	user.facebook.id = undefined;
	user.account.verifications.facebook = false;
	user.save(function(err) {
		if (err)
			return callback(Error.createError(err, Error.internalError));

		addUserEvent(user._id, EventController.Types.AccountUnlink, 'The account has been successfully unlinked from Facebook.');
		return callback(null, user);
	});
}

/* Private Functions */
function generateAccountChangedEmail(user, changeRequest) {
	changeRequest.fromAccount = {
		type: MembershipTypes.getTypeName(changeRequest.fromAccount.type),
		amount: parseFloat(changeRequest.fromAccount.amount).toFixed(2)
	}

	changeRequest.toAccount = {
		type: MembershipTypes.getTypeName(changeRequest.toAccount ? changeRequest.toAccount.type : changeRequest.fromAccount.type),
		amount: changeRequest.toAccount ? parseFloat(changeRequest.toAccount.amount).toFixed(2) : parseFloat(changeRequest.fromAccount.amount).toFixed(2)
	}

	changeRequest.immediateCharge = changeRequest.immediateCharge.toFixed(2);
	var activeAccount = MembershipTypes.getTypeName(user.account.type);

	var html = fs.readFileSync('./private/html/accountChanged.handlebars', 'utf8');
	var template = handleConfig.getMainHandle().compile(html);
	return template({user: user, request: changeRequest, activeAccount: activeAccount,serverURL: LocalConfig.serverURL});
}


/* Admin Functions */
function getUsers(callback) {
	User.find({}, function(err, users) {
		if (err)
            return callback(Error.createError(err, Error.internalError));

        return callback(null, users);
	});
}

function getTopUsers(params, callback) {
    params.limit = params.limit ? parseInt(params.limit) : 10;

    User
    .aggregate([
		{$lookup: {from : 'discs', localField: '_id', foreignField: 'userId', as: 'discItems'}},
		{$project: {username: '$local.username', firstName: '$local.firstName', lastName: '$local.lastName', count: {$size: '$discItems'}}},
        {$sort: {count: -1}},
        {$limit: params.limit || 10}
    ], function(err, users) {
        if (err)
            return callback(Error.createError(err, Error.internalError));

        return callback(null, users);
    });
}

function getOnlineUsers(params, callback) {
    params.limit = params.limit ? parseInt(params.limit) : 40;
	var onlineUserIds = SocketCache.getActiveUserIds();
	var onlineUsers = [];

	async.eachSeries(onlineUserIds, function(userId, cb) {
		if (onlineUsers.length == params.limit) {
			return cb();
		}

		getUser(userId, function(err, user) {
			if (err) {
				return cb(err);
			}

			onlineUsers.push(user.accountToString());
			return cb();
		})
	}, function(err) {
		if (err) {
			return callback(err);
		}

		return callback(null, {data: onlineUsers, skipping: Math.max(0, onlineUserIds.length - params.limit)});
	});
}

function getRecentlyJoined(params, callback) {
    params.limit = params.limit ? parseInt(params.limit) : 10;

    User
    .find({})
    .sort({dateJoined: -1})
    .limit(params.limit)
    .exec(function(err, users) {
        if (err)
            return callback(Error.createError(err, Error.internalError));

        return callback(null, users);
    });
}

function getRecentlyActive(params, callback) {
    params.limit = params.limit ? parseInt(params.limit) : 10;

    User
    .find({})
    .sort({lastActive: -1})
    .limit(params.limit)
    .exec(function(err, users) {
        if (err)
            return callback(Error.createError(err, Error.internalError));

        return callback(null, users);
    });
}
