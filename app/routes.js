var Disc = require('./controllers/disc');
var Recover = require('./utils/recover');
var Confirm = require('./utils/confirm');
var Mailer = require('./utils/mailer.js');
var configRoutes = require('../config/config.js').routes;

// app/routes.js
module.exports = function(app, passport) {

    // Site
    
    app.get('/', isLoggedIn, function(req, res) {
        res.redirect('/dashboard');
    });

    app.get('/dashboard', isLoggedIn, function(req, res) {
        return res.render('dashboard', {
            user : req.user
        });
    });
    
    app.get('/' + configRoutes.confirmAccount + '/:authorizationId', function(req, res){
            Confirm.confirmAccount(req.params.authorizationId, function(err, confirm){
                if (err)
                    req.flash('error', err);
                else
                    req.flash('info', 'Account confirmation successful.');
                
                return res.redirect('/login');
            });
        });
    
    app.get('/' + configRoutes.confirmAccount + '/user/:userId', function(req, res){
             Confirm.initializeConfirm(req.params.userId, function(err, user, message) {
                if (err)
                    return res.send(err);
                
                Mailer.sendMail(user.local.email, 'DiscZump Account Confirmation', message, function(err, result) {
                  if (err)
                        return res.send(err);
                        
                    return res.render('notification', {
                        notify : {
                            pageHeader: 'Confirm Account',
                            header: 'Account Confirmation',
                            text: 'A confirmation email has been sent with a link to confirm your account.'
                        }
                    });
                });
            });
        });
    
    app.route('/' + configRoutes.resetPassword)
        .get(function(req,res) {
            return res.render('recover', {
                    message: {
                        error: req.flash('error')
                    }
            });
        })
        
        .post(function(req, res){
            Recover.initializeRecovery(req.body.username, function(err, message) {
                if (err) {
                  req.flash('error', err);
                  return res.redirect('/' + configRoutes.resetPassword);
                }
                
                Mailer.sendMail(req.body.username, 'DiscZump Password Recovery', message, function(err, result) {
                    if (err) {
                      req.flash('error', err);
                      return res.redirect('/' + configRoutes.resetPassword);
                    }
                        
                    return res.render('notification', {
                        notify : {
                            pageHeader: 'Recover Account',
                            header: 'Account Recovery',
                            text: 'An email has been set with instructions on how to recover your account.'
                        }
                    });
                });
            });
        });
    
    app.route('/' + configRoutes.resetPassword + '/:authorizationId')
        .get(function(req, res) {
            Recover.validateRecovery(req.params.authorizationId, function(err, recover) {
                if (err)
                    return res.redirect('/');
                
                return res.render('reset', {
                    recover: recover,
                    message: {
                        error: req.flash('error')
                    }
                });
            })
        })
        
        .post(function(req, res) {
            Recover.resetPassword(req.params.authorizationId, req.body.password, function(err, user) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect(req.params.authorizationId);
                }
                
                res.redirect('/login');
            })
        });
    
    
    // show the login form
    app.get('/login', function(req, res) {
        if (req.isAuthenticated())
            res.redirect('/dashboard');
        
        // render the page and pass in any flash data if it exists
        res.render('login', {
            route: {
                url: 'signup',
                text: 'Sign Up'
            },
            message: {
                error: req.flash('error'),
                info: req.flash('info'),
                link: {
                    url: req.flash('link.url'),
                    text: req.flash('link.text')
                }
            }
            
        }); 
    });
    
    // process the login form
    app.post('/login', function(req, res, next) {
        passport.authenticate('local-login', function(err, user, info) {
            if (err)
                return next(err);
                
            if (!user)
                return res.redirect('/login');
            else {
                if (!user.local.active) {
                    req.flash('info', 'Account not activated.');
                    req.flash('link.url', '/' + configRoutes.confirmAccount + '/user/' + user._id);
                    req.flash('link.text', 'Resend Activation');
                    return res.redirect('/login');
                } else {
                    req.logIn(user, function(err) {
                      if (err) {
                          req.flas('error', err);
                          return res.redirect('/login');
                      }
                      
                      return res.redirect('/dashboard');
                    });
                }
            }
        })(req, res, next);
    });
    
    // show the signup form
    app.get('/signup', function(req, res, nex) {

        // render the page and pass in any flash data if it exists
        res.render('signup', {
            route: {
                url: 'login',
                text: 'Log In'
            },
            message: {
                error: req.flash('error'),
                info: req.flash('info')
            }
        });
    });   
    
    // process the signup form
    app.post('/signup', function(req, res, next) {
        passport.authenticate('local-signup', function(err, user, info) {
            if (err)
                return next(err);
                
            if (!user)
                return res.redirect('/signup');
            else
                return res.redirect('/' + configRoutes.confirmAccount + '/user/' + user._id);
        })(req, res, next);
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/login');
    });

    // =====================================
    // FACEBOOK ROUTES =====================
    // =====================================
    // route for facebook authentication and login
    app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

    // handle the callback after facebook has authenticated the user
    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect : '/profile',
            failureRedirect : '/'
        }));

    // route for logging out
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();
    
    // if they aren't redirect them to the home page
    res.redirect('/login');
}