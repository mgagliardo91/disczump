var Error = require('../utils/error')
var DiscImage = require('../models/discImage');
var Disc = require('../models/disc');
var DiscController = require('./disc');
var _ = require('underscore');
var async = require('async');
var mongoose = require('mongoose');
var config = require('../../config/config.js');

module.exports = {
	createThumbnail: createThumbnail,
	saveImage: saveImage,
    getDiscImages: getDiscImages,
    getDiscImage: getDiscImage,
    postDiscImage: postDiscImage,
    putDiscImage: putDiscImage,
    deleteDiscImage: deleteDiscImage,
    deleteDiscImages: deleteDiscImages
}

function createThumbnail(gm, gfs, discImage, callback) {
	gfs.files.find({_id:mongoose.Types.ObjectId(discImage.fileId)}).toArray(function(err, files) {
        if(err)
            return callback(err);
        
        if(files.length === 0){
          return callback(new Error('File metadata does not exist'));
        }
        
        var file = files[0];
        
        var rs = gfs.createReadStream({
          _id: discImage.fileId
        });
        
        saveImage(gm, gfs, rs, {
        	mimetype: file.contentType, 
        	filename: file.filename, 
        	maxSize: config.images.thumbnailSize
        }, function(newFile) {
        	discImage.thumbnailId = newFile._id;
        	discImage.save(function(err) {
        		if (err) return callback(err);
        		
        		return callback(null, discImage);
        	});
        });
    });
}

function saveImage(gm, gfs, readStream, fileParams, callback) {
	var ws = gfs.createWriteStream({
                  mode: 'w',
                  content_type: fileParams.mimetype,
                  filename: fileParams.filename
              });

    ws.on('close', function (file) {
    	callback(file);
      });
      
    gm(readStream).quality(90).size({bufferStream: true}, function(err, size) {
    	if (err)
    		console.log(err);
    	
    	if (typeof size !== 'undefined') {
    		if (size.width > size.height) {
	    		this.resize(size.width > fileParams.maxSize ? fileParams.maxSize : size.width);
	    	} else {
	    		this.resize(null, size.height > fileParams.maxSize ? fileParams.maxSize : size.height);
	    	}
    	}
    	
        this.stream('jpeg', function (err, stdout, stderr) {
          stdout.pipe(ws);
        });
    });
}

/// Get All Images by User for a disc
function getDiscImages(userId, discId, callback) {
	DiscImage.find({discId : discId}, function(err, discImages) {
		if (err)
			return callback(Error.createError(err, Error.internalError));
		
		return callback(null, discImages);
	});
}

/// Get Image by Id and User
function getDiscImage(userId, imageId, callback) {
	DiscImage.findById(imageId, function(err, image) {
		if (err) 
			return callback(Error.createError(err, Error.internalError));
			
		if (image) 
			return callback(null, image);
		else
			return callback(null, {});
	});	
}

/// Create Image
function postDiscImage(userId, discId, fileId, callback) {
    var discImage = new DiscImage();
    if (!userId || !discId || !fileId) {
    	return callback(Error.createError('Invalid disc image parameters.', Error.invalidDataError));
    }
    
    discImage.userId = userId;
    discImage.discId = discId;
    discImage.fileId = fileId;

	discImage.save(function(err, savedDiscImage){
		if (err) {
			return callback(Error.createError(err, Error.internalError));
		} else {
			Disc.findById(discId, function(err, disc) {
				if (!err && !_.isEmpty(disc) && !disc.primaryImage) {
					disc.primaryImage = savedDiscImage._id;
					
					disc.save(function(err) {
						if (err) console.log(err);
						
						return callback(null, savedDiscImage);
					});
				} else {
					
					return callback(null, savedDiscImage);
				}
			});
		}
	});
}

/// Update Image
function putDiscImage(userId, discId, data, callback) {
	callback('Unknown method');
}

/// Delete Image by Id
function deleteDiscImage(userId, imageId, gfs, callback) {
	getDiscImage(userId, imageId, function(err, discImage){
		if (err)
			return callback(Error.createError(err, Error.internalError));
			
		if (_.isEmpty(discImage))
			return callback(null, discImage);
		
		Disc.findById(discImage.discId, function(err, disc) {
			if (!err && !disc && !_.isEmpty(disc)) {
				if (disc.primaryImage == discImage._id) {
					DiscImage.findOne({fileId : {'$ne': discImage.fileId }}, function (err, nextImage) {
						if (!err && !nextImage) {
							disc.primaryImage = nextImage._id;
						} else {
							disc.primaryImage = null;
						}
						
						disc.save();
					})
				}
			}	
		});
		
		return deleteDiscImageObj(discImage, gfs, callback);
	});
}

/// Delete Image Object
function deleteDiscImageObj(discImage, gfs, callback) {
	var fileId = discImage.fileId;
	var thumbnailId = discImage.thumbnailId;
	
	if (fileId) {
		gfs.remove({_id:fileId}, function (err) {
		 	if (err)
			  	console.log(err);
		});
	}
	
	if (thumbnailId) {
		gfs.remove({_id:thumbnailId}, function (err) {
		 	if (err)
			  	console.log(err);
		});
	}
	
	discImage.remove(function (err, discImage) {
		if (err)
			return callback(Error.createError(err, Error.internalError));
		
		console.log('Deleted disc image object: ' + discImage._id);
		return callback(null, discImage);
	});
}

/// Delete All Images
function deleteDiscImages(userId, discId, gfs, callback) {
	getDiscImages(userId, discId, function(err, discImages){
		if (err)
			return callback(Error.createError(err, Error.internalError));
			
		if (_.isEmpty(discImages))
			return callback(null, discImages);
		
		async.each(discImages, function(discImage, asyncCB){
			deleteDiscImageObj(discImage, gfs, function(err, discImage) {
				asyncCB();	
			});
		}, function(err){
			if (err)
				return callback(Error.createError(err, Error.internalError));
			
			console.log('Finished deleting disc images.');
			return callback(null, discImages);
		});
		
	});
}
