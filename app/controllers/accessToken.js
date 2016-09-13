var XDate = require('xdate');
var crypto = require('crypto');
var AccessToken = require('../models/accessToken');
var Error = require('../utils/error');

module.exports = {
    removeToken: removeToken,
    createToken: createToken,
    getAccessToken: getAccessToken,
    clearUnusedTokens: clearUnusedTokens
}

function removeToken(userId, clientId, callback) {
    AccessToken.remove({userId: userId, clientId: clientId}, function(err) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback(null, {userId: userId});
    });
}

function createToken(userId, clientId, callback) {
    var token = new AccessToken({
        token: generateToken(),
        userId: userId,
        clientId: clientId
    });

    token.save(function(err) {
        if (err)
            return callback(Error.createError(err, Error.internalError));

        return callback(null, token);
    });
}

function getAccessToken(accessToken, callback) {
    AccessToken.findOne({token: accessToken}, function(err, token) {
        if (err) {
            return Error.createError(err, Error.internalError);
        }
        
        return callback(null, token);
    });
}

function clearUnusedTokens(callback) {
    var cutoff = new XDate();
    cutoff.addHours(-1);
    
    AccessToken.remove({lastAccess: {$lt: cutoff.toDate()}}, function(err) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback();
    });
}

function generateToken() {
    return crypto.randomBytes(32).toString('base64');
}