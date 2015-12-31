var ImageController = require('../app/controllers/imageCache');
var mongoose = require('mongoose');
var configDB = require('../config/config.js');
var Grid = require('gridfs-stream');
var winston = require('winston');
var path = require('path');

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({
            json: false,
            datePattern: '.yyyy-MM-dd-HH-mm',
            filename: path.join(__dirname, "../logs", "CronJobOutput.log") 
      })
    ]
});

logger.info('Daily cron job started.')
Grid.mongo = mongoose.mongo;

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

mongoose.connection.on('connected', function() {
   var gfs = Grid(mongoose.connection.db);
   
   ImageController.clearUnusedImages(gfs, function(err) {
       if (err) {
            logger.error('Error clearing image cache: ' + err.error.message);
       } else {
            logger.info('Image cache cleared.');
       }
        
        logger.info('Daily cron job completed.')
        mongoose.disconnect();
   });
});