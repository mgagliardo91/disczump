var mongoose            = require('mongoose');
var DevController            = require('../app/controllers/development.js');
var configDB = require('../config/config.js');
var Grid = require('gridfs-stream');
var async = require('async');
var gm = require('gm').subClass({ imageMagick: true });

Grid.mongo = mongoose.mongo;

var conn = mongoose.createConnection('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);
    
conn.once('open', function() {
   var gfs = Grid(conn.db) 
   console.log('started');
   DevController.createDiscData(gfs, 1, function() {
            console.log('done');
            mongoose.disconnect();
    });
});
