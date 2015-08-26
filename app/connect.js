var Passport;
var Error = require('./utils/error');

// app/oauthRoutes.js
module.exports = function(app, passport, socketCache) {
    
    Passport = passport;
    
    app.route('/initialize')
        .get(hasAccess, function(req, res) {
            res.json({sessionId: socketCache.requestSession(req.user._id)});
        });
}

function hasAccess(req, res, next) {
    
    if (req.isAuthenticated()) return next();
    Passport.authenticate('bearer', { session : false }, function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { 
            return res.json(401, Error.createError('Access to this page requires an account.', Error.unauthorizedError));
        }
        req.user = user;
        next();
    })(req, res, next);
}