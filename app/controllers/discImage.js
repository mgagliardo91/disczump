var Error = require('../utils/error')
var DiscImage = require('../models/discImage');
var _ = require('underscore');
var async = require('async');

module.exports = {
    getDiscImages: getDiscImages,
    getDiscImage: getDiscImage,
    postDiscImage: postDiscImage,
    putDiscImage: putDiscImage,
    deleteDiscImage: deleteDiscImage,
    deleteDiscImages: deleteDiscImages
}

/// Get All Images by User for a disc
function getDiscImages(userId, discId, callback) {
	DiscImage.find({userId: userId, discId : discId}, function(err, discImages) {
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
			
		if (image && image.userId == userId) 
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

	discImage.save(function(err){
		if (err)
			return callback(Error.createError(err, Error.internalError));
		else
			return callback(null, discImage);
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
		
		deleteDiscImageObj(discImage, gfs, callback);
	});
}

/// Delete Image Object
function deleteDiscImageObj(discImage, gfs, callback) {
	gfs.remove({_id:discImage.fileId}, function (err) {
	  if (err)
	  	return callback(Error.createError(err, Error.internalError));
	  	
	  	discImage.remove(function (err, discImage) {
			if (err)
				return callback(Error.createError(err, Error.internalError));
			
			console.log('Deleted disc image object: ' + discImage._id);
			return callback(null, discImage);
		});
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
