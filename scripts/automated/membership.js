var Handlebars = require('handlebars');

var UserModel = require('../../app/models/user.js');

var UserController = require('../../app/controllers/user.js');
var DiscController = require('../../app/controllers/disc.js');
var BillingInquiryController = require('../../app/controllers/billingInquiry.js');
var CancelAttemptController = require('../../app/controllers/cancelAttempt.js');

var PayPal = require('../../app/utils/paypal.js');
var Mailer = require('../../app/utils/mailer.js');
var Error = require('../../app/utils/error.js');
var MembershipTypes = require('../../app/utils/membershipTypes.js');
var HandleConfig = require('../../app/utils/handleConfig.js');

var async = require('async');
var winston = require('winston');
var path = require('path');
var XDate = require('xdate');
var fs = require('fs');

var PaymentConfig = require('../../config/config.js').payment;
var membershipConfig = require('../../config/config.js').membership;
var localConfig = require('../../config/localConfig');
var logger;


var createBillingInquiry = function(user, error, callback) {
    BillingInquiryController.createInquiry(user, error, function(err, inquiry) {
        if (err) {
            logger.error('Unable to create billing inquiry for user [%s]. ' + JSON.stringify(err), user._id);
            return callback();
        }
        
        logger.info('Created billing inquiry for user [%s] with id [%s]', user._id, inquiry._id);
        return callback();
    });
}

var makeContact = function(user, currentInquiry, inquiryObj, callback) {
    var html = fs.readFileSync('./private/html/paymentFailed.handlebars', 'utf8');
    var template = Handlebars.compile(html);
    var message = template({user: user, pendingHours: PaymentConfig.reminderHours,serverURL: localConfig.serverURL});

    Mailer.sendMail(user.local.email, Mailer.TypePaymentFailed, message, function(err, result) {
       if (err) {
            return callback();
        }
        
        user.setPending();
        logger.info('Making contact with user [%s]', user.local.email);
        if (currentInquiry) {
            currentInquiry.makeContact(Error.createError('Invalid inquiry status: ' + inquiry.status, Error.paypalError));
            return callback();
        } else {
            BillingInquiryController.createInquiry(user, 
                Error.createError('Invalid inquiry status: ' + inquiryObj.status, Error.paypalError),
                function(err, inquiry) {
                    if (err) {
                        logger.error('Unable to create made-contact billing inquiry for user [%s]. ' + JSON.stringify(err), user._id);
                        return callback();
                    }

                    logger.info('Created billing inquiry with contact made for user [%s] with id [%s]', user._id, inquiry._id);
                    return callback();
            }, true);
        }
    });
}

var resetAccount = function(inquiry, callback) {
    logger.info('Resetting user [%s] after failure to pay', inquiry.userId);
    
    DiscController.removeUsersDiscsFromMarketplace(inquiry.userId, function(err) {
		if (err)
			logger.error('Unable to remove user\'s discs from the marketplace.');
		else
			logger.info('Removed user [%s] marketplace discs', inquiry.userId);
		
        UserController.setAccountProfileImmed(inquiry.userId, {
			type: membershipConfig.TypeBasic,
			lastModified: new Date(),
			draftAmount: 0,
			pendingReset: false,
			active: false
        }, function(err, user) {
            if (err) {
                logger.error('Unable to reset user account for inquiry [%s]. ' + JSON.stringify(err), inquiry._id);
                return callback();
            }

            inquiry.archive('User account reset after being notified.');
            return callback();
        });
    });
}

var notifyAdminOfAttempt = function(attempt, callback) {
    logger.info('Notifying admin of attempt [%s]', attempt._id);
	
    var html = fs.readFileSync('./private/html/attemptFailed.handlebars', 'utf8');
    var template = Handlebars.compile(html);
    var message = template({attempt: attempt, serverURL: localConfig.serverURL});
	
	Mailer.sendAdmin(Mailer.TypeAttemptFailed, message, function(err, result) {
       if (err) {
            return callback();
        }
        
		attempt.archive('Admin notified of failed attempt.');
		return callback();
    });
    
}

var notifyAdminOfInquiry = function(inquiry, callback) {
    logger.info('Notifying admin of inquiry [%s]', inquiry._id);
	
    var html = fs.readFileSync('./private/html/inquiryFailed.handlebars', 'utf8');
    var template = Handlebars.compile(html);
    var message = template({inquiry: inquiry, serverURL: localConfig.serverURL});
	
	Mailer.sendAdmin(Mailer.TypeInquiryFailed, message, function(err, result) {
       if (err) {
            return callback();
        }
        
		inquiry.archive('Admin notified of failed inquiry.');
		return callback();
    });
    
}

