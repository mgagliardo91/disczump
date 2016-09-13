var passport = require('passport');
var logger = require('./logger.js');
var Error = require('./error.js');

module.exports = {
    
    optAccess: function (req, res, next) {
         passport.authenticate('bearer', { session : false }, function(err, user, info) {
            if (err) { return next(); }
            if (!user) { return next(); }
            req.user = user;
            next();
        })(req, res, next);
    },

    hasAccess: function(req, res, next) {
        passport.authenticate('bearer', { session : false }, function(err, user, info) {
            if (err) { return next(err); }
            if (!user) { 
                return next(Error.createError('Access to this API call requires an account.', Error.unauthorizedError));
            }

            req.user = user;
            next();
        })(req, res, next);
    },

    clientAccess: function(req, res, next) {
         passport.authenticate(['bearer', 'basic', 'oauth2-client-password'], { session : false }, function(err, client, info) {
            if (err) {
                return next(err);
            }
            
            if (!client) { 
                return next(Error.createError('Access to this API call requires a valid client.', Error.unauthorizedError))
            }
             
             req.permissions = client.permissions;
            next();
        })(req, res, next);
    }
}