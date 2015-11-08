var Passport;
var Error = require('./utils/error');
var AdminController = require('./controllers/admin');
var StatController = require('./controllers/statistics');

// app/oauthRoutes.js
module.exports = function(app, passport) {
    
    Passport = passport;
    
    app.route('/')
        .get(hasAccess, function(req, res) {
             return res.render('internal/admin', {
                layout: 'internal',
                user : req.user,
                image : req.user.accountToString().image
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