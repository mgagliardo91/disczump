var TemporaryLink = require('../models/temporaryLink');
var User = require('../models/user');
var UserController = require('../controllers/user');
var crypto              = require('crypto');
var Handlebars = require('handlebars');
var fs = require('fs');
var configRoutes = require('../../config/config').routes;

module.exports = {
    initializeRecovery : function(username, callback) {
        if (!username)
            return callback('A valid email is required to recover a password.');
        
        User.findOne({'local.email': username}, function(err, user) {
           if (err)
                return callback(err);
            
            if (!user)
                return callback('No account associated email address found.');
            
            TemporaryLink.remove({ userId: user._id, route: configRoutes.resetPassword }, function (err) {
                if (err) return callback(err);
            });
            
            var recover = new TemporaryLink({authorizationId: crypto.randomBytes(32).toString('hex'), 
                userId: user._id, route : configRoutes.resetPassword});
            
            recover.save(function(err) {
                if (err)
                    return callback(err);
                
                console.log(JSON.stringify(recover));
                callback(null, generateRecoveryEmail(user, recover));
            });
        });
    },
    
    validateRecovery : function(authorizationId, callback) {
        TemporaryLink.findOne({authorizationId: authorizationId, route: configRoutes.resetPassword }, function (err, recover) {
            if (err)
                return callback(err);
            
            if (!recover)
                return callback('The recovery request does not exist.');
            
            return callback(null, recover);
        });
    },
    
    resetPassword : function(authorizationId, password, callback) {
        
        if (!password || !UserController.checkPassword(password)) {
            return callback('Password must be 6 or more characters.');
        }
        
        this.validateRecovery(authorizationId, function(err, recover) {
            if (err)
                return callback(err);
            
            User.findById(recover.userId, function(err, user) {
                if (err)
                    return callback(err);
                
                if (!user)
                    return callback('User does not exist.');
                
                user.local.password = user.generateHash(password);
                user.save(function(err){
                    if (err)
                        return callback(err);
                    
                    recover.remove(function(err) {
                       if (err)
                            return callback(err);
                        
                        callback(null, user);
                    });
                });
            });
        });
    }
}

function generateRecoveryEmail(user, recover) {
    var html = fs.readFileSync('./private/html/recoverPassword.html', 'utf8');
    var template = Handlebars.compile(html);
    return template({user: user, recover : recover});
}