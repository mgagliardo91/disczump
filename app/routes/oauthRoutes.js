var fbGraph = require('fbgraph');

var Access = require('../utils/access.js');
var Error = require('../utils/error.js');
var Confirm = require('../utils/confirm.js');

var UserController = require('../controllers/user');
var EventController = require('../controllers/event');

// app/oauthRoutes.js

module.exports = function(app, oauth2, passport, socketCache) {
    
    app.post('/token', oauth2.token);
    
    app.post('/logout', Access.hasAccess, function(req, res, next) {
         oauth2.removeToken(req.user, req.clientId, function(err, data) {
             if (err)
                 return next(err);
             
             return res.json({status: 'OK'});
         });
     });
    
    app.route('/socket')
        .get(Access.hasAccess, function(req, res) {
            res.json({sessionId: socketCache.requestSession(req.user._id)});
        });
    
    app.post('/confirm', Access.clientAccess, function(req, res, next) {
        if (!req.body.authorizationId)
            return next(Error.createError('An authorization identifier is required.', Error.invalidDataError));
        
        Confirm.confirmAccount(req.body.authorizationId, function(err, user) {
            if (err)
                return next(err);
            
            oauth2.createToken(user, req.clientId, function(err, token, rToken, info) {
                if (err) {
                    return next(err);
                }

                var response = {
                    'access_token': token,
                    'refresh_token': rToken,
                    'token_type': 'Bearer'
                };

                for (var x in info) {
                    response[x] = info[x];
                }

                return res.json(response);
            });
        });
    });
    
    app.post('/facebook/unlink', Access.hasAccess, function(req, res, next) {
        UserController.unlinkFacebook(req.user, function(err, user) {
           if (err)
               return next(err);
            
            return res.json(user.accountToString());
        });
    });
    
    app.post('/facebook/link', Access.hasAccess, function(req, res, next) {
        UserController.linkFacebook(req.body.userID, req.body.accessToken, req.user, function(err, user) {
           if (err)
               return next(err);
            
            return res.json(user.accountToString());
        });
    });
    
    app.post('/facebook/login', Access.clientAccess, function(req, res, next) {
        if (!req.body.userID)
                return next(Error.createError('A valid facebook user ID is required to access this route.', Error.unauthorizedError));
        
        UserController.getUserByFacebook(req.body.userID, function(err, user) {
            if (err) {
                return next(err);
            }
            
            if (!user) {
                return next(Error.createError('Cannot find an account associated with the Facebook credentials.', Error.objectNotFoundError));
            }

            if (!user.local.active) {
                return next(Error.createError('Account not activated.', Error.inactiveError));
            }
            
            UserController.FBConnect(user, req.body.accessToken, function(err, user) {
                if (err)
                    return next(err);
                
                oauth2.createToken(user, req.clientId, function(err, token, rToken, info) {
                    if (err) {
                        return next(err);
                    }

                    var response = {
                        'access_token': token,
                        'refresh_token': rToken,
                        'token_type': 'Bearer'
                    };

                    for (var x in info) {
                        response[x] = info[x];
                    }

                    return res.json(response);

                });
            }, req.body.userID);
        });
    });
}