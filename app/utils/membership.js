var XDate = require('xdate');
var async = require('async');

var UserController = require('../controllers/user');
var AccountChangeRequestController = require('../controllers/accountChangeRequest');
var PromoCodeController = require('../controllers/promoCode');

var logger = require('./logger.js');
var Error = require('./error.js');

var membershipConfig = require('../../config/config').membership;
var MembershipTypes = require('./membershipTypes');

module.exports = {
    reqActivatePromoCode: reqActivatePromoCode,
    reqAccountCreate: reqAccountCreate,
    reqAccountModify: reqAccountModify,
    reqAccountCancel: reqAccountCancel,
    reqAccountChangePayment: reqAccountChangePayment,
    getAccountChangeReq: getAccountChangeReq,
    confirmAccountCreate: confirmAccountCreate,
    confirmAccountModify: confirmAccountModify,
    confirmAccountCancel: confirmAccountCancel
}

var validatePromoCode = function(code, account, newAccount, callback) {
    PromoCodeController.getPromoCode(code, function(err, promoCode) {
        if (err)
            return callback(err);
        
        var unauthError = promoCode.authorize(account, newAccount);
        if (unauthError)
            return callback(unauthError);
        
        return callback(null, promoCode);
    });
}

var getProrateAmt = function(profile, curAccount, newAccount) {
    var today = new XDate();
    today = new XDate(today.getFullYear(), today.getMonth(), today.getDate());
    var prevBilling;
    
    if (!profile || !profile.profileId)
        return newAccount.amount;
    
    if (newAccount.amount < curAccount.amount) {
        return 0.0;
    }
    
    if (!profile.nextBillDate) {
        return 0.0;
    }
    
    var nextBillDate = new XDate(profile.nextBillDate);
    
    if (nextBillDate < today) {
        return 0.0;
    }
    
    prevBilling = nextBillDate.clone().addMonths(-1);
    var daysRemaining = today.diffDays(nextBillDate);
    var totalDays = prevBilling.diffDays(nextBillDate);
    
    try {
        var oweAmt = (newAccount.amount / totalDays) * daysRemaining;
        var amountDiff = oweAmt - curAccount.amount;
        
        return Math.max(0.0, parseFloat(amountDiff.toFixed(2)));
    } catch (e) {
        return 0.0;
    }
}

function canCreate(user, type) {
    if (user.account.type === membershipConfig.TypeBasic ||
       (user.account.profile && user.account.profile.type === membershipConfig.TypeBasic)) {
        switch(type) {
            case membershipConfig.TypeEntry:
            case membershipConfig.TypePro: {
                return true;
            }
        }
    }
    
    return false;
}

function canModify(user, type) {
    if (user.account.profile && user.account.profile.type == membershipConfig.TypeEntry && 
        type == membershipConfig.TypePro)
        return true;
    
    if (user.account.profile && user.account.profile.type == membershipConfig.TypePro && 
        type == membershipConfig.TypeEntry)
        return true;
    
    return false;
}

function canChangePayment(user) {
    return typeof(user.account.profile.profileId) !== 'undefined' && 
        (user.account.profile.type == membershipConfig.TypeEntry || 
        user.account.profile.type == membershipConfig.TypePro);
}

function canCancel(user) {
    return user.account.profile && (user.account.profile.type == membershipConfig.TypeEntry ||
        user.account.profile.type == membershipConfig.TypePro);
}

function reqAccountCreate(userId, params, callback) {
    var type = params.type;
    
    if (typeof(type) === 'undefined')
        return callback(Error.createError('Invalid membership type.', Error.invalidDataError));
    
    type = type.toLowerCase();
    
    UserController.getUser(userId, function(err, user) {
        if (err)
            return callback(err);
        
        var accountType = MembershipTypes.checkType(type);
        
        if (!accountType)
            return callback(Error.createError('Invalid membership type.', Error.invalidDataError));
        
        if (!canCreate(user, accountType))
            return callback(Error.createError('Unable to upgrade account due to its current membership level.', Error.unauthorizedError));
        
        var curAccount = {
            type: user.account.type,
            amount: MembershipTypes.getTypeCost(user.account.type)
        }
        
        var newAccount = {
            type: accountType,
            amount: MembershipTypes.getTypeCost(accountType)
        }
        
        var promo;
        
        async.series([
            function(cb) {
                if (params.promoCode) {
                    validatePromoCode(params.promoCode, user.account, newAccount, function(err, promoCode) {
                        if (err)
                            return cb(err);
                        
                        promo = promoCode;
                        return cb();
                    });
                } else {
                    return cb();
                }
            }
        ], function(err, results) {
            if (err)
                return callback(err);
            
            var prorateAmt = getProrateAmt(user.account.profile, curAccount, newAccount);
        
            AccountChangeRequestController.createFullRequest(user._id, {
                    email: user.local.email,
                    fromAccount: curAccount,
                    toAccount: newAccount,
                    immedCharge: prorateAmt,
                    promo: promo
                },function(err, request) {
                if (err)
                    return callback(err);

                return callback(null, request);
            });
        });
        
    });
}

