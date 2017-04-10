var Error = require('../utils/error');
var Access = require('../utils/access');
var _ = require('underscore');
var async = require('async');

var DiscController = require('../controllers/disc')
var UserController = require('../controllers/user')

var Passport;

// app/adminRoutes.js
module.exports = function(app, passport) {
    Passport = passport;

    app.use(Access.adminAccess);

    app.route('/discs/top')
        .get(function(req, res, next) {
            DiscController.getTopDiscs(req.query, function(err, discs) {
                if (err)
                    return next(err);

                return res.json(discs);
            });
        });

    app.route('/discs/recent')
        .get(function(req, res, next) {
            DiscController.getLastCreated(req.query, function(err, discs) {
                if (err)
                    return next(err);

                return res.json(discs);
            });
        });

    app.route('/users/top')
        .get(function(req, res, next) {
            UserController.getTopUsers(req.query, function(err, users) {
                if (err)
                    return next(err);

                return res.json(users);
            });
        });

    app.route('/users/online')
        .get(function(req, res, next) {
            UserController.getOnlineUsers(req.query, function(err, users) {
                if (err)
                    return next(err);

                return res.json(users);
            })
        });

    app.route('/users/recent/join')
        .get(function(req, res, next) {
            UserController.getRecentlyJoined(req.query, function(err, users) {
                if (err)
                    return next(err);

                return res.json(users);
            })
        });

    app.route('/users/recent/online')
        .get(function(req, res, next) {
            UserController.getRecentlyActive(req.query, function(err, users) {
                if (err)
                    return next(err);

                return res.json(users);
            })
        });



    app.get('*', function(req, res, next) {
		next(Error.createError('Unknown path', Error.unauthorizedError));
	});
}
