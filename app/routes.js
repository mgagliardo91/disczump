var Disc = require('./controllers/disc');
var UserController = require('./controllers/user');
var EventController = require('./controllers/event');
var DataItemController = require('./controllers/dataItem');
var Recover = require('./utils/recover');
var Confirm = require('./utils/confirm');
var Mailer = require('./utils/mailer.js');
var DevController = require('../app/controllers/development.js')
var configRoutes = require('../config/config.js').routes;
var development = require('../config/config.js').development;
var fbGraph = require('fbgraph');

// app/routes.js
module.exports = function(app, passport, gridFs) {

    // Site
    
    app.get('/', function(req, res) {
       res.render('home', {
           isIndex: true
       });
    });
    
    app.post('/beta', function(req, res) {
        if (req.body.email) {
            DataItemController.createDataItem(req.body.email, function(err, email) {
                if (err) {
                    return res.render('notification', {
                        notify: {
                            pageHeader: err.error.message.type,
                            header: err.error.message.type,
                            strong: err.error.message.message,
                            text: 'When we enter beta, you will receive instructions on how to create' + 
                                ' your personalized account.',
                            buttonIcon: 'fa-home',
                            buttonText: 'Return Home',
                            buttonLink: '/'
                        }
                       
                    });
                } else {
                    return res.render('notification', {
                        notify : {
                            pageHeader: 'Join Successful',
                            header: 'Join Successful',
                            strong: 'Your email has been successfully submitted to DiscZump!',
                            text: 'When we enter beta, you will receive instructions on how to create' + 
                                ' your personalized account.',
                            buttonIcon: 'fa-home',
                            buttonText: 'Return Home',
                            buttonLink: '/'
                        }
                    });
                }
            });
        } else {
            return res.redirect('/');
        }
    });

    app.get('/dashboard', isLoggedIn, function(req, res) {
        UserController.updateActivity(req.user._id);
        if (req.device.isMobile) {
            return res.render('mobile/dashboard', {
                user : req.user,
                isDashboard : true,
                isMobile: true
            });
        } else {
            return res.render('dashboard', {
                user : req.user,
                isDashboard : true,
                isLinked : typeof(req.user.facebook.id) !== 'undefined',
                info: {
                    title: req.flash('infoTitle'),
                    text: req.flash('infoText')
                }
            });
        }
        
        
    });
    
    app.get('/profile', isLoggedIn, function(req, res) {
        return res.render('profile', {
           user: req.user,
           isProfile : true
        });
    });
    
    app.get('/profile/delete', isLoggedIn, function(req, res) {
        UserController.deleteUser(req.user._id, gridFs, function(err, user) {
            if (err) {
                console.log(err);
                return res.redirect('/profile');
            }
            
            req.logout();
            return res.redirect('/');
        });
    });
    
    app.get('/test', function(req, res) {
       res.render('test', {
           isIndex: true
       });
    });
    
    app.get('/disc/:discid', function(req, res) {
        var userId = undefined;
        if (req.user) userId = req.user._id;
    
        Disc.getDisc(userId, req.params.discid, function(err, disc) {
            if (err) {
               return res.render('notification', {
                   notify : {
                       pageHeader: err.error.message.type,
                       header: err.error.message.type,
                       strong: err.error.message.message,
                       text: 'The owner of this disc has not yet made it visible to the public.',
                       buttonIcon: 'fa-home',
                       buttonText: 'Return Home',
                       buttonLink: '/'
                   }
               });
            }
            
            UserController.getAlias(disc.userId, function(err, alias){
                if (err) {
                    return res.render('notification', {
                       notify : {
                           pageHeader: err.error.message.type,
                           header: err.error.message.type,
                           strong: err.error.message.message,
                           text: 'The owner of this disc has not yet made it visible to the public.',
                           buttonIcon: 'fa-home',
                           buttonText: 'Return Home',
                           buttonLink: '/'
                       }
                   });
                }

                return res.render('viewdisc', {
                    disc: disc,
                    alias: alias,
                    isPublicPage: true
                });
            });
        }) ;
    });
    
    app.get('/' + configRoutes.confirmAccount + '/:authorizationId', function(req, res){
            Confirm.confirmAccount(req.params.authorizationId, function(err, user){
                if (err) {
                    req.flash('error', err.error.message);
                    return res.redirect('/login');
                } else {
                    
                    if (user.local.passcode) {
                        DevController.createDiscData(gridFs, user._id);
                    }
                    
                    req.login(user, function(err) {
                        if (err) {
                            req.flash('error', err);
                            return res.redirect('/login');
                        } 
                        
                        return res.redirect('/account/link');
                    });
                }
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
                            strong: 'You\'re almost there!',
                            text: 'An email has been sent to your address' + 
                                ' with a link to confirm your account.',
                            strong2: 'Why do we require email confirmation? ',
                            text2: 'We know you value your collection and by giving us a valid email, ' + 
                                'we can ensure that you never lose access in the future.',
                           buttonIcon: 'fa-home',
                           buttonText: 'Return Home',
                           buttonLink: '/'
                       }
                    });
                });
            });
        });
    
    app.route('/' + configRoutes.resetPassword)
        .get(function(req,res) {
            return res.render('recover', {
                    message: {
                        error: req.flash('error'),
                        info: req.flash('info'),
                        link: {
                            url: req.flash('link.url'),
                            text: req.flash('link.text')
                        }
                    }
            });
        })
        
        .post(function(req, res){
            Recover.initializeRecovery(req.body.username, function(err, message) {
                if (err) {
                  req.flash('error', err.error.message);
                  return res.redirect('/' + configRoutes.resetPassword);
                }
                
                Mailer.sendMail(req.body.username, 'DiscZump Password Recovery', message, function(err, result) {
                    if (err) {
                      req.flash('error', err.error.message);
                      return res.redirect('/' + configRoutes.resetPassword);
                    }
                        
                    return res.render('notification', {
                        notify : {
                           pageHeader: 'Recover Account',
                           header: 'Account Recovery',
                           strong: 'You\'re almost there!',
                           text: 'An email has been sent to your address' + 
                                ' with instructions on how to recover your account.',
                            strong2: 'Why? ',
                            text2: 'We value your privacy and use email as another step to ensure ' + 
                                'your collection remains with you.',
                           buttonIcon: 'fa-home',
                           buttonText: 'Return Home',
                           buttonLink: '/'
                       }
                    });
                });
            });
        });
    
    app.route('/' + configRoutes.resetPassword + '/:authorizationId')
        .get(function(req, res) {
            Recover.validateRecovery(req.params.authorizationId, function(err, recover) {
                if (err) {
                    req.flash('info', 'Unable to retrieve request. Please fill out a new request below.');
                    return res.redirect('/' + configRoutes.resetPassword);
                }
                    
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
                    req.flash('error', err.error.message);
                    return res.redirect(req.params.authorizationId);
                }
                
                res.redirect('/login');
            })
        });
    
    
    // show the login form
    app.get('/login', function(req, res) {
        if (req.isAuthenticated()) {
            return res.redirect('/dashboard');
        }
        
        // render the page and pass in any flash data if it exists
        res.render('login', {
            route: {
                url: 'signup',
                text: 'Sign Up'
            },
            isMobile: req.device.isMobile,
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
                
            if (!user) {
                req.flash('error', 'Invalid username or password. Please try again.');
                
                return res.redirect('/login');
            } else {
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
    app.get('/signup', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('signup', {
            username: req.flash('username'),
            zipCode: req.flash('zipCode'),
            alias: req.flash('alias'),
            pdgaNumber: req.flash('pdgaNumber'),
            route: {
                url: 'login',
                text: 'Sign In'
            },
            message: {
                error: req.flash('error'),
                info: req.flash('info')
            },
            beta: development.beta
        });
    });   
    
    // process the signup form
    app.post('/signup', function(req, res, next) {
        
        if (development.beta) { 
            // validate passcode 
            if (!req.body.passcode || (req.body.passcode != development.passcode)) {
                req.flash('error', 'Invalid passcode. Please try again.');
                req.flash('username', req.body.username);
                req.flash('zipCode', req.body.zipCode);
                req.flash('alias', req.body.alias);
                req.flash('pdgaNumber', req.body.pdgaNumber);
                return res.redirect('/signup');
            }
        }
        
        passport.authenticate('local-signup', function(err, user, info) {
            req.flash('username', req.body.username);
            req.flash('zipCode', req.body.zipCode);
            req.flash('alias', req.body.alias);
            req.flash('pdgaNumber', req.body.pdgaNumber);
            
            if (err)
                return next(err);
                
            if (!user) {
                return res.redirect('/signup');
            } else
                return res.redirect('/' + configRoutes.confirmAccount + '/user/' + user._id);
        })(req, res, next);
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/login');
    });

    app.get('/account/link', isLoggedIn, function(req, res) {
        if (req.user.facebook.id) {
            res.render('linkfacebook', {
               unlink: true
           });
        } else {
            res.render('linkfacebook');
        }
    });
    
    app.get('/account/link/facebook', isLoggedIn, passport.authorize('facebook', 
        { scope : ['email', 'user_photos'] }));
    
    app.get('/account/link/facebook/callback', isLoggedIn,
            passport.authorize('facebook', {
                successRedirect : '/dashboard',
                failureRedirect : '/account/link'
            }));
    
    app.get('/account/unlink/facebook', isLoggedIn, function(req, res) {
        var user = req.user;
        user.facebook.token = undefined;
        user.facebook.id = undefined;
        user.local.image = undefined;
        user.save(function(err) {
            EventController.createEvent(user._id, EventController.types.AccountUnlink);
            req.flash('infoTitle', 'Unlink Successful');
            req.flash('infoText', 'Your Facebook account is no longer linked.');
            res.redirect('/dashboard');
        });
    });
    
    app.get('/auth/facebook', passport.authenticate('facebook', { scope : ['email', 'user_photos'] }));

    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect : '/dashboard',
            failureRedirect : '/login'
        }));

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
    
    app.get('*', function(req, res){
       res.redirect('/'); 
    });
};

function isLoggedIn(req, res, next) {

    if (req.isAuthenticated())
        return next();
        
    res.redirect('/');
}