var inquireUser = function(user, callback) {
	PayPal.doInquiry(user.account.profile.profileId, function(err, inquiry) {
		
		inquiry.status = 'Fake Status';
		
		if (err)
			return callback(err);
		
		if (inquiry.status !== 'ACTIVE') {
			return callback(null, Error.createError('Invalid inquiry status: ' + inquiry.status, Error.paypalError));
		}
		
		user.account.profile.nextBillDate = inquiry.nextBillDate;
        user.save(function(err) {
			if (err) {
				return callback(err);
			}

			logger.info('Successfully updated user [%s] with new billing date', user._id);
			return callback();
		});
	});
}

var handleUserInquiry = function(user, currentInquiry, callback) {
	inquireUser(user, function(err, invalid) {
		if (err) {
			if (currentInquiry) {
                currentInquiry.addError(err);
                logger.info('Incrementing try count of inquiry [%s] due to error', currentInquiry._id, err);
				
				if (currentInquiry.tryCount >= PaymentConfig.failRetryAttempts) {
					return notifyAdminOfInquiry(currentInquiry, callback);
				}
				
                return callback();
			} else {
                return createBillingInquiry(user, err, callback);
			}
		}
		
		if (invalid) {
			if (currentInquiry && currentInquiry.contactMade) {
                currentInquiry.addError(invalid);
				
				if (currentInquiry.tryCount >= PaymentConfig.failRetryAttempts) {
					return notifyAdminOfInquiry(currentInquiry, callback);
				}
				
                return callback();
            }
            
            return makeContact(user, currentInquiry, inquiry, callback);
		}
		
		if (currentInquiry) {
			currentInquiry.remove();
		}
		
		return callback();
	});
}

var handleCancelAttempt = function(attempt, callback) {
	PayPal.cancelRecurringTrx(attempt.profileId, function(err, profile) {
		if (err) {
			attempt.addError(err);
			logger.info('Incrementing try count of cancel attempt [%s] due to error', attempt._id, err);
			
			if (attempt.tryCount >= PaymentConfig.failCancelAttempts) {
                return notifyAdminOfAttempt(attempt, callback);
            }
		} else {
			attempt.remove();
		}

		return callback();

	});
}	

var simpleInquireUserByInquiry = function(inquiry, callback) {
    UserModel.findOne({_id: inquiry.userId}, function(err, user) {
        if (err) {
            return callback(err);
        }
        
        if (!user) {
            return callback(userError);
        }
        
        return inquireUser(user, callback);
    });
}

var handleInquireUserByInquiry = function(inquiry, callback) {
    UserModel.findOne({_id: inquiry.userId}, function(err, user) {
        if (err) {
            inquiry.addError(err);
            logger.info('Incrementing try count of inquiry [%s] due to error', inquiry._id, err);
			
			if (inquiry.tryCount >= PaymentConfig.failRetryAttempts) {
                return notifyAdminOfInquiry(inquiry, callback);
            }
			
            return callback();
        }
        
        if (!user) {
            var userError = Error.createError('Unable to locate user associated with inquiry.', Error.objectNotFoundError);
            inquiry.addError(userError);
            logger.info('Incrementing try count of inquiry [%s] due to error', inquiry._id, userError);
			
			if (inquiry.tryCount >= PaymentConfig.failRetryAttempts) {
                return notifyAdminOfInquiry(inquiry, callback);
            }
            return callback();
        }
        
        return handleUserInquiry(user, inquiry, callback);
    });
}

var syncUser = function(user, callback) {
	if (user.account.type == user.account.profile.type) {
		logger.info('User [%s] did not need to synchronize', user._id);
		return callback();
	}
	
	user.account.type = typeof(user.account.profile.type) !== undefined ? user.account.profile.type : user.account.type;
	user.account.marketCap = MembershipTypes.getMarketCap(user.account.type);
	
	DiscController.removeUsersDiscsFromMarketplace(user._id, function(err) {
		if (err)
			logger.error('Unable to remove user\'s discs from the marketplace.');
		else
			logger.info('Removed user [%s] marketplace discs', user._id);
		
		user.save(function(err) {
			if (err) {
				logger.error('Unable to synchronize user', err);
				return callback();
			}

			var activeAccount = MembershipTypes.getTypeName(user.account.type);
			var recurringAmt = user.account.profile.draftAmount.toFixed(2);

			var html = fs.readFileSync('./private/html/accountChanged.handlebars', 'utf8');
			var template = Handlebars.compile(html);
			var email = template({user: user, activeAccount: activeAccount, recurringAmt: recurringAmt, serverURL: localConfig.serverURL, sync: true});

			Mailer.sendMail(user.local.email, Mailer.TypeAccountChange, email, function(err, result) {
				return callback();
			});
		});
    });
}

