var XDate = require('xdate');

var UserController = require('../controllers/user');
var AccountChangeRequestController = require('../controllers/accountChangeRequest');

var logger = require('./logger.js');
var Error = require('./error.js');

var membershipConfig = require('../../config/config').membership;

module.exports = {
    reqAccountCreate: reqAccountCreate,
    reqAccountModify: reqAccountModify,
    reqAccountCancel: reqAccountCancel,
    getAccountChangeReq: getAccountChangeReq,
    confirmAccountCreate: confirmAccountCreate,
    confirmAccountModify: confirmAccountModify,
    confirmAccountCancel: confirmAccountCancel
}

function getMembershipCost(type) {
    switch(type) {
        case membershipConfig.TypeBasic: {
            return membershipConfig.CostBasic;
        }
        case membershipConfig.TypeEntry: {
            return membershipConfig.CostEntry;
        }
        case membershipConfig.TypePro: {
            return membershipConfig.CostPro;
        }
        default:
            return 0;
    }
}

function checkType(type) {
    if (type.toLowerCase() == membershipConfig.TypeBasic.toLowerCase()) {
        return membershipConfig.TypeBasic;
    }
    
    if (type.toLowerCase() == membershipConfig.TypeEntry.toLowerCase()) {
        return membershipConfig.TypeEntry;
    }
    
    if (type.toLowerCase() == membershipConfig.TypePro.toLowerCase()) {
        return membershipConfig.TypePro;
    }
    
    return undefined;
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

function canCancel(user) {
    return user.account.profile && (user.account.profile.type == membershipConfig.TypeEntry ||
        user.account.profile.type == membershipConfig.TypePro);
}

function reqAccountCreate(userId, type, callback) {
    if (typeof(type) === 'undefined')
        return callback(Error.createError('Invalid membership type.', Error.invalidDataError));
    
    type = type.toLowerCase();
    
    UserController.getUser(userId, function(err, user) {
        if (err)
            return callback(err);
        
        var accountType = checkType(type);
        
        if (!accountType)
            return callback(Error.createError('Invalid membership type.', Error.invalidDataError));
        
        if (!canCreate(user, accountType))
            return callback(Error.createError('Unable to upgrade account due to its current membership level.', Error.unauthorizedError));
        
        var curAccount = {
            type: user.account.type,
            amount: getMembershipCost(user.account.type)
        }
        
        var newAccount = {
            type: accountType,
            amount: getMembershipCost(accountType)
        }
        
        var prorateAmt = getProrateAmt(user.account.profile, curAccount, newAccount);
        
        AccountChangeRequestController.createFullRequest(user._id, curAccount, newAccount, prorateAmt, function(err, request) {
            if (err)
                return callback(err);
            
            return callback(null, request);
        });
    });
}

function reqAccountModify(userId, type, callback) {
    if (typeof(type) === 'undefined')
        return callback(Error.createError('Invalid membership type.', Error.invalidDataError));
    
    type = type.toLowerCase();
    
    UserController.getUser(userId, function(err, user) {
        if (err)
            return callback(err);
        
        var accountType = checkType(type);
        
        if (!accountType)
            return callback(Error.createError('Invalid membership type.', Error.invalidDataError));
        
        if (!canModify(user, accountType))
            return callback(Error.createError('Unable to modify account due to its current membership level.', Error.unauthorizedError));
        
        var curAccount = {
            type: user.account.type,
            amount: getMembershipCost(user.account.type)
        }
        
        var newAccount = {
            type: accountType,
            amount: getMembershipCost(accountType)
        }
        
        var prorateAmt = getProrateAmt(user.account.profile, curAccount, newAccount);
        
        AccountChangeRequestController.createFullRequest(user._id, curAccount, newAccount, prorateAmt, function(err, request) {
            if (err)
                return callback(err);
            
            logger.debug('Created modify request.', request.toObject());
            
            return callback(null, request, user.account.profile.profileId);
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
            amount: getMembershipCost(user.account.type)
        }
        
        var newAccount = {
            type: membershipConfig.TypeBasic,
            amount: membershipConfig.CostBasic
        }
        
        AccountChangeRequestController.createRequest(user._id, curAccount, newAccount, function(err, request) {
            if (err)
                return callback(err);
            
            logger.debug('Created cancel request.', request.toObject());
            
            return callback(null, request, user.account.profile.profileId);
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

function confirmAccountCreate(req, profile, callback) {
    logger.debug('Creating account with profile', profile);
    UserController.setAccountProfile(req.userId, req, profile, function(err, user) {
        if (err)
            return callback(err);
        
        req.success(req.toAccount.amount, function(err) {
            callback(null, req);
        });
    });
}

function confirmAccountModify(req, profileUpdate, immedCharge, callback) {
    logger.debug('Modifying account with profile updates', profileUpdate);
    UserController.setAccountProfile(req.userId, req, profileUpdate, function(err, user) {
        if (err)
            return callback(err);
        
        req.success(immedCharge, function(err) {
            callback(null, req);
        });
    });
}

function confirmAccountCancel(req, profileUpdate, callback) {
    logger.debug('Cancelling account with profile updates', profileUpdate);
    UserController.setAccountProfile(req.userId, req, profileUpdate, function(err, user) {
        if (err)
            return callback(err);
        
        req.success(0.0, function(err) {
            callback(null, req);
        });
    });
}