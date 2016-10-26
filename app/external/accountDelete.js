var async = require('async');

var CancelAttemptController = require('../controllers/cancelAttempt.js');

var PayPal = require('../utils/paypal');
var Membership = require('../utils/membership');
var logger = require('../utils/logger.js');

var externalDelete = function(user) {
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

module.exports = {
    externalDelete: externalDelete
}