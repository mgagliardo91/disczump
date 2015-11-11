var _ = require('underscore');
var async = require('async');
var gm = require('gm').subClass({ imageMagick: true });
var DiscController = require('./disc');
var ImageController = require('./imageCache');
var config = require('../../config/config.js');
var dev = require('../../config/dev.js');
var fileUtils = require('../utils/file.js');


module.exports = {
    createDiscData: createDiscData
}

function createDiscData(gridfs, userId, callback) {
    async.eachSeries(dev.data, function(discObj, devCallback) {
        var data = discObj.disc;
        data.imageList = [];
        
        async.eachSeries(discObj.images, function(image, cb) {
            fileUtils.saveImage(gm, gridfs, dev.dir + '/' + image.image, {
                mimetype: image.mimetype,
                filename: image.image,
                maxSize: config.images.maxSize
                }, function(newFile) {
                    ImageController.pushImageCache(gm, gridfs, userId, newFile._id, function(err, discImage) {
                        if (err)
                            return cb(err);
                            
                        data.imageList.push(discImage);
                        return cb();
                    });
            });
        }, function(err) {
            if (err) {
                return devCallback(err);
            }
            
            DiscController.createDisc(userId, data, function(err, disc) {
                if (err) {
                    return devCallback(err);
                }
                
                return devCallback();
            });
        });
    }, function(err) {
        if (callback) {
            return callback(err);
        }
    });
}