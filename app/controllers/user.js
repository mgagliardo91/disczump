var Error = require('../utils/error');
var User = require('../models/user');
var _ = require('underscore');

module.exports = {
    checkPassword: checkPassword,
    getPreferences: getPreferences,
    updatePreferences: updatePreferences
}

function checkPassword(password) {
	return password.length >= 6;
}

function getPreferences(userId, callback) {
    User.findById(userId, function(err, user) {
       if (err) 
			return callback(Error.createError(err, Error.internalError));
		
		if (!user)
	   		return callback(Error.createError('Unknown user identifier.', Error.objectNotFoundError));
		
		return callback(null, user.preferences);
    });
}

function updatePreferences(userId, prefs ,callback) {
    User.findById(userId, function(err, user) {
       if (err) 
			return callback(Error.createError(err, Error.internalError));
		
		if (!user)
	   		return callback(Error.createError('Unknown user identifier.', Error.objectNotFoundError));
		
		if (prefs.colorize) {
		    user.preferences.colorize = prefs.colorize;
		}
		
		user.save(function(err) {
		    if (err)
    			return callback(Error.createError(err, Error.internalError));
    		else
    			return callback(null, user.preferences);
		});
    });
}