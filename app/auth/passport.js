var BasicStrategy = require('passport-http').BasicStrategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;

var logger = require('../utils/logger.js');

var AccessTokenController = require('../controllers/accessToken');
var ClientController = require('../controllers/client');
var UserController = require('../controllers/user');
var EventController = require('../controllers/event');

var configAuth = require('../../config/auth');
var localConfig = require('../../config/localConfig');
var TTL = require('../../config/config.js').tokenTTL;

module.exports = function(passport) {

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        UserController.getUser(id, function(err, user) {
            done(err, user);
        });
    });

    passport.use(new BasicStrategy({
        passReqToCallback: true
    }, function(req, username, password, done) {
        ClientController.getClientByCred(username, password, function(err, client) {
            if (err) {
                return done(err);
            }
            
            if (!client) {
                return done(null, false);
            }
            
            req.clientId = client._id;
            return done(null, client);
        });
    }));

    passport.use(new BearerStrategy({
        passReqToCallback: true
    }, function(req, accessToken, done) {
            AccessTokenController.getAccessToken(accessToken, function(err, token) {
                if (err) {
                    return done(err);
                }
                
                if (!token) {
                    return done(null, false);
                }
                
                token.updateAccess();
                
                UserController.getUserInternal(token.userId, function(err, user) {
                    if (err) {
                        return done(err);
                    }
                    if (!user) {
                        return done(null, false);
                    }
                    var info = {
                        scope: '*'
                    };
                    
                    req.clientId = token.clientId;
                    req.user = user;
                    done(null, user, info);
                });
            });
        }
    ));

    passport.use(new ClientPasswordStrategy({
        passReqToCallback: true
    }, function(req, clientId, clientSecret, done) {
            ClientController.getClientByCred(clientId, clientSecret, function(err, client) {
                if (err || !client) {
                    return done(err);
                }

                req.clientId = client._id;
                return done(null, client);
            });
        }
    ));

};
