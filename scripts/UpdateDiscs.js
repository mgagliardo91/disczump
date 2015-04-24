var mongoose            = require('mongoose');
var Disc            = require('../app/models/disc.js');
var configDB = require('../config/config.js');
var async = require('async');

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

Disc.find(function(err, discs) {
    
    async.each(discs, function(disc, callback) {
        
        //Update here
        if (disc.weight) {
            var weight = disc.weight;
            disc.weight = weight.toString();
        }
        
        if (disc.speed) {
            var speed = disc.speed;
            disc.speed = speed.toString();
        }
        
        if (disc.glide) {
            var glide = disc.glide;
            disc.glide = glide.toString();
        }
        
        if (disc.turn) {
            var turn = disc.turn;
            disc.turn = turn.toString();
        }
        
        if (disc.fade) {
            var fade = disc.fade;
            disc.fade = fade.toString();
        }
        
        disc.save(function(err) {
            if (err)
                console.log(err);
            callback();
        });
    }, function(err) {
        mongoose.disconnect();
    });
    
});