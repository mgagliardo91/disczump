var mongoose            = require('mongoose');
var User            = require('../app/models/user.js');
var configDB = require('../config/config.js');
var async = require('async');

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

User.find(function(err, users) {
    
    async.each(users, function(user, callback) {
        
        user.save(function(err) {
            if (err)
                console.log(err);
            callback();
        });
    }, function(err) {
        mongoose.disconnect();
    });
    
});