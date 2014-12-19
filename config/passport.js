// config/passport.js

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

var configAuth = require('./auth');

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

        clientID        : configAuth.facebookAuth.clientID,
        clientSecret    : configAuth.facebookAuth.clientSecret,
        callbackURL     : configAuth.facebookAuth.callbackURL

    },
    function(token, refreshToken, profile, done) {

        process.nextTick(function() {

            User.findOne({ 'facebook.id' : profile.id }, function(err, user) {

                if (err)
                    return done(err);

                if (user) {
                    return done(null, user);
                } else {
                    var newUser            = new User();

                    newUser.facebook.id    = profile.id;              
                    newUser.facebook.token = token;                 
                    newUser.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                    newUser.facebook.email = profile.emails[0].value;

                    newUser.save(function(err) {
                        if (err)
                            throw err;

                        return done(null, newUser);
                    });
                }

            });
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
                
                var newUser  = new User();
                
                newUser.local.email    = username;
                newUser.local.password = newUser.generateHash(password);

                newUser.save(function(err) {
                    if (err)
                        throw err;
                    logger.info('Created new user %s.', newUser.local.email);
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
