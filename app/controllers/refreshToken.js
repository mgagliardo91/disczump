var crypto = require('crypto');
var RefreshToken = require('../models/refreshToken');
var Error = require('../utils/error');

module.exports = {
    removeToken: removeToken,
    createToken: createToken,
    getAccessToken: getRefreshToken
}


function removeToken(userId, clientId, callback) {
    RefreshToken.remove({userId: userId, clientId: clientId}, function(err) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback(null, {userId: userId});
    });
}

function createToken(userId, clientId, callback) {
    var token = new RefreshToken({
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

function getRefreshToken(refreshToken, callback) {
    AccessToken.findOne({token: refreshToken}, function(err, token) {
        if (err) {
            return Error.createError(err, Error.internalError);
        }
        
        return callback(null, token);
    });
}

function generateToken() {
    return crypto.randomBytes(32).toString('base64');
}