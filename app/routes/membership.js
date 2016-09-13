var async = require('async');

var UserController = require('../controllers/user');
var DiscController = require('../controllers/disc');

var logger = require('../utils/logger.js');
var Membership = require('../utils/membership');
var Access = require('../utils/access');
var PayPal = require('../utils/paypal');

var Error = require('../utils/error.js');

// app/payment.js
module.exports = function(app) {
    app.route('/create')
        .post(Access.hasAccess, function(req, res, next) {
            Membership.reqAccountCreate(req.user._id, req.body.type, function(err, upgradeReq) {
                if (err)
                    return next(err);
                
                logger.debug('Created upgrade request.', upgradeReq.toObject());
                
                PayPal.createTransaction(upgradeReq.sessionId, upgradeReq.immediateCharge, req.body.billing, function(err, transaction) {
                    if (err)
                        return next(err);
                    
                    return res.json(transaction);
                });
            });
        });
	
	app.route('/activate')
		.post(Access.hasAccess, function(req, res, next) {
			if (!req.user.account.profile || !req.user.account.profile.profileId)
				return next(Error.createError('Activation requires an existing membership profile. User \'create\' to create a new profile.', Error.unauthorizedError));
		
			if (req.user.account.profile.active)
				return next(Error.createError('The membership profile is already active.', Error.unauthorizedError));
		
			Membership.reqAccountCreate(req.user._id, req.body.type, function(err, upgradeReq) {
                if (err)
                    return next(err);
                
                logger.debug('Created upgrade request.', upgradeReq.toObject());
                
				PayPal.activateRecurringTrx(req.user.account.profile, upgradeReq.toAccount.amount, upgradeReq.immediateCharge, function(err, profile, immedCharge) {
					if (err)
						return next(err);
					
					if (immedCharge && !immedCharge.success) {
						logger.debug('Error occured in charging a prorate amount to profile.');
					}
					
					Membership.confirmAccountModify(upgradeReq, profile, immedCharge ? immedCharge.amount : 0, function(err, modifyReq) {
						if (err)
							return next(err);
						
						return res.json({req: modifyReq.sessionId, status: 'OK'});
					});
					
				});
            });
		});
    
    app.route('/request/:requestId')
        .get(Access.hasAccess, function(req, res, next) {
             Membership.getAccountChangeReq(req.params.requestId, function(err, request) {
                 if (err)
                     return next(err);
                 
                 if (request.userId !== req.user._id)
                     return next(Error.createError('Unauthorized to retrieve the account change request.', Error.unauthorizedError));
                 
                 
                 if (!request.completed)
                     return next(Error.createError('The account change request was never completed.', Error.invalidDataError));
                 
                 return res.json(request);
             });
        });
    
    app.route('/modify')
        .post(Access.hasAccess, function(req, res, next) {
            Membership.reqAccountModify(req.user._id, req.body.type, function(err, modifyReq, profileId) {
                if (err)
                    return next(err);
                
                PayPal.modifyRecurringTrx(profileId, modifyReq.toAccount.amount, modifyReq.immediateCharge, function(err, profile, immedCharge) {
					if (err)
						return next(err);
					
					if (immedCharge && !immedCharge.success) {
						logger.debug('Error occured in charging a prorate amount to profile.');
					}
					
					Membership.confirmAccountModify(modifyReq, profile, immedCharge ? immedCharge.amount : 0, function(err, modifyReq) {
						if (err)
							return next(err);
						
						return res.json({req: modifyReq.sessionId, status: 'OK'});
					});
                });
            });
        });
	
	app.route('/cancel')
		.post(Access.hasAccess, function(req, res, next) {
			Membership.reqAccountCancel(req.user._id, function(err, cancelReq, profileId) {
				if (err)
					return next(err);
				
				PayPal.cancelRecurringTrx(profileId, function(err, profile) {
					if (err)
						return next(err);
					
					Membership.confirmAccountCancel(cancelReq, profile, function(Err, cancelReq) {
						if (err)
							return next(err);
						
						return res.json({req: cancelReq.sessionId, status: 'OK'});
					});
				});
			});
		});
    
    app.route('/callback')
        .post(function(req, res, next) {
            logger.debug('Received payment callback from paypal. Result: ' + req.body.RESULT);
            Membership.getAccountChangeReq(req.body.SECURETOKENID, function(err, request) {
                if (err) {
                    logger.debug('Error creating upgrade request.', err);
                    return res.render('simple_redirect', {
                        redirectUrl: '/portal/account/upgrade/result?err_type=' + err.error.type + '&err_msg=' + err.error.message,
                        layout: false
                   });
                }
                
                if (request.completed)  {
                    err = Error.createError('The account change request is invalid.', Error.invalidDataError);
                    return res.render('simple_redirect', {
                        redirectUrl: '/portal/account/upgrade/result?req=' + request.sessionId + '&err_type=' + err.error.type + '&err_msg=' + err.error.message,
                        layout: false
                     });
                }
                
                logger.debug('Retrieved upgrade request.', request.toObject());
                var trxProfile;
                async.series([
                    function(cb) {
                        PayPal.createRecurringTrx(request.toAccount.amount, req.body, function(err, profile) {
                            if (err) {
                                logger.debug('Error creating recurring trx.', err);
                                return cb(err);
                            }
                            
                            logger.debug('Created recurring trx profile.');
                            trxProfile = profile;
                            return cb();
                        });
                    },
                    function(cb) {
                        Membership.confirmAccountCreate(request, trxProfile, function(err, request) {
                            if (err) {
                                logger.debug('Error confirming account upgrade.', err);
                                return cb(err);
                            }

                            logger.debug('Updated user with new profile.');
                            return cb();
                        });
                    }
                ], function(err, results) {
                    if (err) {
                        request.fail(err.error, function() {
                            logger.debug('A failure occured. Updated request with failed result.', request);
                             return res.render('simple_redirect', {
                                redirectUrl: '/portal/account/upgrade/result?req=' + request.sessionId + '&err_type=' + err.error.type + '&err_msg=' + err.error.message,
                                layout: false
                             });
                        });
                    } else {
                        return res.render('simple_redirect', {
                            redirectUrl: '/portal/account/upgrade/result?req=' + request.sessionId,
                            layout: false
                       });
                    }
                });
            });
        });
    
    app.get('*', function(req, res, next) {
		next(Error.createError('Unknown path', Error.unauthorizedError));
	});
}