var AccountChangeRequest = require('../models/accountChangeRequest');
var Error = require('../utils/error');

var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

module.exports = {
    createRequest: createRequest,
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

function createFullRequest(userId, fromAccount, toAccount, immedCharge, callback) {
    AccountChangeRequest.remove({userId: userId, completed: false}, function(err) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
       var req = new AccountChangeRequest({
           userId: userId,
           fromAccount: fromAccount,
           toAccount: toAccount,
           immediateCharge: immedCharge,
           sessionId: generateId()
       });
        
        req.save(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, req);
        })
    });
}

function createRequest(userId, fromAccount, toAccount, callback) {
    return createFullRequest(userId, fromAccount, toAccount, 0.0, callback);
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