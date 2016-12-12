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
    
    async.each(users, function(user, callback) {
        
        var events = user.internal.eventLog;
        var intUser = new UserInternal({
            userId: user._id
        });
        
        intUser.eventLog = [];
        
        events.forEach(function(event) {
            intUser.eventLog.push(event);
        });
        
        intUser.save(function(err) {
            if (!err) {
                user.internal = undefined;
                user.save(function(err) {
                    if (err)
                        console.log('Error saving user after internal was created. ' + err);
                    
                    callback();
                });
            } else {
                console.log('Error saving internal user for id: ' + user._id + '. ' + err);
                callback();
            }
        });
        
        
    }, function(err) {
        console.log('done');
        mongoose.disconnect();
    });
    
});