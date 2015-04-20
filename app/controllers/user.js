var Error = require('../utils/error');
var User = require('../models/user');
var DiscController = require('./disc.js');
var _ = require('underscore');
var async = require('async');

module.exports = {
    checkPassword: checkPassword,
    getPreferences: getPreferences,
    updatePreferences: updatePreferences,
    deleteUser: deleteUser,
    getAlias: getAlias
}

function getAlias(userId, callback) {
	User.findById(userId, function(err, user) {
       if (err) 
			return callback(Error.createError(err, Error.internalError));
		
		
		if (!user)
	   		return callback(Error.createError('Unknown user identifier.', Error.objectNotFoundError));
		
		return callback(null, {display: user.local.email, image: user.local.image});
	});
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

function deleteUser(userId, gfs, callback) {
	User.findById(userId, function (err, user) {
		if (err)
			return callback(Error.createError(err, Error.internalError));
			
		if (!user)
			return callback(Error.createError('Unknown user identifier.', Error.objectNotFoundError));
		
		console.log('Initiating deletion of user: ' + user._id);
		DiscController.getDiscs(user._id, function(err, discs) {
			
			console.log('Deleting [' + discs.length + '] discs owned by user.');
			
			async.each(discs, function(disc, aCallback) {
		        DiscController.deleteDisc(user._id, disc._id, gfs, function(err, disc) {
		            if (err)
		                console.log(err);
		                
		            console.log('Successfully deleted disc:' + disc._id);
		        	aCallback();
		        });
		    }, function(err) {
		        user.remove(function(err) {
		        	if (err)
		        		return callback(Error.createError(err, Error.internalError));
		        	
			        console.log('Successfully deleted user.');
			        callback(null, user);
		        });
		        
		    });
		});
	});
}