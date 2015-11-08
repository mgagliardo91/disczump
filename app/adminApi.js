var Error = require('./utils/error');
var AdminController = require('./controllers/admin');
var StatController = require('./controllers/statistics');

// app/oauthRoutes.js
module.exports = function(app) {
    
    app.route('/statistics/user')
        .get(hasAccess, function(req, res) {
             StatController.getUserStats(function(err, stats) {
                if (err)
                    return res.json(err);
                
                return res.json(stats);
             });
        });
    
    app.route('/statistics/disc')
        .get(hasAccess, function(req, res) {
             StatController.getDiscStats(function(err, stats) {
                if (err)
                    return res.json(err);
                
                return res.json(stats);
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
                    return res.json(401, err);
                }
                
                req.admin = admin;
                return next();
            });
        }
    } else {
        Passport.authenticate('bearer', { session : false }, function(err, user, info) {
            if (err) { return next(err); }
            
            if (!user) { 
                return res.json(401, Error.createError('Access to this page requires an account.', Error.unauthorizedError));
            }
            
            req.user = user;
            
            AdminController.validateAdmin(req.user._id, function(err, admin) {
                if (err) {
                    return res.json(401, err);
                }
                
                req.admin = admin;
                return next();
            });
        })(req, res, next);
    }
}