function reqActivatePromoCode(userId, params, callback) {
    var promo = params.promoCode;
    
    if (typeof(promo) == 'undefined')
        return callback(Error.createError('This route requires a promo code.', Error.invalidDataError));
    
    UserController.getUser(userId, function(err, user) {
        if (err)
            return callback(err);
        
        var curAccount = {
            type: user.account.type,
            amount: MembershipTypes.getTypeCost(user.account.type)
        }
        
        validatePromoCode(promo, user.account, undefined, function(err, promoCode) {
            if (err)
                return callback(err);
            
             AccountChangeRequestController.createFullRequest(user._id, {
                    email: user.local.email,
                    fromAccount: curAccount,
                    promo: promoCode
                }, function(err, request) {
                if (err)
                    return callback(err);

                logger.debug('Created modify request.', request.toObject());

                return callback(null, request, user.account.profile);
            });
        });
    });
}

function reqAccountModify(userId, params, callback) {
    var type = params.type;
    
    if (typeof(type) === 'undefined')
        return callback(Error.createError('Invalid membership type.', Error.invalidDataError));
    
    type = type.toLowerCase();
    
    UserController.getUser(userId, function(err, user) {
        if (err)
            return callback(err);
        
        var accountType = MembershipTypes.checkType(type);
        
        if (!accountType)
            return callback(Error.createError('Invalid membership type.', Error.invalidDataError));
        
        if (!canModify(user, accountType))
            return callback(Error.createError('Unable to modify account due to its current membership level.', Error.unauthorizedError));
        
        var curAccount = {
            type: user.account.type,
            amount: MembershipTypes.getTypeCost(user.account.type)
        }
        
        var newAccount = {
            type: accountType,
            amount: MembershipTypes.getTypeCost(accountType)
        }
        
        var prorateAmt = getProrateAmt(user.account.profile, curAccount, newAccount);
        
        AccountChangeRequestController.createFullRequest(user._id, {
                email: user.local.email,
                fromAccount: curAccount,
                toAccount: newAccount,
                immedCharge: prorateAmt
            }, function(err, request) {
            if (err)
                return callback(err);
            
            logger.debug('Created modify request.', request.toObject());
            
            return callback(null, request, user.account.profile);
        });
    });
}

function reqAccountCancel(userId, callback) {
    UserController.getUser(userId, function(err, user) {
        if (err)
            return callback(err);
        
        if (!canCancel(user))
            return callback(Error.createError('Unable to cancel account due to its current membership level.', Error.unauthorizedError));
        
        var curAccount = {
            type: user.account.type,
            amount: MembershipTypes.getTypeCost(user.account.type)
        }
        
        var newAccount = {
            type: membershipConfig.TypeBasic,
            amount: membershipConfig.CostBasic
        }
        
        AccountChangeRequestController.createFullRequest(user._id, {
                email: user.local.email,
                fromAccount: curAccount,
                toAccount: newAccount
            }, function(err, request) {
            if (err)
                return callback(err);
            
            logger.debug('Created cancel request.', request.toObject());
            
            return callback(null, request, user.account.profile);
        });
    });
}

function reqAccountChangePayment(userId, callback) {
    UserController.getUser(userId, function(err, user) {
        if (err)
            return callback(err);
        
        if (!canChangePayment(user))
            return callback(Error.createError('Unable to cancel account due to its current membership level.', Error.unauthorizedError));
        
        var curAccount = {
            type: user.account.type,
            amount: MembershipTypes.getTypeCost(user.account.type)
        }
        
        var newAccount = {
            type: user.account.profile.type,
            amount: MembershipTypes.getTypeCost(user.account.profile.type)
        }
        
        AccountChangeRequestController.createFullRequest(user._id, {
                email: user.local.email,
                fromAccount: curAccount,
                toAccount: newAccount,
                paymentChange: true
            }, function(err, request) {
            if (err)
                return callback(err);
            
            logger.debug('Created payment change request.', request.toObject());
            
            return callback(null, request);
        });
    });
}

function getAccountChangeReq(sessionId, callback) {
    if (typeof(sessionId) === 'undefined')
        return callback(Error.createError('Invalid account change request.', Error.invalidDataError));
    
    AccountChangeRequestController.getRequest(sessionId, function(err, request) {
        if (err)
            return callback(err);
        
        return callback(null, request);
    });
}

function confirmAccountCreate(req, params, callback) {
    logger.debug('Creating account with profile', params.profile);
    
    UserController.setAccountProfile(req.userId, req, params.profile, function(err, user) {
        if (err)
            return callback(err);
        
        if (params.promo) {
            PromoCodeController.setPromoUsed(params.promo);
            user.promoUsed(params.promo);
        }
        
        req.success(params.immedCharge ? params.immedCharge.amount : 0.0, function(err) {
            return callback(null, req);
        });
    });
}

function confirmAccountModify(req, params, callback) {
    logger.debug('Modifying account with profile updates', params.profile);
    
    UserController.setAccountProfile(req.userId, req, params.profile, function(err, user) {
        if (err)
            return callback(err);
        
        if (params.promo) {
            PromoCodeController.setPromoUsed(params.promo);
            user.promoUsed(params.promo);
        }
        
        req.success(params.immedCharge ? params.immedCharge.amount : 0.0, function(err) {
            return callback(null, req);
        });
    });
}

function confirmAccountCancel(req, params, callback) {
    logger.debug('Cancelling account with profile updates', params.profile);
    
    UserController.setAccountProfile(req.userId, req, params.profile, function(err, user) {
        if (err)
            return callback(err);
        
        if (params.promo) {
            PromoCodeController.setPromoUsed(params.promo);
            user.promoUsed(params.promo);
        }
        
        req.success(0.0, function(err) {
            return callback(null, req);
        });
    });
}