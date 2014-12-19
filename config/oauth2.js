var oauth2orize         = require('oauth2orize');
var passport            = require('passport');
var crypto              = require('crypto');
var User                = require('../app/models/user');
var Client              = require('../app/models/client');
var AccessToken         = require('../app/models/accessToken');
var RefreshToken        = require('../app/models/refreshToken');
var TTL                 = require('./config.js').tokenTTL;
var logger = require('./logger.js').logger;

// create OAuth 2.0 server
var server = oauth2orize.createServer();

// Exchange username & password for access token.
server.exchange(oauth2orize.exchange.password(function(client, username, password, scope, done) {

    User.findOne({ 'local.email': username }, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        if (!user.validPassword(password)) { return done(null, false); }

        RefreshToken.remove({ userId: user._id, clientId: client._id }, function (err) {
            if (err) return done(err);
        });
        AccessToken.remove({ userId: user._id, clientId: client._id }, function (err) {
            if (err) return done(err);
        });

        var accessToken = new AccessToken({ token: generateToken(), clientId: client._id, userId: user._id });
        var refreshToken = new RefreshToken({ token: generateToken(), clientId: client._id, userId: user._id });
        
        refreshToken.save(function (err) {
            if (err) { return done(err); }
        });
        
        var info = { scope: '*' }
        accessToken.save(function (err, token) {
            if (err) { return done(err); }
            done(null, token.token, refreshToken.token, { 'expires_in': TTL });
        });
    });
}));

// Exchange refreshToken for access token.
server.exchange(oauth2orize.exchange.refreshToken(function(client, refreshToken, scope, done) {

    RefreshToken.findOne({ token: refreshToken }, function(err, token) {
        if (err) { return done(err); }
        if (!token) { return done(null, false); }
        if (!token) { return done(null, false); }

        User.findById(token.userId, function(err, user) {
            if (err) { return done(err); }
            if (!user) { return done(null, false); }

            RefreshToken.remove({ userId: user._id, clientId: client._id }, function (err) {
                if (err) return done(err);
            });
            AccessToken.remove({ userId: user._id, clientId: client._id }, function (err) {
                if (err) return done(err);
            });

            var accessToken = new AccessToken({ token: generateToken(), clientId: client._id, userId: user._id });
            var refreshToken = new RefreshToken({ token: generateToken(), clientId: client._id, userId: user._id });
            refreshToken.save(function (err) {
                if (err) { return done(err); }
            });
            
            var info = { scope: '*' }
            accessToken.save(function (err, token) {
                if (err) { return done(err); }
                done(null, token.token, refreshToken.token, { 'expires_in': TTL });
            });
        });
    });
}));

// token endpoint
exports.token = [
    passport.authenticate(['api-login', 'oauth2-client-password'], { session: false }),
    server.token(),
    server.errorHandler()
]

function generateToken() {
    return crypto.randomBytes(32).toString('base64');
}