var DiscController = require('./disc');
var async = require('async');
var fs = require('fs');
var config = require('../../config/config.js');
var dev = require('../../config/dev.js');
var gm = require('gm').subClass({ imageMagick: true });
var _ = require('underscore');
var fileUtils = require('../utils/file.js');


module.exports = {
    createDiscData: createDiscData
}

function createDiscData(gridfs, userId) {
    
    async.eachSeries(dev.data, function(discObj, devCallback) {
        DiscController.postDisc(userId, discObj.disc, function(err, disc) {
            if (err) {
                return console.log(err); 
            }
            
            async.eachSeries(discObj.images, function(image, callback) {
                    fileUtils.saveImage(gm, gridfs, dev.dir + '/' + image.image, {
                        mimetype: image.mimetype,
                        filename: image.image,
                        maxSize: config.images.maxSize
                        }, function(newFile) {
                            DiscController.postDiscImage(gm, gridfs, userId, disc._id, newFile._id, function(err, discImage) {
                                if (err)
                                    return callback(err);
                                
                                callback();
                            });
                    });
                }, function(err) {
                    if (err) {
                        console.log('Error creating BETA account: ' + err);
                    }
                    
                    console.log('Finished creating disc [' + disc._id + ']');
                    
                    devCallback();
                });
        }, function(err) {
            if (err) {
                console.log('Error creating BETA account: ' + err);
            }
            
            return;
        });
    });
}