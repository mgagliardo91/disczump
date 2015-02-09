var mongoose            = require('mongoose');
var User            = require('../app/models/user.js');
var configDB = require('../config/config.js');
var async = require('async');

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

User.find(function(err, users) {
    
    async.each(users, function(user, callback) {
        user["preferences"] = {
                'colorize'     : {
                'putter'    : 'rgb(251, 131, 131)',
                'mid'       : 'rgb(251, 221, 131)',
                'fairway'   : 'rgb(139, 251, 131)',
                'distance'  : 'rgb(131, 219, 251)',
                'mini'      : 'rgb(165, 131, 251)'
            }
        };
        
        
        user.save(function(err) {
            if (err)
                console.log(err);
            callback();
        });
    }, function(err) {
        mongoose.disconnect();
    });
    
});