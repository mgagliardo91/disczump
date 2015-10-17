var Error = require('../utils/error');
var Disc = require('../models/disc');
var _ = require('underscore');
var async = require('async');
var mongoose = require('mongoose');
var config = require('../../config/config.js');
var FileUtil = require('../utils/file.js');

module.exports = {
    getPublicPreview: getPublicPreview,
    getDiscs: getDiscs,
    getDisc: getDisc,
    postDisc: postDisc,
    putDisc: putDisc,
    deleteDisc: deleteDisc,
    createThumbnail: createThumbnail,
    getDiscImages: getDiscImages,
    getDiscImage: getDiscImage,
    postDiscImage: postDiscImage,
    putDiscImage: putDiscImage,
    deleteDiscImage: deleteDiscImage,
    deleteDiscImages: deleteDiscImages
}

/* Public Access
 * ----------------------
 */

function getPublicPreview(userId, refDiscId, callback) {
    var retDiscs = [];
    var hasRefDisc = typeof(refDiscId) !== 'undefined';
    var index = 0;
    
    getDiscs(undefined, userId, function(err, discs) {
        if (err)
            return callback(err);
        
        shuffle(discs);
        
        while (index < discs.length && retDiscs.length < 5) {
            if (!(hasRefDisc && discs[index]._id == refDiscId)) {
                retDiscs.push(discs[index]);
            }
            index++;
        }
        
        callback(null, {count: discs.length, preview: retDiscs});
        
    });
}
 
function getDiscs(reqUserId, userId, callback) {
    
    if (typeof(reqUserId) !== 'undefined' && reqUserId == userId) {
        Disc.find({userId: userId}, function (err, discs){
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, discs);
        });
    } else {
        Disc.find({userId: userId, visible: true}, function (err, discs){
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, discs);
        });
    }
}

function getDisc(userId, discId, callback) {
    getDiscInternal(userId, discId, function(err, disc) {
        if (err)
            return callback(err);
        
        if (disc.visible || (userId && userId == disc.userId)) {
            return callback(null, disc);
        } else {
            return callback(Error.createError('Disc is not visible to the public.', Error.unauthorizedError));
        }
    });
}

function getDiscInternal(userId, discId, callback) {
    Disc.findOne({_id: discId}, function(err, disc) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        if (!disc)
            return callback(Error.createError('Unknown disc identifier.', Error.objectNotFoundError));
        
        return callback(null, disc);
    });
}

/// Create Disc
function postDisc(userId, data, callback) {
    var disc = new Disc();
    disc.userId = userId;
    
    disc.brand = data.brand;
    disc.name = data.name;
    disc.material = data.material;
    disc.type = data.type;
    disc.color = data.color;
    disc.notes = data.notes;
    
    if (_.has(data, 'visible')) {
        disc.visible = data.visible;
    }
    
    if (_.has(data, 'weight')) {
        if (data.weight == '') {
            disc.weight = undefined;
        } else if ( _.isNumber(parseInt(data.weight)) && !(_.isNaN(parseInt(data.weight)))){
            disc.weight = data.weight;
        }
    }
    
    if (_.has(data, 'speed')) {
        if (data.speed == '') {
            disc.speed = undefined;
        } else if ( _.isNumber(parseInt(data.speed)) && !(_.isNaN(parseInt(data.speed)))){
            disc.speed = data.speed;
        }
    }
    
    if (_.has(data, 'glide')) {
        if (data.glide == '') {
            disc.glide = undefined;
        } else if ( _.isNumber(parseInt(data.glide)) && !(_.isNaN(parseInt(data.glide)))){
            disc.glide = data.glide;
        }
    }
    
    if (_.has(data, 'turn')) {
        if (data.turn == '') {
            disc.turn = undefined;
        } else if ( _.isNumber(parseInt(data.turn)) && !(_.isNaN(parseInt(data.turn)))){
            disc.turn = data.turn;
        }
    }
    
    if (_.has(data, 'fade')) {
        if (data.fade == '') {
            disc.fade = undefined;
        } else if ( _.isNumber(parseInt(data.fade)) && !(_.isNaN(parseInt(data.fade)))){
            disc.fade = data.fade;
        }
    }
    
    if (_.has(data, 'condition')) {
        if (data.condition == '') {
            disc.condition = undefined;
        } else if ( _.isNumber(parseInt(data.condition)) && !(_.isNaN(parseInt(data.condition)))){
            disc.condition = data.condition;
        }
    }
    
    disc.tagList = [];
    if (_.has(data, 'tagList')) {
        _.each(data.tagList, function(tag) {
            if (tag !== "" && !_.contains(disc.tagList, tag)) {
                disc.tagList.push(tag);
            }
        });
    }

    disc.save(function(err){
        if (err)
            return callback(Error.createError(err, Error.internalError));
        else
            return callback(null, disc);
    });
}

