var passport = require('passport');
var AdminController = require('../controllers/admin');
var logger = require('./logger.js');
var Error = require('./error.js');

function optAccess(req, res, next) {
     passport.authenticate('bearer', { session : false }, function(err, user, info) {
        if (err) { return next(); }
        if (!user) { return next(); }
        req.user = user;
        next();
    })(req, res, next);
}

function hasAccess(req, res, next) {
    passport.authenticate('bearer', { session : false }, function(err, user, info) {
        if (err) { return next(err); }
        if (!user) {
            return next(Error.createError('Access to this API call requires an account.', Error.unauthorizedError));
        }

        req.user = user;
        next();
    })(req, res, next);
}

function clientAccess(req, res, next) {
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

function adminAccess(req, res, next) {
    hasAccess(req, res, function(err) {
        if (err) {
            return next(err);
        }

        AdminController.validateAdmin(req.user._id, function(err, admin) {
            if (err) {
                logger.info(err);
                return next(err);
            }

            req.admin = admin;

            next();
        });
    });
}

module.exports = {
    optAccess: optAccess,
    hasAccess: hasAccess,
    clientAccess: clientAccess,
    adminAccess: adminAccess

}
