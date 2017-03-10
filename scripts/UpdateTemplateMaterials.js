var DiscTemplateController = require('../app/controllers/discTemplate');
var mongoose = require('mongoose');
var configDB = require('../config/config.js');
var path = require('path');
var fs = require('fs');
var async = require('async');
var winston = require('winston');
var _ = require('underscore');

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({
            json: false,
            datePattern: '.yyyy-MM-dd-HH-mm',
            filename: path.join(__dirname, "../logs", "UpdateTemplateMaterials.log") 
      })
    ]
});

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

logger.info('Started material update.');
mongoose.connection.on('connected', function() {
   
   DiscTemplateController.deleteMaterials(function(err) {
       if (err) {
            logger.error(err);
            mongoose.disconnect();
            return;
       }
            
        var materialArray = [];
        var count = 0;
        
        fs.readFile(path.join(__dirname, '../docs/DiscMaterials.csv'), 'utf8', function (err, data) {
            if (err) {
                logger.error(err);
                mongoose.disconnect();
                return;
            }
            
            var materials = data.toString().split("\n");
            
            for(var i = 1; i < materials.length; i++) {
                var template = materials[i].trim();
                var properties = template.split(",");
                if (properties[0].length > 0 && properties[1].length > 0) {
                    var index = _.findIndex(materialArray, {brand:properties[0]});
                    
                    if(index == -1) {
                        materialArray.push({
                            brand: properties[0],
                            material: [properties[1]]
                        })
                    } else {
                        materialArray[index].material.push(properties[1]);
                    }
                } else {
                    logger.error('Missing information on row ' + i);
                }
                count++;
            }
            
            logger.info('Read [' + count + '] materials from file.');
            
            async.eachSeries(materialArray, function(material, cb) {
                DiscTemplateController.createMaterial(material, function(err, material) {
                    if (err)
                        logger.error(err);
                    else
                        logger.info('Created material: ' + JSON.stringify(material));
                    
                    cb();
                });
            }, function(err) {
                logger.info('Material update completed.');
                mongoose.disconnect();
            });   
        });
   });
});