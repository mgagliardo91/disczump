var async = require('async');

var EventController = require('../controllers/event');
var UserController = require('../controllers/user');
var DiscController = require('../controllers/disc');
var MessageController = require('../controllers/message');
var CancelAttemptController = require('../controllers/cancelAttempt.js');

var error = require('../utils/error');
var PayPal = require('../utils/paypal');
var Membership = require('../utils/membership');
var logger = require('../utils/logger.js');

var membershipDelete = function(user) {
    if (user.account.profile.profileId && user.account.profile.active) {
        async.series([
            function(cb) {
                PayPal.cancelRecurringTrx(user.account.profile.profileId, function(err, profile) {
                    if (err)
                        return cb(err);
                    
                    logger.info('Successfully cancelled recurring transaction for user %s', user._id);
                    return cb();
                    
                });
            }
        ], function(err) {
           if (err) {
               CancelAttemptController.createAttempt(user._id, user.account.profile.profileId, err, function(err, attempt) {
                   if (err)
                       return logger.error('Unable to create cancelAttempt for user %s', user._id);
                   
                   return logger.info('Created cancelAttempt for user %s', user._id);
               });
           }
        });
    }
    
    return;
}

var executeDelete = function(userId, gfs, callback) {
    UserController.getActiveUser(userId, function(err, user) {
                if (err)
	                return callback(err);
	                
	            async.series([
                    function(cb) {
                        MessageController.deleteUserThreads(user._id, cb);
                    },
                    function(cb) {
                        DiscController.deleteUserDiscs(user._id, gfs, cb);
                    },
                    function(cb) {
                        UserController.deleteUser(user._id, gfs, cb);
                    }
                ], function(err, results) {
                    membershipDelete(user);
                    return callback(null, user);
                });
            });
}

module.exports = {
    membershipDelete: membershipDelete,
    executeDelete: executeDelete
}