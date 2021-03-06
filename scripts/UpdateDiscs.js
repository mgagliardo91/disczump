var mongoose            = require('mongoose');
var Disc            = require('../app/models/disc.js');
var configDB = require('../config/config.js');
var async = require('async');

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

Disc.find(function(err, discs) {
    
    async.each(discs, function(disc, callback) {
        
        disc.modifiedDate = new Date();
        disc.marketplace.modifiedDate = new Date();
        
        disc.save(function(err) {
            if (err)
                console.log(err);
            callback();
        });
    }, function(err) {
        mongoose.disconnect();
    });
    
});