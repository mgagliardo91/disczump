var XDate = require('xdate');
var mongoose = require('mongoose');
var ImageCache = require('../models/imageCache');
var Error = require('../utils/error');
var FileUtil = require('../utils/file.js');
var config = require('../../config/config.js');

module.exports = {
    pushImageCache: pushImageCache,
    getImageCache: getImageCache,
    deleteImageCache: deleteImageCache,
    clearUnusedImages: clearUnusedImages
}

function pushImageCache(gm, gfs, userId, fileId, callback) {
    if (!userId || !fileId) {
    	return callback(Error.createError('Invalid disc image parameters.', Error.invalidDataError));
    }
    
    var imageObj = new ImageCache({fileId: fileId});
    
    createThumbnail(gm, gfs, fileId, function(err, thumbnailId) {
        if (!err && thumbnailId) {
            imageObj.thumbnailId = thumbnailId;
        }
        
        imageObj.save(function(err, imageObj) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, imageObj);
        });
    });
}

function getImageCache(imageId, callback) {
    ImageCache.findOne({_id: imageId}, function(err, imageObj) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        if (!imageObj)
            return callback(Error.createError('Unknown image cache identifier.', Error.objectNotFoundError));
        
        imageObj.remove(function(err) {
            return callback(null, imageObj);
        });
    });
}

function deleteImageCache(imageId, callback) {
    getImageCache(imageId, function(err, imageObj) {
        if (err)
            return callback(err);
        
        imageObj.remove(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, imageObj);
        });
    });
}

function clearUnusedImages(gfs, callback) {
    var cutoff = new XDate();
    cutoff.addHours(-1);
    
    
    ImageCache.remove({createDate: {$lt: cutoff.toDate()}}, function(err) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback();
    });
}

function createThumbnail(gm, gfs, fileId, callback) {
	gfs.files.find({_id: mongoose.Types.ObjectId(fileId)}).toArray(function(err, files) {
        if(err)
            return callback(err);
        
        if(files.length === 0){
          return callback(Error.createError('File metadata does not exist.', Error.invalidDataError));
        }
        
        var file = files[0];
        
        var rs = gfs.createReadStream({
          _id: fileId
        });
        
        FileUtil.saveImage(gm, gfs, rs, {
        	mimetype: file.contentType, 
        	filename: file.filename, 
        	maxSize: config.images.thumbnailSize
        }, function(newFile) {
        	return callback(null, newFile._id);
        });
    });
}