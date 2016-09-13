var Passport;

var Error = require('../utils/error');

var AdminController = require('../controllers/admin');
var StatController = require('../controllers/statistics');
var UserController = require('../controllers/user');
var DiscController = require('../controllers/disc');
var FeedbackController = require('../controllers/feedback');

// app/oauthRoutes.js
module.exports = function(app, passport) {
    
    Passport = passport;
    
    app.route('/')
        .get(hasAccess, function(req, res) {
            
            StatController.getStats(function(err, stats) {
                if (err) {
                    return res.render('notification', {
                        layout: 'internal',
                        notify: {
                            pageHeader: err.error.type,
                            header: err.error.type,
                            strong: err.error.message,
                            buttonIcon: 'fa-wrench',
                            buttonText: 'Admin Console',
                            buttonLink: '/admin'
                        }
                    });
                }
                
                return res.render('internal/admin', {
                    layout: 'internal',
                    user : req.user,
                    image : req.user.accountToString().image,
                    stats: stats
                });
            });
        });
        
    app.route('/users/:userId')
        .get(hasAccess, function(req, res) {
            UserController.getUser(req.params.userId, function(err, user) {
                if (err) {
                    return res.render('notification', {
                        layout: 'internal',
                        notify: {
                            pageHeader: err.error.type,
                            header: err.error.type,
                            strong: err.error.message,
                            buttonIcon: 'fa-wrench',
                            buttonText: 'Admin Console',
                            buttonLink: '/admin'
                        }
                    });
                }
                
                return res.render('internal/user', {
                    layout: 'internal',
                    user : user,
                    image : req.user.accountToString().image
                });
            });
        });
    
    app.route('/users')
        .get(hasAccess, function(req, res) {
            return res.render('internal/users', {
                layout: 'internal',
                user : req.user,
                image : req.user.accountToString().image
            });
        });
        
    app.route('/discs')
        .get(hasAccess, function(req, res) {
            return res.render('internal/discs', {
                layout: 'internal',
                user : req.user,
                image : req.user.accountToString().image
            });
        });
    
    app.route('/events')
        .get(hasAccess, function(req, res) {
            return res.render('internal/events', {
                layout: 'internal',
                user : req.user,
                image : req.user.accountToString().image
            });
        });
        
    app.route('/feedback')
        .get(hasAccess, function(req, res) {
            return res.render('internal/feedback', {
                layout: 'internal',
                user : req.user,
                image : req.user.accountToString().image
            });
        });
        
    app.route('/feedback/:feedbackId')
        .get(hasAccess, function(req, res) {
            FeedbackController.getFeedback(req.params.feedbackId, function(err, feedback) {
                if (err) {
                    return res.redirect('/admin/feedback');
                }
                
                return res.render('internal/sendResponse', {
                    info: req.flash('info'),
                    error: req.flash('error'),
                    feedback: feedback,
                    layout: 'internal',
                    user : req.user,
                    image : req.user.accountToString().image
                });
            });
        });
        
    app.route('/reply')
        .get(hasAccess, function(req, res) {
            return res.render('internal/sendResponse', {
                layout: 'internal',
                user : req.user,
                image : req.user.accountToString().image
            });
        })
        .post(hasAccess, function(req, res) {
            FeedbackController.sendResponse(req.body.feedbackId, req.body.response, function(err) {
                if (err) {
                    console.log(err);
                    req.flash('error', 'Unable to send email response.');
                } else {
                    req.flash('info', 'Response successfully sent.');
                }
                
                return res.redirect('/admin/feedback/' + req.body.feedbackId);
            });
        });
}

function hasAccess(req, res, next) {
    
    if (req.isAuthenticated()) {
        
        if (req.admin) {
            return next();
        } else {
            AdminController.validateAdmin(req.user._id, function(err, admin) {
                if (err) {
                    return res.redirect('/login');
                }
                
                req.admin = admin;
                return next();
            });
        }
    } else {
        Passport.authenticate('bearer', { session : false }, function(err, user, info) {
            if (err) { return next(err); }
            
            if (!user) { 
                return res.redirect('/login');
            }
            
            req.user = user;
            
            AdminController.validateAdmin(req.user._id, function(err, admin) {
                if (err) {
                    return res.redirect('/login');
                }
                
                req.admin = admin;
                return next();
            });
        })(req, res, next);
    }
}