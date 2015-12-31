var AccessTokenController = require('../app/controllers/accessToken');
var mongoose = require('mongoose');
var configDB = require('../config/config.js');
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

logger.info('Hourly cron job started.')

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

mongoose.connection.on('connected', function() {
    AccessTokenController.clearUnusedTokens(function(err) {
        if (err) {
            logger.error('Error clearing access tokens: ' + err.error.message);
        } else {
            logger.info('Access tokens cleared.');
        }
        
        logger.info('Hourly cron job completed.')
        mongoose.disconnect();
    });
});