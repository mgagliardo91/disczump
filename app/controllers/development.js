var DiscController = require('./disc');
var DiscImageController = require('./discImage');
var async = require('async');
var fs = require('fs');
var config = require('../../config/config.js');
var dev = require('../../config/dev.js');
var gm = require('gm').subClass({ imageMagick: true });
var _ = require('underscore');


module.exports = {
    createDiscData: createDiscData
}

function createDiscData(gridfs, userId) {
    
    _.each(dev.data, function(discObj) {
        
        // Create Disc
        DiscController.postDisc(userId, discObj.disc, function(err, disc) {
            if (err) {
                return console.log(err);
            }
            
            DiscImageController.saveImage(gm, gridfs, dev.dir + '/' + discObj.image, {
                mimetype: discObj.mimetype,
                filename: discObj.image,
                maxSize: config.images.maxSize
                }, function(newFile) {
                    DiscImageController.postDiscImage(userId, disc._id, newFile._id, function(err, discImage) {
                        if (err)
                            return console.log(err);
                        
                        DiscImageController.createThumbnail(gm, gridfs, discImage, function(err, image) {
                            if (err)
                                return console.log(err);
                        });
                    });
            });
        })
    });
}