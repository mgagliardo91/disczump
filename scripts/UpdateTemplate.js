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
            filename: path.join(__dirname, "../logs", "UpdateTemplate.log") 
      })
    ]
});

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

logger.info('Started template update.');
mongoose.connection.on('connected', function() {
   
   DiscTemplateController.deleteTemplates(function(err) {
       if (err) {
            logger.error(err);
            mongoose.disconnect();
            return;
       }
            
        var templateArray = [];
        var count = 0;
        
        fs.readFile(path.join(__dirname, '../docs/DiscTemplates.csv'), 'utf8', function (err, data) {
            if (err) {
                logger.error(err);
                mongoose.disconnect();
                return;
            }
            
            var templates = data.toString().split("\n");
            
            for(var i = 1; i < templates.length; i++) {
                var template = templates[i].trim();
                var properties = template.split(",");
                if (properties.length == 8) {
                    templateArray.push({
                        brand: properties[0],
                        name: properties[1],
                        type: properties[2],
                        material: properties[3],
                        speed: properties[4],
                        glide: properties[5],
                        turn: properties[6],
                        fade: properties[7]
                    });
                    count++;
                }
            }
            
            logger.info('Read [' + count + '] templates from file.');
            
            async.eachSeries(templateArray, function(template, cb) {
                DiscTemplateController.createTemplate(template, function(err, template) {
                    if (err)
                        logger.error(err);
                    else
                        logger.info('Created template: ' + JSON.stringify(template));
                    
                    cb();
                });
            }, function(err) {
                logger.info('Template update completed.');
                mongoose.disconnect();
            });   
        });
   });
});