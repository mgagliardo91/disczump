var TemporaryLink = require('../models/temporaryLink');
var User = require('../models/user');
var UserController = require('../controllers/user');
var crypto              = require('crypto');
var Handlebars = require('handlebars');
var fs = require('fs');
var configRoutes = require('../../config/config').routes;
var localConfig = require('../../config/localConfig');
var Error = require('../utils/error');

module.exports = {
    initializeConfirm : function(userId, callback) {
        User.findOne({_id: userId}, function(err, user) {
           if (err)
			    return callback(Error.createError(err, Error.internalError));
            
            if (!user)
                return callback(Error.createError('The account does not exist.', Error.objectNotFoundError));
            
            TemporaryLink.remove({ userId: user._id, route: configRoutes.confirmAccount }, function (err) {
                if (err)
			        console.log(err);
            });
            
            if (user.local.active)
                return callback(Error.createError('The account is already active.', Error.invalidDataError));
            
            var confirm = new TemporaryLink({authorizationId: crypto.randomBytes(32).toString('hex'), 
                userId: user._id, route : configRoutes.confirmAccount});
            
            confirm.save(function(err) {
                if (err)
			        return callback(Error.createError(err, Error.internalError));
                
                console.log(JSON.stringify(confirm));
                callback(null, user, generateConfirmationEmail(user, confirm));
            });
        });
    },
    
    confirmAccount : function(authorizationId, callback) {
        TemporaryLink.findOne({authorizationId: authorizationId, route: configRoutes.confirmAccount }, function (err, confirm) {
            if (err)
	            return callback(Error.createError(err, Error.internalError));
            
            if (!confirm)
                return callback(Error.createError('The confirmation request does not exist.', Error.objectNotFoundError));
            
            User.findOne({_id: confirm.userId}, function(err, user) {
                if (err)
	                return callback(Error.createError(err, Error.internalError));
                    
                if (!user)
                    return callback(Error.createError('The user associated with ' + 
                        'the confirmation request does not exist.', Error.objectNotFoundError));
                
                user.local.active = true;
                user.save(function(err){
                    if (err)
	                    return callback(Error.createError(err, Error.internalError));
                    
                    return callback(null, user);
                });
            });
        });
    }
}

function generateConfirmationEmail(user, confirm) {
    var html = fs.readFileSync('./private/html/confirmAccount.handlebars', 'utf8');
    var template = Handlebars.compile(html);
    return template({user: user, confirm : confirm, serverURL: localConfig.serverURL});
}