/// Update disc
function putDisc(userId, discId, data, callback) {
    getDiscInternal(userId, discId, function(err, disc){
        if (err)
            return callback(Error.createError(err, Error.internalError));
            
        if (!disc)
            return callback(Error.createError('Unknown disc identifier.', Error.objectNotFoundError));
            
        if (disc.userId != userId)
            return callback(Error.createError('Unauthorized to modify disc.', Error.unauthorizedError));
        
        if (typeof data.brand !== 'undefined' && data.brand.trim().length) {
            disc.brand = data.brand.trim();
        }
        
        if (typeof data.name !== 'undefined' && data.name.trim().length) {
            disc.name = data.name.trim();
        }
        
        if (_.has(data, 'material')) {
            disc.material = data.material.trim();
        }
        
        if (_.has(data, 'type')) {
            disc.type = data.type.trim();
        }
        
        if (_.has(data, 'color')) {
            disc.color = data.color.trim();
        }
        
        if (_.has(data, 'notes')) {
            disc.notes = data.notes.trim();
        }
        
        if (_.has(data, 'visible')) {
            disc.visible = data.visible;
        }
        
        if (_.has(data, 'weight')) {
            if (data.weight == '') {
                disc.weight = undefined;
            } else if ( _.isNumber(parseInt(data.weight)) && !(_.isNaN(parseInt(data.weight)))){
                disc.weight = data.weight;
            }
        }
        
        if (_.has(data, 'speed')) {
            if (data.speed == '') {
                disc.speed = undefined;
            } else if ( _.isNumber(parseInt(data.speed)) && !(_.isNaN(parseInt(data.speed)))){
                disc.speed = data.speed;
            }
        }
        
        if (_.has(data, 'glide')) {
            if (data.glide == '') {
                disc.glide = undefined;
            } else if ( _.isNumber(parseInt(data.glide)) && !(_.isNaN(parseInt(data.glide)))){
                disc.glide = data.glide;
            }
        }
        
        if (_.has(data, 'turn')) {
            if (data.turn == '') {
                disc.turn = undefined;
            } else if ( _.isNumber(parseInt(data.turn)) && !(_.isNaN(parseInt(data.turn)))){
                disc.turn = data.turn;
            }
        }
        
        if (_.has(data, 'fade')) {
            if (data.fade == '') {
                disc.fade = undefined;
            } else if ( _.isNumber(parseInt(data.fade)) && !(_.isNaN(parseInt(data.fade)))){
                disc.fade = data.fade;
            }
        }
        
        if (_.has(data, 'condition')) {
            if (data.condition == '') {
                disc.condition = undefined;
            } else if ( _.isNumber(parseInt(data.condition)) && !(_.isNaN(parseInt(data.condition)))){
                disc.condition = data.condition;
            }
        }
        
        if (typeof data.tagList !== 'undefined') {
            disc.tagList = [];
            _.each(data.tagList, function(tag) {
                if (tag !== "" && !_.contains(disc.tagList, tag)) {
                    disc.tagList.push(tag);
                }
            });
        }
        
        if (typeof data.imageList !== 'undefined' && typeof disc.imageList !== 'undefined') {
            var imageArray = [];
            
            while (data.imageList.length) {
                var discImage = data.imageList.shift();
                var serverImage = _.findWhere(disc.imageList, {_id: discImage._id});
                if (serverImage) {
                    imageArray.push(serverImage);
                }
            }
            
            if (imageArray.length != disc.imageList.length) {
                _.each(disc.imageList, function(discImage) {
                    if (!_.findWhere(imageArray, {_id: discImage._id})) {
                        imageArray.push(discImage);
                    }
                });
            }
            
            disc.imageList = imageArray;
        }
        
        if (typeof data.primaryImage !== 'undefined') {
            var discImage = _.findWhere(disc.imageList, {_id: data.primaryImage});
            if (discImage) {
                disc.primaryImage = discImage._id;
            }
        }
        
        disc.save(function(err){
            if (err)
                return callback(Error.createError(err, Error.internalError));
            else
                return callback(null, disc);
        });
    });
}

