var DiscImage = require('../models/discImage');
var _ = require('underscore');

module.exports = {
    getDiscImages: getDiscImages,
    getDiscImage: getDiscImage,
    postDiscImage: postDiscImage,
    putDiscImage: putDiscImage,
    deleteDiscImage: deleteDiscImage
}

/// Get All Images by User for a disc
function getDiscImages(userId, discId, callback) {
    return DiscImage.find({userId: userId, discId : discId}, callback);
}

/// Get Image by Id and User
function getDiscImage(userId, imageId, callback) {
	DiscImage.findById(imageId, function(err, image) {
		if (err) 
			return callback(err);
			
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
    	return callback('Invalid disc image parameters.', null);
    }
    
    discImage.userId = userId;
    discImage.discId = discId;
    discImage.fileId = fileId;

	discImage.save(function(err){
		if (err)
			return callback(err, null);
		else
			return callback(null, discImage);
	});
}

/// Update Image
function putDiscImage(userId, discId, data, callback) {
	callback('Unknown method');
}

/// Delete Image
function deleteDiscImage(userId, imageId, gfs, callback) {
	getDiscImage(userId, imageId, function(err, discImage){
		if (err)
			return callback(err);
			
		if (_.isEmpty(discImage))
			return callback(null, discImage);
		
		gfs.remove({_id:discImage.fileId}, function (err) {
		  if (err)
		  	return callback(err);
		  	
		  	discImage.remove(function (err, discImage) {
				if (err)
					return callback(err);
				else
					return callback(null, discImage);
			});
		});
	});
}