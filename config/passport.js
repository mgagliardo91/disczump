// config/passport.js
var _                       = require('underscore');
var LocalStrategy           = require('passport-local').Strategy;
var BasicStrategy           = require('passport-http').BasicStrategy;
var FacebookStrategy        = require('passport-facebook').Strategy;
var ClientPasswordStrategy  = require('passport-oauth2-client-password').Strategy;
var BearerStrategy          = require('passport-http-bearer').Strategy;

var User                    = require('../app/models/user');
var Client                  = require('../app/models/client');
var AccessToken             = require('../app/models/accessToken');
var RefreshToken            = require('../app/models/refreshToken');
var logger                  = require('./logger.js').logger;

var UserController          = require('../app/controllers/user');
var EventController          = require('../app/controllers/event');

var configAuth = require('./auth');
var localConfig = require('./localConfig');
var configRoutes = require('../config/config.js').routes;
var fbGraph = require('fbgraph');
var async = require('async');

module.exports = function(passport) {

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findOne({_id: id}, function(err, user) {
            done(err, user);
        });
    });
    
    passport.use(new FacebookStrategy({

        clientID            : configAuth.facebookAuth.clientID,
        clientSecret        : configAuth.facebookAuth.clientSecret,
        callbackURL         : localConfig.serverURL + '/auth/facebook/callback',
        passReqToCallback   : true

    },
    function(req, token, refreshToken, profile, done) {
        process.nextTick(function() {
            if (!req.user) {
                
                 User.findOne({'facebook.id' : profile.id }, function(err, user) {
    
                    if (err)
                        return done(err);
    
                    if (user) {
                        
                        if (!user.local.active) {
                            req.flash('link.url', '/' + configRoutes.confirmAccount + '/user/' + user._id);
                            req.flash('link.text', 'Resend Activation');
                            return done(null, null, req.flash('info', 'Account not activated.'));
                        }
                        
                        fbGraph.get(user.facebook.id + "/picture?width=500&access_token=" + token, function(err, pic) {
                            if (!err && pic.image) {
                                user.facebook.image = pic.location;
                                user.save();
                            }
                        });
                        
                        if (!user.facebook.token) {
                            user.facebook.token = token;
                            user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                            user.facebook.email = profile.emails ? profile.emails[0].value : undefined;

                            user.save(function(err) {
                                if (err)
                                    throw err;
                                return done(null, user);
                            });
                        } else {
                            return done(null, user);
                        }
                    } else {
                        return done(null, null, req.flash('error', 
                        'Cannot find an account associated with the facebook credentials.'));
                    }
    
                });
            } else {
                User.findOne({'facebook.id' : profile.id }, function(err, user) {
                    if (!err && user && user._id != req.user._id) {
                        req.flash('infoTitle', 'Link Failed')
                        req.flash('infoText', 'The Facebook account is already linked by another user.')
                        req.flash('infoError', true);
                        return done(null, null);
                    }
                    
                    var isLinking = typeof req.user.facebook.id === 'undefined';
                    
                    var user = req.user;
                    user.facebook.id = profile.id;
                    user.facebook.token = profile.token;
                    user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                    user.facebook.email = profile.emails ? profile.emails[0].value : undefined;
                    
                    fbGraph.get(profile.id + "/picture?width=500&height=500&type=square&access_token=" + token, function(err, pic) {
                        if (!err && pic.image) {
                            user.facebook.image = pic.location;
                        }
                        
                        // save the user
                        user.save(function(err) {
                            if (err)
                                throw err;
                            
                            if (isLinking) {
                                user.addEvent(EventController.Types.AccountLink, 'The account has been successfully linked to Facebook.');
                                req.flash('infoTitle', 'FacebookLink');
                                req.flash('infoText', 'You can now log in using Facebook!');
                            }
                            
                            return done(null, user);
                        });
                    });
                });
            }
        });

    }));
    
    passport.use('local-signup', new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true
    },
    function(req, username, password, done) {
        process.nextTick(function() {
            UserController.createUser({
                email: username,
                password: password,
                locLat: req.body.locLat,
                locLng: req.body.locLng,
                username:  req.body.username,
                firstName: req.body.firstName ? req.body.firstName : undefined,
                lastName: req.body.lastName ? req.body.lastName : undefined,
                pdgaNumber: req.body.pdgaNumber ? req.body.pdgaNumber : undefined,
                passcode: req.body.passcode ? req.body.passcode : undefined
            }, function(err, user) {
                if (err)
                    return done(null, false, req.flash('error', err.error.message));
                
                logger.info('Created new user %s.', user.local.email);
                user.addEvent(EventController.Types.AccountCreation, 'Account created.');
                EventController.addEvent(user._id, EventController.Types.AccountCreation, 'New account created for user [' + user._id + '].');
                
                return done(null, user);
            });
        });
    }));
    
    passport.use('local-login', new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true
    },
    function(req, username, password, done) {

        User.findOne({ 'local.email' :  username }, function(err, user) {
            if (err)
                return done(err);

            if (!user) {
        
                return done(null, false, req.flash('error', 'Invalid username or password. Please try again.'));
            }                

            if (!user.validPassword(password))
                return done(null, false, req.flash('error', 'Invalid username or password. Please try again.'));

            logger.info('User login accepted for %s', user.local.email);
            return done(null, user);
        });

    }));
    
    /// API OAUTH STRATEGY
    passport.use('api-login', new BasicStrategy(function(username, password, done) {

            Client.findOne({ clientId: username }, function(err, client) {
                if (err) { return done(err); }
                if (!client) { return done(null, false); }

                if (client.clientSecret != password) { return done(null, false); }
    
                logger.info('API Oauth acceptance for client %s', client.clientId);
                return done(null, client);
            });
    }));
    
    passport.use(new
         BearerStrategy(
            function(accessToken, done) {

                AccessToken.findOne({ token: accessToken }, function(err, token) {
                    if (err) { return done(err); }
                    if (!token) { return done(null, false); }
        
                    User.findOne({_id: token.userId}, function(err, user) {
                        if (err) { return done(err); }
                        if (!user) { return done(null, false, { message: 'Unknown user' }); }
        
                        var info = { scope: '*' }
                        logger.info('Bearer acceptance for user %s', user.local.email)
                        done(null, user, info);
                    });
                });
            }
        ));
    
    passport.use(new ClientPasswordStrategy(
        function(clientId, clientSecret, done) {
            Client.findOne({ clientId: clientId }, function(err, client) {
                if (err) { return done(err); }
                if (!client) { return done(null, false); }
                if (client.clientSecret != clientSecret) { return done(null, false); }
    
                
                logger.info('ClientPassword acceptance for client %s', client.clientId);
                return done(null, client);
            });
        }
    ));

};
