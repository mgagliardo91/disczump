var AccountChangeRequest = require('../models/accountChangeRequest');
var Error = require('../utils/error');

var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

module.exports = {
    createFullRequest: createFullRequest,
    getRequest: getRequest,
    completeRequest: completeRequest,
    failRequest: failRequest
}

function generateId() {
    var id = '';
    for(var i = 0; i < 32; i++) {
        id += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return id;
}

function createFullRequest(userId, params, callback) {
    AccountChangeRequest.remove({userId: userId, completed: false}, function(err) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
       var req = new AccountChangeRequest({
           userId: userId,
           userEmail: params.email,
           fromAccount: params.fromAccount,
           toAccount: params.toAccount,
           immediateCharge: params.immedCharge || 0.0,
           promo: params.promo,
           sessionId: generateId()
       });
        
        if (params.paymentChange) {
            req.paymentChange = true;
        }
        
        req.save(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, req);
        })
    });
}

function getRequest(sessionId, callback) {
    AccountChangeRequest.findOne({sessionId: sessionId}, function(err, request) {
        if (err || !request)
            return callback(Error.createError(err, Error.internalError));
        
        return callback(null, request);
    });
}

function failRequest(sessionId, error, callback) {
    getRequest(sessionId, function(err, request) {
        if (err)
            return callback(err);
        
        request.fail(error, function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, request);
        });
    })
}

function completeRequest(sessionId, callback) {
    getRequest(sessionId, function(err, request) {
        if (err)
            return callback(err);
        
        request.success(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, request);
        });
    })
}