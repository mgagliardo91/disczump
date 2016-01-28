var path = require('path');
var DiscController = require('./controllers/disc');
var UserController = require('./controllers/user');
var AdminController = require('./controllers/admin');
var EventController = require('./controllers/event');
var Recover = require('./utils/recover');
var Confirm = require('./utils/confirm');
var Mailer = require('./utils/mailer.js');
var DevController = require('../app/controllers/development.js')
var development = require('../config/config.js').development;
var Socket = require('../config/socket.js');
var socketManager = require('../app/objects/socketCache.js');
var localConfig = require('../config/localConfig.js');

// app/routes.js
module.exports = function(app, passport, gridFs) {

    // Site
    
    app.get('/', function(req, res) {
       res.render('home', {
           isRelease: localConfig.release,
           isIndex: true,
           serverURL : localConfig.serverURL,
           reqScroll: req.device.isMobile
       });
    });
    
    app.get('/sitemap.xml', function(req, res) {
        res.sendfile(path.resolve(__dirname + '/../private/sitemap.xml'));
    });
    
    // app.get('/test', function(req, res) {
    //   res.render('test', {
    //       isRelease: localConfig.release
    //   });
    // });
    
    app.get('/terms', function(req, res) {
       res.render('terms', {
           isRelease: localConfig.release
       });
    });
    
    app.get('/faq', function(req, res) {
       res.render('faq', {
           isRelease: localConfig.release
       });
    });
    
    app.get('/privacy', function(req, res) {
       res.render('privacy', {
           isRelease: localConfig.release
       });
    });

    app.get('/dashboard', isLoggedIn, function(req, res) {
        
        if (req.device.isMobile) {
            req.user.updateAccessCount('mobile');
            return res.render('mobile/index', {
                layout: 'mobile',
                isRelease: localConfig.release,
                serverURL : localConfig.serverURL
            });
        }
        
        var firstUse = req.user.local.accessCount.desktop < 1;
        req.user.updateAccessCount('desktop');
        
        return res.render('dashboard', {
            isRelease: localConfig.release,
            user : req.user,
            userString: req.user.accountToString(),
            admin: req.session.admin,
            firstUse: firstUse,
            isDashboard : true,
            serverURL : localConfig.serverURL,
            isLinked : typeof(req.user.facebook.id) !== 'undefined',
            info: {
                title: req.flash('infoTitle'),
                text: req.flash('infoText'),
                error: req.flash('infoError')
            }
        });
    });
    
    
    app.get('/dashboard/*', isLoggedIn, function(req, res) {
        if (req.device.isMobile) {
            req.user.updateAccessCount('mobile');
            
            return res.render('mobile/index', {
                layout: 'mobile',
            });
        } else {
            res.redirect('/dashboard');
        }
    });
    
    app.get('/account/delete', isLoggedIn, function(req, res) {
        Confirm.initializeConfirmDelete(req.user._id, function(err, user, message) {
            if (err) {
                return res.render('notification', {
                    isRelease: localConfig.release,
                    isMobile: req.device.isMobile,
                    user : req.user,
                    userString: req.user.accountToString(),
                    notify : {
                       pageHeader: err.error.type,
                       header: err.error.type,
                       strong: err.error.message,
                       text: 'Unable to delete account. Please try again or contact support.',
                       buttonIcon: 'fa-home',
                       buttonText: 'Return Home',
                       buttonLink: '/'
                   }
               });
            }
            
            Mailer.sendMail(user.local.email, 'disc|zump Account Deletion', message, function(err, result) {
                if (err) {
                    return res.render('notification', {
                        isRelease: localConfig.release,
                        isMobile: req.device.isMobile,
                        user : req.user,
                        userString: req.user.accountToString(),
                        notify : {
                           pageHeader: err.error.type,
                           header: err.error.type,
                           strong: err.error.message,
                           text: 'Error attempting to send confirmation email. Please try again or contact support.',
                           buttonIcon: 'fa-home',
                           buttonText: 'Return Home',
                           buttonLink: '/'
                       }
                    });
                }
                    
                return res.render('notification', {
                    isRelease: localConfig.release,
                    isMobile: req.device.isMobile,
                    user : req.user,
                    userString: req.user.accountToString(),
                    notify : {
                        pageHeader: 'Confirm Deletion',
                        header: 'Delete Account',
                        strong: 'We\'re sorry to see you go, but you\'re not there yet!',
                        text: 'An email has been sent to your address' + 
                            ' with a link to confirm the request to delete your account.',
                        strong2: 'Why do we require email confirmation? ',
                        text2: 'Accidents can happen. Your request to delete your account has been submitted and is pending your confirmation. ' + 
                            'You will need to confirm the request by clicking on the link that you will receive at the email address associated ' + 
                            'with this account. The request will automatically revert in one hour.',
                       buttonIcon: 'fa-home',
                       buttonText: 'Dashboard',
                       buttonLink: '/dashboard'
                   }
                });
            });
        });
    });
    
    app.get('/account/delete/:authorizationId', function(req, res) {
        Confirm.confirmDelete(req.params.authorizationId, gridFs, function(err, user){
            if (err) {
                req.flash('error', err.error.message);
                return res.redirect('/dashboard');
            } else {
                EventController.addEvent(user._id, EventController.Types.AccountDeletion, 'Account has been deleted for user [' + user._id + '].');
                return res.render('notification', {
                    isRelease: localConfig.release,
                    isMobile: req.device.isMobile,
                    notify : {
                        pageHeader: 'Confirm Deletion',
                        header: 'Account Deleted',
                        strong: 'You\'re account has been deleted!',
                        text: 'We hope you have enjoyed using disc|zump.',
                       buttonIcon: 'fa-home',
                       buttonText: 'Return Home',
                       buttonLink: '/'
                   }
                });
            }
        });
    });
    
    app.get('/disc/:discid', function(req, res) {
        var userId = undefined;
        if (req.user) userId = req.user._id;
        var userString = req.user ? req.user.accountToString() : undefined;
    
        DiscController.getDisc(userId, req.params.discid, function(err, disc) {
            if (err) {
               return res.render('notification', {
                    isRelease: localConfig.release,
                    isMobile: req.device.isMobile,
                    user : req.user,
                    userString : userString,
                    notify : {
                       pageHeader: err.error.type,
                       header: err.error.type,
                       strong: err.error.message,
                       text: 'Unable to show public view of disc [' + req.params.discid + '].',
                       buttonIcon: 'fa-home',
                       buttonText: 'Return Home',
                       buttonLink: '/'
                   }
               });
            }
            
            UserController.getUser(disc.userId, function(err, owner){
                if (err) {
                    return res.render('notification', {
                        isRelease: localConfig.release,
                        isMobile: req.device.isMobile,
                        user : req.user,
                        userString : userString,
                       notify : {
                           pageHeader: err.error.type,
                           header: err.error.type,
                           strong: err.error.message,
                           text: 'The owner of this disc has not made it visible to the public.',
                           buttonIcon: 'fa-home',
                           buttonText: 'Return Home',
                           buttonLink: '/'
                       }
                   });
                }
                
                if (req.device.isMobile) {
                    return res.render('mobile/discview', {
                        layout: 'mobile',
                        isRelease: localConfig.release,
                        disc: disc,
                        discStr: disc.toDescString(),
                        user : req.user,
                        owner : owner,
                        userString : userString,
                        serverURL : localConfig.serverURL,
                        primaryImage: disc.getImage()
                    });
                }
                
                return res.render('discview', {
                    isRelease: localConfig.release,
                    disc: disc,
                    discStr: disc.toDescString(),
                    user : req.user,
                    owner : owner,
                    userString : userString,
                    serverURL : localConfig.serverURL,
                    primaryImage: disc.getImage()
                });
            });
        }) ;
    });
    
    app.get('/confirm/:authorizationId', function(req, res, next){
            Confirm.confirmAccount(req.params.authorizationId, function(err, user){
                if (err) {
                    req.flash('error', err.error.message);
                    return res.redirect('/login');
                }
                
                if (!user.facebook.id) {
                    req.session.redirect = '/account/link';
                }
                
                if (user.totalAccessCount() == 0) {
                    DevController.createDiscData(gridFs, user._id, function(err) {
                        doLogIn(req, res, next, err, user);
                    });
                } else {
                    doLogIn(req, res, next, err, user);
                }
            });
        });
    
    app.get('/confirm/user/:userId', function(req, res){
             Confirm.initializeConfirmAccount(req.params.userId, function(err, user, message) {
                if (err) {
                    req.flash('error', err.error.message);
                    return res.redirect('/login');
                }
                
                Mailer.sendMail(user.local.email, 'disc|zump Account Confirmation', message, function(err, result) {
                   if (err) {
                        req.flash('error', err.error.message);
                        return res.redirect('/login');
                    }
                        
                    return res.render('notification', {
                        isRelease: localConfig.release,
                        isMobile: req.device.isMobile,
                        notify : {
                            pageHeader: 'Confirm Account',
                            header: 'Account Confirmation',
                            strong: 'You\'re almost there!',
                            text: 'An email has been sent to your address' + 
                                ' with a link to confirm your account.',
                            strong2: 'Why do we require email confirmation? ',
                            text2: 'We know you value your collection and by giving us a valid email address, ' + 
                                'we can ensure that you never lose access in the future.',
                           buttonIcon: 'fa-home',
                           buttonText: 'Return Home',
                           buttonLink: '/'
                       }
                    });
                });
            });
        });
        
    app.route('/recover')
        .get(function(req,res) {
            return res.render('userinput', {
                isRelease: localConfig.release,
                isMobile: req.device.isMobile,
                message: {
                    error: req.flash('error'),
                    info: req.flash('info')
                },
                userinput : {
                    pageHeader: 'Password Recovery',
                    header: 'Recover Password',
                    text: 'Enter your account email address and we will send you' + 
                        ' a link to reset your password.',
                    route: '/recover',
                    btnText: 'Recover',
                    input: [
                        {icon: 'fa-envelope-o', id : 'email', name: 'email', type: 'email', placeholder: 'Email'}
                    ]
               }
            });
        })
        
        .post(function(req, res){
            Recover.initializeRecovery(req.body.email, function(err, message) {
                if (err) {
                  req.flash('error', err.error.message);
                  return res.redirect('/recover');
                }
                
                Mailer.sendMail(req.body.email, 'disc|zump Password Recovery', message, function(err, result) {
                    if (err) {
                      req.flash('error', err.error.message);
                      return res.redirect('/recover');
                    }
                        
                    return res.render('notification', {
                        isRelease: localConfig.release,
                        isMobile: req.device.isMobile,
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

    app.route('/recover/:authorizationId')
        .get(function(req, res) {
            Recover.validateRecovery(req.params.authorizationId, function(err, recover) {
                if (err) {
                    req.flash('info', 'Unable to retrieve request. Please fill out a new request below.');
                    return res.redirect('/recover');
                }
                
                return res.render('userinput', {
                    isRelease: localConfig.release,
                    isMobile: req.device.isMobile,
                    message: {
                        error: req.flash('error')
                    },
                    userinput : {
                        pageHeader: 'Password Reset',
                        header: 'Reset Password',
                        text: 'Enter a new password below to reset your account password.',
                        route: '/recover/' + recover._id,
                        btnText: 'Reset',
                        input: [
                            {icon: 'fa-key', id : 'new-password', name: 'password', type: 'password', placeholder: 'Password'},
                            {icon: 'fa-key', id : 'verify-password', type: 'password', placeholder: 'Verify Password'}
                        ]
                   }
                });
            })
        })
        
        .post(function(req, res) {
            Recover.resetPassword(req.params.authorizationId, req.body.password, function(err, user) {
                if (err) {
                    req.flash('error', err.error.message);
                    return res.redirect('/recover');
                }
                
                req.flash('info', 'Password successfully reset.');
                res.redirect('/login');
            })
        });
        
    app.route('/reset')
        .post(isLoggedIn, function(req, res) {
             UserController.tryResetPassword(req.user._id, 
                 req.body.oldPassword, 
                 req.body.password, 
                 function(err, user) {
                     if (err) {
                        req.flash('error', err.error.message);
                        return res.redirect('/reset');
                     }
                     
                    return res.render('notification', {
                        isRelease: localConfig.release,
                        isMobile: req.device.isMobile,
                        user : req.user,
                        userString: req.user.accountToString(),
                        notify : {
                           pageHeader: 'Reset Password',
                           header: 'Reset Password',
                           strong: 'Your password has been reset successfully!',
                           text: 'You may not close this window or click the button' + 
                                ' below to go to your dashboard.',
                           buttonIcon: 'fa-home',
                           buttonText: 'Return Home',
                           buttonLink: '/dashboard',
                           popup: req.body.popup
                       }
                    });
                 });
        })
        .get(isLoggedIn, function(req, res) {
            return res.render('userinput', {
                isRelease: localConfig.release,
                isMobile: req.device.isMobile,
                user : req.user,
                userString: req.user.accountToString(),
                message: {
                    error: req.flash('error')
                },
                userinput : {
                    pageHeader: 'Password Reset',
                    header: 'Reset Password',
                    text: 'Enter your current password and a new password below to continue.',
                    route: '/reset/',
                    btnText: 'Reset',
                    input: [
                        {icon: 'fa-key', id : 'current-password', name: 'oldPassword', type: 'password', placeholder: 'Current Password'},
                        {icon: 'fa-key', id : 'new-password', name: 'password', type: 'password', placeholder: 'New Password'},
                        {icon: 'fa-key', id : 'verify-password', type: 'password', placeholder: 'Verify Password'}
                    ]
               }
            });
        });
    
    app.get('/unsubscribe', function(req, res) {
        UserController.getUserFromHash(req.query.hashId, function(err, user) {
            if (err) {
                 return res.render('notification', {
                    isRelease: localConfig.release,
                    isMobile: req.device.isMobile,
                    notify : {
                        pageHeader: err.error.type,
                        header: err.error.type,
                        strong: err.error.message,
                        text: 'Please try again.',
                        buttonIcon: 'fa-home',
                        buttonText: 'Return Home',
                        buttonLink: '/dashboard'
                   }
                });
            }
            
            user.preferences.notifications.newMessage = false;
            user.save();
            
            return res.render('notification', {
                isRelease: localConfig.release,
                isMobile: req.device.isMobile,
                notify : {
                   pageHeader: 'Preferences Updated',
                   header: 'Preferences Updated',
                   strong: 'You have been successfully unsubscribed from new message notifications!',
                   text: 'You can change this preference at any time under the preferences area of your dashboard.',
                   buttonIcon: 'fa-home',
                   buttonText: 'Return Home',
                   buttonLink: '/dashboard'
               }
            });
        });
    });
    
    
    // show the login form
    app.get('/login', function(req, res) {
        if (req.isAuthenticated()) {
            return res.redirect('/dashboard');
        }
        
        // render the page and pass in any flash data if it exists
        res.render('login', {
            isRelease: localConfig.release,
            redirect: req.flash('redirect'),
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
        req.session.redirect = req.body.redirect;
        passport.authenticate('local-login', function(err, user, info) {
            doLogIn(req, res, next, err, user, info);
        })(req, res, next);
    });
    
    // show the signup form
    app.get('/signup', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('signup', {
            isRelease: localConfig.release,
            isMobile: req.device.isMobile,
            email: req.flash('email'),
            username: req.flash('username'),
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
        
        passport.authenticate('local-signup', function(err, user, info) {
            req.flash('email', req.body.email);
            req.flash('username', req.body.username);
            req.flash('alias', req.body.alias);
            req.flash('pdgaNumber', req.body.pdgaNumber);
            
            if (err)
                return next(err);
                
            if (!user) {
                return res.redirect('/signup');
            } else
                return res.redirect('/confirm/user/' + user._id);
        })(req, res, next);
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/login');
    });

    app.get('/account/link', isLoggedIn, function(req, res) {
        if (req.user.facebook.id) {
            res.render('linkfacebook', {
                isRelease: localConfig.release,
                isMobile: req.device.isMobile,
                user : req.user,
                userString: req.user.accountToString(),
                unlink: true,
                popup: req.query.popup
           });
        } else {
            res.render('linkfacebook', {
                isRelease: localConfig.release,
                isMobile: req.device.isMobile,
                user : req.user,
                userString: req.user.accountToString(),
                popup: req.query.popup
            });
        }
    });
    
    app.get('/account/link/facebook', isLoggedIn, passport.authorize('facebook', 
        { scope : ['email', 'user_photos'] }));
    
    app.get('/account/unlink/facebook', isLoggedIn, function(req, res) {
        var user = req.user;
        user.facebook.token = undefined;
        user.facebook.id = undefined;
        user.facebook.image = undefined;
        user.save(function(err) {
            user.addEvent(EventController.Types.AccountUnlink, 'The account has been unlinked from Facebook.');
            
            if (socketManager.hasSockets(user._id)) {
                Socket.sendCallback(user._id, 'FacebookLink', 'Your Facebook account is no longer linked.');
            } else {
                req.flash('infoTitle', 'Unlink Successful');
                req.flash('infoText', 'Your Facebook account is no longer linked.');
            }
            
            res.redirect('/dashboard');
        });
    });
    
    app.post('/auth/facebook', function(req, res, next) {
        req.session.redirect = req.body.redirect;
        passport.authenticate('facebook', { scope : ['email', 'user_photos'] })(req, res, next);
    });

    app.get('/auth/facebook/callback', function(req, res, next) {
        passport.authenticate('facebook', function(err, user, info) {
            doLogIn(req, res, next, err, user, info);
        })(req, res, next);
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
};

function doLogIn(req, res, next, err, user, info) {
    if (err)
        return next(err);
        
    if (!user) {
        req.flash('redirect', req.session.redirect);
        return res.redirect('/login');
    } else {
        if (!user.local.active) {
            req.flash('info', 'Account not activated.');
            req.flash('link.url', '/confirm/user/' + user._id);
            req.flash('link.text', 'Resend Activation');
            return res.redirect('/login');
        } else {
            var redirect = req.session.redirect;
            req.session.redirect = undefined;
            
            if (req.user && req.user._id == user._id) {
                if (req.flash('infoTitle') == 'FacebookLink' && socketManager.hasSockets(req.user._id)) {
                  req.flash('infoTitle', undefined);
                  req.flash('infoText', undefined);
                  Socket.sendCallback(req.user._id, 'FacebookLink', 'Your Facebook account is now linked.');
                }
                
                if (redirect) {
                  return res.redirect(redirect);
                }
              
                return res.redirect('/dashboard');
            } else {
                req.logIn(user, function(err) {
                    if (err) {
                      req.flash('error', err);
                      req.flash('redirect', redirect);
                      return res.redirect('/login');
                    }
                    
                    AdminController.validateAdmin(req.user._id, function(err, admin) {
                        req.session.admin = (!err && admin) ? admin : undefined;
                        
                        if (redirect) {
                          return res.redirect(redirect);
                        }
                        
                        return res.redirect('/dashboard');
                    });
                });
            }
        }
    }
}

function isLoggedIn(req, res, next) {
    
    if (req.isAuthenticated())
        return next();
    
    req.flash('redirect', req.url);
    res.redirect('/login');
}