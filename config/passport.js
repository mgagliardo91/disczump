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
var fbGraph = require('fbgraph');

module.exports = function(passport) {

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
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
                        
                        fbGraph.get(user.facebook.id + "/picture?width=500&access_token=" + token, function(err, pic) {
                            if (!err && pic.image) {
                                user.local.image = pic.location;
                                user.save();
                            }
                        });
                        
                        UserController.updateAccessCount(user._id, (req.device.isMobile ? 'mobile' : 'desktop'));
                        
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
                
                var user = req.user;
                user.facebook.id = profile.id;
                user.facebook.token = profile.token;
                user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                user.facebook.email = profile.emails ? profile.emails[0].value : undefined;
                
                fbGraph.get(profile.id + "/picture?width=500&access_token=" + token, function(err, pic) {
                    if (!err && pic.image) {
                        user.local.image = pic.location;
                    }
                    
                    // save the user
                    user.save(function(err) {
                        if (err)
                            throw err;
                        
                        EventController.createEvent(user._id, EventController.types.AccountLink);
                        req.flash('infoTitle', 'Link Successful');
                        req.flash('infoText', 'You can now login using Facebook!');
                        return done(null, user);
                    });
                });
            }
        });

    }));
    
    passport.use('local-signup', new LocalStrategy({
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true
    },
    function(req, username, password, done) {
        process.nextTick(function() {
        
        User.findOne({ 'local.email' :  username }, function(err, user) {
            if (err)
                return done(err);

            if (user) {
                return done(null, false, req.flash('error', 'Email already in use.'));
                
            } else {
                
                if (!UserController.checkPassword(password)) {
                    return done(null, false, req.flash('error', 'Password must be 6 or more characters.'));
                }
                
                if (!_.has(req.body, 'zipCode') || !/^\d{5}$/.test(req.body.zipCode)) {
                    return done(null, false, req.flash('error', 'A valid zip code is required to create an account.'));
                }
                
                var newUser  = new User();
                
                newUser.local.email    = username;
                newUser.local.password = newUser.generateHash(password);
                newUser.local.zipCode  = req.body.zipCode;
                
                
                if (!(typeof req.body.alias === 'undefined')) {
                    newUser.local.alias = req.body.alias;
                }
                
                if (!(typeof req.body.pdgaNumber === 'undefined')) {
                    newUser.local.pdgaNumber = req.body.pdgaNumber;
                }
                
                if (req.body.passcode) {
                    newUser.local.passcode = req.body.passcode;
                }

                newUser.save(function(err) {
                    if (err)
                        throw err;
                        
                    logger.info('Created new user %s.', newUser.local.email);
                    newUser.addEvent('Account created.');
                    EventController.createEvent(newUser._id, EventController.types.AccountCreation);
                    
                    return done(null, newUser);
                });
            }

        });    

        });

    }));
    
    passport.use('local-login', new LocalStrategy({
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true
    },
    function(req, username, password, done) {

        User.findOne({ 'local.email' :  username }, function(err, user) {
            if (err)
                return done(err);

            if (!user) {
                return done(null, false, req.flash('loginMessage', 'No user found.'));
            }                

            if (!user.validPassword(password))
                return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));

            logger.info('User login accepted for %s', user.local.email);
            return done(null, user);
        });

    }));
    
    /// API OAUTH STRATEGY
    passport.use('api-login', new BasicStrategy(
        function(username, password, done) {

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
        
                    User.findById(token.userId, function(err, user) {
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
