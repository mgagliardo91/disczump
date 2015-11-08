var Admin = require('../models/admin.js');
var UserController = require('./user.js');
var Error = require('../utils/error.js');

module.exports = {
    validateAdmin: validateAdmin,
    createAdmin: createAdmin
}

function validateAdmin(userId, callback) {
    Admin.findOne({userId: userId}, function(err, admin) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        if (!admin)
            return callback(Error.createError('Permission to domain requires access from an authenticated administrator.', Error.unauthorizedError));
        
        callback(null, admin);
    });
}

function createAdmin(userId, callback) {
    UserController.getUser(userId, function(err, user) {
        if (err)
            return callback(err);
        
        validateAdmin(userId, function(err, admin) {
            if (admin) {
                return callback(Error.createError('The user account is already an administrator.', Error.invalidDataError));
            }
            
            var newAdmin = new Admin({
                userId: userId,
            });
            
            newAdmin.save(function(err) {
                if (err)
                    return callback(Error.createError(err, Error.internalError));
                
                return callback(null, newAdmin);
            });
        });
    });
}