var ProccessOCRs = function(callback) {
	logger.info('Processing outstanding cancel requests');
	CancelAttemptController.getActiveAttempts(function(err, attempts) {
		if (err || !attempts)
            return callback();
		
		logger.info('Found [%d] cancel attempts to process', attempts.length);
        
        async.eachSeries(attempts, function(attempt, cb) {
            logger.info('Processing outstanding cancel attempt with id [%s]', attempt._id);
            
            return handleCancelAttempt(attempt, cb);
            
        }, function(err) {
            logger.info('Completed processing outstanding cancel attempts.');
            return callback();
        });
	});
}

var ProcessOIs = function(callback) {
    logger.info('Processing outstanding inquiries');
    BillingInquiryController.getActiveInquiries(function(err, inquiries) {
        if (err || !inquiries)
            return callback();
        
        logger.info('Found [%d] inquiries to process', inquiries.length);
        
        async.eachSeries(inquiries, function(inquiry, cb) {
            logger.info('Processing outstanding inquiry with id [%s]', inquiry._id);
            
            if (inquiry.contactMade) {
                var expiredContact = (new XDate(inquiry.contactDate)).addHours(PaymentConfig.reminderHours);
                var today = new XDate();
                if (today >= expiredContact) {
					
					simpleInquireUserByInquiry(inquiry, function(err, invalid) {
						if (err) {
							inquiry.addError(err);
							return cb();
						} else if (invalid) {
							return resetAccount(inquiry, cb);
						} else {
							inquiry.remove();
							return cb();
						}
					});
                }
            }
            
            return handleInquireUserByInquiry(inquiry, cb);
            
        }, function(err) {
            logger.info('Completed processing outstanding inquiries.');
            return callback();
        });
    });
}

var InquireUsers = function(callback) {
    var today = (new XDate()).addDays(-3);
    var todayCompare = new XDate(today.getFullYear(), today.getMonth(), today.getDate());
    logger.info('Running new inquiry for bill dates matching: ' + todayCompare.toString('MM/dd/yyyy'));
    UserModel
        .where('account.profile.profileId').exists()
        .where('account.profile.active').equals(true)
        .where('account.profile.nextBillDate').equals(todayCompare.toISOString())
        .exec(function(err, users) {
            if (err || !users)
                return callback();
        
            logger.info('Found [%d] users to inquire', users.length);
        
            async.eachSeries(users, function(user, cb) {
                logger.info('Running inquiry for user [%s] with email [%s]', user._id, user.local.email);
                handleUserInquiry(user, undefined, cb);
            }, function(err) {
                logger.info('Completed inquiry.');
                return callback();
            });
        });
}

var SyncUsers = function(callback) {
	var today = new XDate();
    var todayCompare = new XDate(today.getFullYear(), today.getMonth(), today.getDate());
    logger.info('Running new use sync matching: ' + todayCompare.toString('MM/dd/yyyy'));
	UserModel
        .where('account.profile.nextBillDate').equals(todayCompare.toISOString())
        .exec(function(err, users) {
            if (err || !users)
                return callback();
        
            logger.info('Found [%d] users to synchronize', users.length);
        
            async.eachSeries(users, function(user, cb) {
                logger.info('Synchronizing user [%s] with email [%s]', user._id, user.local.email);
                syncUser(user, cb);
            }, function(err) {
                logger.info('Completed synchronization.');
                return callback();
            });
        });
}

var DoInquiry = function(callback) {
    async.series([
		ProccessOCRs,
        ProcessOIs,
        InquireUsers,
		SyncUsers
    ], function(err, results) {
        if (err)
            logger.error('Error in inquiry processing', err);
        
        return callback();
    });
}

module.exports = function(log) {
    HandleConfig.registerHelpers(Handlebars);
    
    if (log) {
        logger = log;
    } else {
        logger = new (winston.Logger)({
            transports: [
              new (winston.transports.File)({
                    json: false,
                    datePattern: '.yyyy-MM-dd-HH-mm',
                    filename: path.join(__dirname, "../../logs", "MembershipOutput.log") 
              })
            ]
        });
    }
    
    return {
        DoInquiry: DoInquiry
    }
}
