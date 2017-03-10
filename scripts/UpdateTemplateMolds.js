var DiscTemplateController = require('../app/controllers/discTemplate');
var mongoose = require('mongoose');
var configDB = require('../config/config.js');
var path = require('path');
var fs = require('fs');
var async = require('async');
var winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({
            json: false,
            datePattern: '.yyyy-MM-dd-HH-mm',
            filename: path.join(__dirname, "../logs", "UpdateTemplateMolds.log") 
      })
    ]
});

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

logger.info('Started mold update.');
mongoose.connection.on('connected', function() {
   
   DiscTemplateController.deleteMolds(function(err) {
       if (err) {
            logger.error(err);
            mongoose.disconnect();
            return;
       }
            
        var moldArray = [];
        var count = 0;
        
        fs.readFile(path.join(__dirname, '../docs/DiscMolds.csv'), 'utf8', function (err, data) {
            if (err) {
                logger.error(err);
                mongoose.disconnect();
                return;
            }
            
            var molds = data.toString().split("\n");
            
            for(var i = 1; i < molds.length; i++) {
                var template = molds[i].trim();
                var properties = template.split(",");
                if (properties[0].length > 0 && properties[1].length > 0) {
                    moldArray.push({
                        brand: properties[0].length ? properties[0] : undefined,
                        name: properties[1].length ? properties[1] : undefined,
                        type: properties[2].length ? properties[2] : undefined,
                        speed: properties[3].length ? parseInt(properties[3]) : undefined,
                        glide: properties[4].length ? parseInt(properties[4]) : undefined,
                        turn: properties[5].length ? parseInt(properties[5]) : undefined,
                        fade: properties[6].length ? parseInt(properties[6]) : undefined
                    });
                } else {
                    logger.error('Missing information on row ' + i);
                }
                count++;
            }
            
            logger.info('Read [' + count + '] molds from file.');
            
            async.eachSeries(moldArray, function(mold, cb) {
                DiscTemplateController.createMold(mold, function(err, mold) {
                    if (err)
                        logger.error(err);
                    else
                        logger.info('Created mold: ' + JSON.stringify(mold));
                    
                    cb();
                });
            }, function(err) {
                logger.info('Mold update completed.');
                mongoose.disconnect();
            });   
        });
   });
});