var XDate = require('xdate');
var AccessToken = require('../models/accessToken');
var Error = require('../utils/error');

module.exports = {
    getAccessToken: getAccessToken,
    clearUnusedTokens: clearUnusedTokens
}

function getAccessToken(accessToken, callback) {
    AccessToken.findOne({token: accessToken}, function(err, token) {
        if (err) {
            return Error.createError(err, Error.internalError);
        }
        
        if (!token) {
            return Error.createError('Unable to locate access token.', Error.objectNotFoundError);
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