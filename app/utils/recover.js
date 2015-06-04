var TemporaryLink = require('../models/temporaryLink');
var User = require('../models/user');
var UserController = require('../controllers/user');
var crypto              = require('crypto');
var Handlebars = require('handlebars');
var fs = require('fs');
var configRoutes = require('../../config/config').routes;
var Error = require('../utils/error');

module.exports = {
    initializeRecovery : function(username, callback) {
        if (!username)
            return callback('A valid email is required to recover a password.');
        
        User.findOne({'local.email': username}, function(err, user) {
           if (err)
			    return callback(Error.createError(err, Error.internalError));
            
            if (!user)
                return callback('No account associated email address found.');
            
            TemporaryLink.remove({ userId: user._id, route: configRoutes.resetPassword }, function (err) {
                if (err)
			        return callback(Error.createError(err, Error.internalError));
            });
            
            var recover = new TemporaryLink({authorizationId: crypto.randomBytes(32).toString('hex'), 
                userId: user._id, route : configRoutes.resetPassword});
            
            recover.save(function(err) {
                if (err)
			        return callback(Error.createError(err, Error.internalError));
                
                console.log(JSON.stringify(recover));
                
                user.addEvent('Password recovery initialized [' + recover._id + '].');
                callback(null, generateRecoveryEmail(user, recover));
            });
        });
    },
    
    validateRecovery : function(authorizationId, callback) {
        TemporaryLink.findOne({authorizationId: authorizationId, route: configRoutes.resetPassword }, function (err, recover) {
            if (err)
			    return callback(Error.createError(err, Error.internalError));
            
            if (!recover)
    			return callback(Error.createError('The recovery request does not exist.',
    			    Error.invalidDataError));
            
            return callback(null, recover);
        });
    },
    
    resetPassword : function(authorizationId, password, callback) {
        this.validateRecovery(authorizationId, function(err, recover) {
            if (err)
			    return callback(Error.createError(err, Error.internalError));
            
            return UserController.resetPassword(recover.userId, password, function(err, user) {
                if (err)
			        return callback(Error.createError(err, Error.internalError));
                
                recover.remove(function(err) {
                   if (err)
			            return callback(Error.createError(err, Error.internalError));
                    
                    user.addEvent('Password recovery used to reset password [' + recover._id + '].');
                    callback(null, user);
                });
            });
        });
    }
}

function generateRecoveryEmail(user, recover) {
    var html = fs.readFileSync('./private/html/recoverPassword.handlebars', 'utf8');
    var template = Handlebars.compile(html);
    return template({user: user, recover : recover});
}