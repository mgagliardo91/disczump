var ImageController = require('../app/controllers/imageCache');
var mongoose = require('mongoose');
var configDB = require('../config/config.js');
var Grid = require('gridfs-stream');

Grid.mongo = mongoose.mongo;

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

mongoose.connection.on('connected', function() {
   var gfs = Grid(mongoose.connection.db);
   
   ImageController.clearUnusedImages(gfs, function(err) {
       if (err) {
            console.log('Error clearing image cache: ' + err.error.message);
       } else {
            console.log('Image cache cleared.');
       }
        
        mongoose.disconnect();
   });
});