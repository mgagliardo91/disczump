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
            Membership.reqAccountCreate(req.user._id, req.body, function(err, upgradeReq) {
                if (err)
                    return next(err);
                
                logger.debug('Created upgrade request.', upgradeReq.toObject());
                
                PayPal.createHostedPage(req.user._id, upgradeReq.sessionId, req.body.billing, function(err, transaction) {
                    if (err)
                        return next(err);
                    
                    return res.json({hostedPage: transaction, request: upgradeReq});
                });
            });
        });
	
	app.route('/promo')
		.post(Access.hasAccess, function(req, res, next) {
			Membership.reqActivatePromoCode(req.user._id, req.body, function(err, promoReq, userProfile) {
				if (err)
					return next(err);
				
				logger.debug('Create promo request.', promoReq.toObject());
				PayPal.modifyRecurringTrx(userProfile, promoReq, function(err, params) {
					if (err)
						return next(err);
					
					if (params.immedCharge && !params.immedCharge.success) {
						logger.error('Unable to charge user [' + promoReq.userId + '] for immediate amount [' + params.immedCharge.amount + '].');
					}
					
					Membership.confirmAccountModify(promoReq, params, function(err, modifyReq) {
						if (err)
							return next(err);
						
						return res.json(modifyReq);
					});
                });
			});
		});
	
	app.route('/changePayment')
		.post(Access.hasAccess, function(req, res, next) {
			Membership.reqAccountChangePayment(req.user._id, function(err, changeReq) {
				if (err)
					return next(err);
                
                logger.debug('Created payment change request.', changeReq.toObject());
				
				PayPal.createHostedPage(req.user._id, changeReq.sessionId, req.body.billing, function(err, transaction) {
                    if (err)
                        return next(err);
                    
                    return res.json({hostedPage: transaction, request: changeReq});
                });
			});
		});
	
	app.route('/activate')
		.post(Access.hasAccess, function(req, res, next) {
			if (!req.user.account.profile || !req.user.account.profile.profileId)
				return next(Error.createError('Activation requires an existing membership profile. User \'create\' to create a new profile.', Error.unauthorizedError));
		
			if (req.user.account.profile.active)
				return next(Error.createError('The membership profile is already active.', Error.unauthorizedError));
		
			Membership.reqAccountCreate(req.user._id, req.body, function(err, upgradeReq) {
                if (err)
                    return next(err);
                
                logger.debug('Created upgrade request.', upgradeReq.toObject());
                
				PayPal.activateRecurringTrx(req.user.account.profile, upgradeReq, function(err, params) {
					if (err)
						return next(err);
					
					if (params.immedCharge && !params.immedCharge.success) {
						logger.error('Unable to charge user [' + upgradeReq.userId + '] for immediate amount [' + params.immedCharge.amount + '].');
					}
					
					Membership.confirmAccountModify(upgradeReq, params, function(err, modifyReq) {
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
            Membership.reqAccountModify(req.user._id, req.body, function(err, modifyReq, userProfile) {
                if (err)
                    return next(err);
                
                PayPal.modifyRecurringTrx(userProfile, modifyReq, function(err, params) {
					if (err)
						return next(err);
					
					if (params.immedCharge && !params.immedCharge.success) {
						logger.error('Unable to charge user [' + modifyReq.userId + '] for immediate amount [' + params.immedCharge.amount + '].');
					}
					
					Membership.confirmAccountModify(modifyReq, params, function(err, modifyReq) {
						if (err)
							return next(err);
						
						return res.json({req: modifyReq.sessionId, status: 'OK'});
					});
                });
            });
        });
	
	app.route('/cancel')
		.post(Access.hasAccess, function(req, res, next) {
			Membership.reqAccountCancel(req.user._id, function(err, cancelReq, userProfile) {
				if (err)
					return next(err);
				
				PayPal.cancelRecurringTrx(userProfile.profileId, function(err, params) {
					if (err)
						return next(err);
					
					Membership.confirmAccountCancel(cancelReq, params, function(err, cancelReq) {
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
                        redirectUrl: '/account/membership/result?err_type=' + err.error.type + '&err_msg=' + err.error.message,
                        layout: false
                   });
                }
                
                if (request.completed)  {
                    err = Error.createError('The account change request is invalid.', Error.invalidDataError);
                    return res.render('simple_redirect', {
                        redirectUrl: '/account/membership/result?err_type=' + err.error.type + '&err_msg=' + err.error.message,
                        layout: false
                     });
                }
                
                logger.debug('Retrieved upgrade request.', request.toObject());
				var createParams;
                async.series([
                    function(cb) {
                        PayPal.createRecurringTrx(request, req.body, function(err, params) {
                            if (err) {
                                logger.debug('Error creating recurring trx.', err);
                                return cb(err);
                            }
		
							if (params.immedCharge && !params.immedCharge.success) {
								logger.error('Unable to charge user [' + request.userId + '] for immediate amount [' + params.immedCharge.amount + '].');
							}
                            
                            logger.debug('Created recurring trx profile.');
							createParams = params;
                            return cb();
                        });
                    },
					function(cb) {
						if (request.paymentChange) {
							UserController.getUser(request.userId, function(err, user) {
								if (err) {
									logger.error('Error deactivating previous recurring profile', err);
									return cb();
								}
								
								if (!user.account.profile.profileId)
									return cb();
								
								PayPal.cancelRecurringTrx(user.account.profile.profileId, function(err, params) {
									if (err) {
										logger.error('Error deactivating previous recurring profile', err);
									}
									
									return cb();
								});
							});
						} else return cb();
					},
                    function(cb) {
                        Membership.confirmAccountCreate(request, createParams, function(err, request) {
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
                             return res.render('simple_redirect', {
                                redirectUrl: '/account/membership/result?req=' + request.sessionId + '&err_type=' + err.error.type + '&err_msg=' + err.error.message,
                                layout: false
                             });
                        });
                    } else {
                        return res.render('simple_redirect', {
                            redirectUrl: '/account/membership/result?req=' + request.sessionId,
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