/// Delete Disc
function deleteDisc(userId, discId, gfs, callback) {
    getDiscInternal(userId, discId, function(err, disc){
        if (err)
            return callback(err);
            
        if (!disc)
            return callback(Error.createError('Unknown disc identifier.', Error.objectNotFoundError));
            
        if (disc.userId != userId)
            return callback(Error.createError('Unauthorized to delete disc.', Error.unauthorizedError));
        
        deleteDiscImages(userId, discId, gfs, function(err, discImages) {
            disc.remove(function (err, disc) {
                if (err)
                    return callback(Error.createError(err, Error.internalError));
                else
                    console.log('Deleted disc: ' + disc._id);
                    return callback(null, disc);
            });
        });
    });
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  while (currentIndex !== 0) {

    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}


/*
* Disc images
*/
function createThumbnail(gm, gfs, discImage, callback) {
	gfs.files.find({_id: mongoose.Types.ObjectId(discImage.fileId)}).toArray(function(err, files) {
        if(err)
            return callback(err);
        
        if(files.length === 0){
          return callback(Error.createError('File metadata does not exist.', Error.invalidDataError));
        }
        
        var file = files[0];
        
        var rs = gfs.createReadStream({
          _id: discImage.fileId
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

/// Get All Images by User for a disc
function getDiscImages(userId, discId, callback) {
	getDisc(userId, discId, function(err, disc) {
		if (err) 
			return callback(err);
		
		return callback(null, disc.imageList);
	});
}

/// Get Image
function getDiscImage(userId, discId, imageId, callback) {
	getDisc(userId, discId, function(err, disc) {
		if (err)
			return callback(err);
		
		var discImage = _.findWhere(disc.imageList, {_id: imageId});
		
		if (!discImage)
			return callback(Error.createError('Unknown disc image identifier.', Error.invalidDataError));
		
		return callback(null, discImage);
	});
}

/// Create Image
function postDiscImage(gm, gfs, userId, discId, fileId, callback) {
    if (!userId || !discId || !fileId) {
    	return callback(Error.createError('Invalid disc image parameters.', Error.invalidDataError));
    }
    
    getDiscInternal(userId, discId, function(err, disc) {
    	if (err)
    		return callback(err);
    	
        if (disc.userId != userId)
            return callback(Error.createError('Unauthorized to modify disc.', Error.unauthorizedError));
    	
    	disc.imageList.push({ fileId : fileId });
    	var discImage = _.last(disc.imageList);
    	if (!disc.primaryImage) {
	    	disc.primaryImage = discImage._id;
    	}
    	
    	createThumbnail(gm, gfs, discImage, function(err, thumbnailId) {
    		if (err)
    			return callback(err);
    			
    		discImage.thumbnailId = thumbnailId;
    		
    		disc.save(function(err) {
    			if (err)
    				return callback(Error.createError(err, Error.internalError));
    				
    			return callback(null, disc);
    		});
    	});
    });
}

/// Update Image
function putDiscImage(userId, discId, data, callback) {
	callback(Error.createError('Unable to update disc image.', Error.unauthorizedError));
}

/// Delete Image by Id
function deleteDiscImage(userId, discId, imageId, gfs, callback) {
	getDiscInternal(userId, discId, function(err, disc) {
		if (err)
			return callback(err);
			
        if (disc.userId != userId)
            return callback(Error.createError('Unauthorized to modify disc.', Error.unauthorizedError));
			
		var discImage = _.findWhere(disc.imageList, {_id: imageId});
		
		if (!discImage)
			return callback(Error.createError('Unknown image identifier.', Error.objectNotFoundError));
		
		disc.imageList = _.reject(disc.imageList, function(image) { return image._id == discImage._id });
		
		if (disc.primaryImage == discImage._id) {
			disc.primaryImage = disc.imageList.length ? disc.imageList[0]._id : undefined;
		}
		
		disc.save(function(err) {
		    if (err)
		        return callback(Error.createError(err, Error.internalError));
		    
		    deleteDiscImageObj(discImage, gfs, function(err, discImage) {
		        return callback(null, disc);
		    });
		});
	});
}

/// Delete Image Object
function deleteDiscImageObj(discImage, gfs, callback) {
	var fileId = discImage.fileId;
	var thumbnailId = discImage.thumbnailId;
	
	async.parallel([
		function(cb) {
			FileUtil.deleteImage(fileId, gfs, cb);
		},
		function(cb) {
			FileUtil.deleteImage(thumbnailId, gfs, cb);
		}
	], function(err, results) {
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
			deleteDiscImageObj(discImage, gfs, asyncCB);
		}, function(err){
			if (err)
				return callback(Error.createError(err, Error.internalError));
			
			console.log('Finished deleting disc images.');
			return callback(null, discImages);
		});
		
	});
}
