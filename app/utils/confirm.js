var TemporaryLink = require('../models/temporaryLink');
var User = require('../models/user');
var UserController = require('../controllers/user');
var crypto              = require('crypto');
var Handlebars = require('handlebars');
var fs = require('fs');
var configRoutes = require('../../config/config').routes;

module.exports = {
    initializeConfirm : function(userId, callback) {
        User.findById(userId, function(err, user) {
           if (err)
                return callback(err);
            
            if (!user)
                return callback('The account does not exist.');
            
            TemporaryLink.remove({ userId: user._id, route: configRoutes.confirmAccount }, function (err) {
                if (err) return callback(err);
            });
            
            if (user.local.active)
                return callback('The account is already active.');
            
            var confirm = new TemporaryLink({authorizationId: crypto.randomBytes(32).toString('hex'), 
                userId: user._id, route : configRoutes.confirmAccount});
            
            confirm.save(function(err) {
                if (err)
                    return callback(err);
                
                console.log(JSON.stringify(confirm));
                callback(null, user, generateConfirmationEmail(user, confirm));
            });
        });
    },
    
    confirmAccount : function(authorizationId, callback) {
        TemporaryLink.findOne({authorizationId: authorizationId, route: configRoutes.confirmAccount }, function (err, confirm) {
            if (err)
                return callback(err);
            
            if (!confirm)
                return callback('The confirmation request does not exist.');
            
            User.findById(confirm.userId, function(err, user) {
                if (err)
                    return callback(err);
                
                user.local.active = true;
                user.save(function(err){
                    if (err)
                        return callback(err);
                    
                    return callback(null, confirm);
                });
            });
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

function generateConfirmationEmail(user, confirm) {
    var html = fs.readFileSync('./private/html/confirmAccount.html', 'utf8');
    var template = Handlebars.compile(html);
    return template({user: user, confirm : confirm});
}