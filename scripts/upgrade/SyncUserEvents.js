var mongoose= require('mongoose');
var User = require('../../app/models/user.js');
var UserInternal = require('../../app/models/userInternal.js');
var configDB = require('../../config/config.js');
var async = require('async');

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

// mongoose.connect('mongodb://' + configDB.database.host + ':' + 
//     configDB.database.port + '/testdb');

User.find(function(err, users) {
    
    async.each(users, function(modUser, callback) {
        
        if (typeof(modUser.internal) === 'undefined') {
            console.log('No internal for user: ' + modUser._id);
            console.log(modUser);
            callback(err);
        }
        
        if (typeof(modUser.internal.eventLog) === 'undefined') {
            console.log('No eventLog for user: ' + modUser._id);
            callback(err);
        }
        
        var events = modUser.internal.eventLog;
        var intUser = new UserInternal({
            userId: modUser._id
        });
        
        intUser.eventLog = [];
        
        events.forEach(function(event) {
            intUser.eventLog.push(event);
        });
        
        intUser.save(function(err) {
            if (!err) {
                modUser.internal = undefined;
                modUser.save(function(err) {
                    if (err)
                        console.log('Error saving user after internal was created. ' + err);
                    
                    callback();
                });
            } else {
                console.log('Error saving internal user for id: ' + modUser._id + '. ' + err);
                callback();
            }
        });
        
        
    }, function(err) {
        console.log('done');
        mongoose.disconnect();
    });
    
});