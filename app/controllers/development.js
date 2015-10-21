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

function createDiscData(gridfs, userId, callback) {
    
    async.eachSeries(dev.data, function(discObj, devCallback) {
        DiscController.postDisc(userId, discObj.disc, function(err, disc) {
            if (err) {
                return devCallback(err); 
            }
            
            async.eachSeries(discObj.images, function(image, cb) {
                    fileUtils.saveImage(gm, gridfs, dev.dir + '/' + image.image, {
                        mimetype: image.mimetype,
                        filename: image.image,
                        maxSize: config.images.maxSize
                        }, function(newFile) {
                            DiscController.postDiscImage(gm, gridfs, userId, disc._id, newFile._id, function(err, discImage) {
                                if (err)
                                    return cb(err);
                                    
                                
                                return cb();
                            });
                    });
                }, function(err) {
                    if (err) {
                        return devCallback(err);
                    }
                    
                    return devCallback();
                });
        });
    }, function(err) {
        if (callback) {
            return callback(err ? 'Error creating BETA account: ' + err : undefined);
        }
    });
}