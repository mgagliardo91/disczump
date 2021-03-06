var fs = require('fs');
var async = require('async');
var Handlebars = require('handlebars');
var TemporaryLink = require('../models/temporaryLink');
var EventController = require('../controllers/event');
var UserController = require('../controllers/user');
var DiscController = require('../controllers/disc');
var MessageController = require('../controllers/message');
var localConfig = require('../../config/localConfig');
var Error = require('../utils/error');
var AccountDelete = require('../external/accountDelete');

module.exports = {
    initializeConfirmAccount: initializeConfirmAccount,
    confirmAccount: confirmAccount,
    initializeConfirmDelete: initializeConfirmDelete,
    confirmDelete : confirmDelete
}

function initializeConfirmAccount(userId, callback) {
    UserController.getUser(userId, function(err, user) {
       if (err)
            return callback(err);
        
        TemporaryLink.remove({ userId: user._id, route: 'confirm' }, function (err) {
            if (err)
		        console.log(err);
		        
	        if (user.local.active)
                return callback(Error.createError('The account is already active.', Error.invalidDataError));
            
            var confirm = new TemporaryLink({userId: user._id, route : 'confirm'});
            
            confirm.save(function(err) {
                if (err)
			        return callback(Error.createError(err, Error.internalError));
                
                callback(null, user, confirmAccountEmail(user, confirm));
            });
        });
    });
}

function confirmAccount(authorizationId, callback) {
    TemporaryLink.findOne({_id: authorizationId, route: 'confirm' }, function (err, confirm) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        if (!confirm)
            return callback(Error.createError('The confirmation request does not exist.', Error.objectNotFoundError));
        
        UserController.getUser(confirm.userId, function(err, user) {
            if (err)
                return callback(err);
            
            user.local.active = true;
            user.save(function(err){
                if (err)
                    return callback(Error.createError(err, Error.internalError));
                    
                confirm.remove();
                
                return callback(null, user);
            });
        });
    });
}

function initializeConfirmDelete(userId, callback) {
    UserController.getActiveUser(userId, function(err, user) {
       if (err)
            return callback(err);
        
        TemporaryLink.remove({ userId: user._id, route: 'delete' }, function (err) {
            if (err)
		        console.log(err);
		 
            var confirm = new TemporaryLink({userId: user._id, route : 'delete'});
            
            confirm.save(function(err) {
                if (err)
			        return callback(Error.createError(err, Error.internalError));
                
				UserController.addUserEvent(user._id, EventController.Types.AccountDeleteInit, 'Account deletion request initialized [' + confirm._id + '].');
                callback(null, user, confirmDeleteEmail(user, confirm));
            });
        });
    });
}

function confirmDelete(authorizationId, gfs, callback) {
		console.log('Finding authorization ID');
        TemporaryLink.findOne({_id: authorizationId, route: 'delete' }, function (err, confirm) {
			console.log(err);
			
            if (err)
	            return callback(Error.createError(err, Error.internalError));
            
            if (!confirm)
                return callback(Error.createError('The delete request does not exist.', Error.objectNotFoundError));
            
			AccountDelete.executeDelete(confirm.userId, gfs, function(err, user) {
				if (err)
					return callback(err);
				
				confirm.remove();
				return callback(null, user);
			});
        });
    }

/* Private Functions */
function confirmAccountEmail(user, confirm) {
    var html = fs.readFileSync('./private/html/confirmAccount.handlebars', 'utf8');
    var template = Handlebars.compile(html);
    return template({user: user, confirm : confirm, serverURL: localConfig.serverURL});
}

function confirmDeleteEmail(user, confirm) {
    var html = fs.readFileSync('./private/html/confirmDelete.handlebars', 'utf8');
    var template = Handlebars.compile(html);
    return template({user: user, confirm : confirm, serverURL: localConfig.serverURL});
}