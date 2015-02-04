var mongoose            = require('mongoose');
var Disc            = require('../app/models/disc.js');
var DiscImage            = require('../app/models/discImage.js');
var configDB = require('../config/config.js');
var async = require('async');

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

Disc.find(function(err, discs) {
    
    async.each(discs, function(disc, callback) {
        
        DiscImage.findOne({discId: disc._id}, function(err, discImage) {
           if (!err && discImage) {
               disc.primaryImage = discImage._id;
               disc.save(function(err) {
                    if (err)
                        console.log(err);
                        
                    console.log('Updated Disc [' + disc._id + "] with primary image [" + discImage._id + "]");
                    callback();
                });
           } else {
               callback();
           }
        });
        
    }, function(err) {
        mongoose.disconnect();
    });
    
});