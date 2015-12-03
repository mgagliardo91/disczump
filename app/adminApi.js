var Error = require('./utils/error');
var _ = require('underscore');
var async = require('async');
var AdminController = require('./controllers/admin');
var DiscController = require('./controllers/disc');
var UserController = require('./controllers/user');
var EventController = require('./controllers/event');
var FeedbackController = require('./controllers/feedback');
var socketManager = require('./objects/socketCache.js');
var Passport;

// app/oauthRoutes.js
module.exports = function(app, passport) {
    
    Passport = passport;
        
    app.route('/user')
        .get(hasAccess, function(req, res) {
            UserController.getAllUsers(parsePagination(req.query), function(err, pager) {
                if (err)
                    return res.json(err);
                
                return res.json(pager);
            });
        });
    
    app.route('/active')
        .get(hasAccess, function(req, res) {
            var users = [];
            async.each(socketManager.getSocketSessions(), function(socketSession, cb) {
                UserController.getUser(socketSession.userId, function(err, user) {
                    if (err)
                        return cb(err);
                    
                    users.push(user);
                    cb();
                });
            }, function(err, results) {
                return res.json(users);
            });
        });
        
     app.route('/user/geo')
        .get(hasAccess, function(req, res) {
            if (!req.query.loc || !req.query.radius)
                return res.json(Error.createError('Invalid location or radius.', Error.invalidDataError));
            
            UserController.getUsersByArea(req.query.loc, req.query.radius, function(err, users) {
                if (err)
                    return res.json(err);
                
                return res.json(users);
            });
        });
        
    app.route('/disc')
        .get(hasAccess, function(req, res) {
            DiscController.getAllDiscs(parsePagination(req.query), function(err, pager) {
                if (err)
                    return res.json(err);
                
                return res.json(pager);
            });
        });
        
    app.route('/event')
        .get(hasAccess, function(req, res) {
            EventController.getAllEvents(parsePagination(req.query), function(err, pager) {
                if (err)
                    return res.json(err);
                
                return res.json(pager);
            });
        });
        
    app.route('/feedback')
        .get(hasAccess, function(req, res) {
            FeedbackController.getAllFeedback(parsePagination(req.query), function(err, pager) {
                if (err)
                    return res.json(err);
                
                return res.json(pager);
            });
        });
        
    app.get('*', function(req, res){
       res.json(401, Error.createError('Unknown path', Error.unauthorizedError)); 
    });
}

function parsePagination(query) {
    var parsed;
    var i = 0;
    var sort = [], filter = {};
    
    var size = (parsed = parseInt(query.size)) && parsed > 0 ? parsed : 50;
    var page = (parsed = parseInt(query.page)) && parsed > 0 ? parsed : 1;
    
    if (query.sort) {
        for (i = 0; i < query.sort.length; i++) {
            var sorter = query.sort[i].split(',');
            sort.push([sorter[0], parseInt(sorter[1])]);
        }
    }
    
    if (query.filter && _.isArray(query.filter)) {
        for (i = 0; i < query.filter.length; i++) {
            var filterOpt = query.filter[i].split(',');
            filter[filterOpt[0]] = filterOpt[1];
        }
    }
    
    return {size: size, page: page, sort: sort, filter: filter};
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