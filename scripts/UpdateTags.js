var mongoose            = require('mongoose');
var Disc            = require('../app/models/disc.js');
var configDB = require('../config/config.js');
var async = require('async');

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

/*Disc.find(function(err, discs) {
    
    async.each(discs, function(disc, callback) {
        disc["tags"] = [];
        disc.save(function(err) {
            if (err)
                console.log(err);
            callback();
        });
    }, function(err) {
        mongoose.disconnect();
    });
    
});*/

Disc.findOne({name: 'Tag Test 2'}, function(err, disc) {
    if (err) {
        console.log(err);
        mongoose.disconnect();
    }
    
    disc.tagList.push('February');
    disc.tagList.push('Tournament');
    
    disc.save(function(err){
        if (err)
            console.log(err);
        else
            console.log('Saved');
        console.log(disc);
        mongoose.disconnect();
    })
});