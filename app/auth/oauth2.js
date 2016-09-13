var oauth2orize = require('oauth2orize');
var passport = require('passport');

var UserController = require('../controllers/user');
var AccessTokenController = require('../controllers/accessToken');
var RefreshTokenController = require('../controllers/refreshToken');

var TTL = require('../../config/config.js').tokenTTL;

var logger = require('../utils/logger.js');
var Error = require('../utils/error.js');

var server = oauth2orize.createServer();

var removeToken = function(user, clientId, callback) {
    AccessTokenController.removeToken(user._id, clientId, function(err, data) {
        if (err)
            return callback(err);
        
        RefreshTokenController.removeToken(user._id, clientId, function(err, data) {});
        
        return callback(null, data);
    });
}

var createToken = function(user, clientId, done) {
    logger.debug('Creating token for user [%s] with client [%s]', user._id, clientId);
    
    RefreshTokenController.createToken(user._id, clientId, function(err, rToken) {
       if (err)
           return done(err);
        
        AccessTokenController.createToken(user._id, clientId, function(err, aToken) {
           if (err)
               return done(err);
            
             done(null, aToken.token, rToken.token, { 'expires_in': TTL, scope: '*' });
        });
    });
}

server.exchange(oauth2orize.exchange.password(function(client, username, password, scope, done) {
    logger.debug('Exchanging username and password for token with client [%s]', client._id);
    UserController.getUserByEmail(username, function(err, user) {
        if (err) 
            return done(err);
        
        if (!user) 
            return done(null, false);
        
        if (!user.validPassword(password)) 
            return done(null, false);

        return createToken(user, client._id, done);
    });
}));

server.exchange(oauth2orize.exchange.refreshToken(function(client, refreshToken, scope, done) {
    logger.debug('Exchanging refresh token for token with client [%s]', client._id);
    RefreshToken.getRefreshToken(refreshToken, function(err, token) {
        if (err) 
            return done(err);
        
        if (!token) 
            return done(null, false);
        
        UserController.getUserInternal(token.userId, function(err, user) {
            if (err) 
                return done(err);
            
            if (!user) 
                return done(null, false);
            
             return createToken(user, client._id, done);
        });
    });
}));

exports.createToken = createToken;
exports.removeToken = removeToken;

// token endpoint
exports.token = [
    passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
    server.token(),
    server.errorHandler()
]