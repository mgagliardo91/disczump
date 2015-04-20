var Error = require('../utils/error');
var Disc = require('../models/disc');
var DiscImageController = require('./discImage');
var _ = require('underscore');

module.exports = {
	getPublicDiscs: getPublicDiscs,
	getPublicDisc: getPublicDisc,
    getDiscs: getDiscs,
    getDisc: getDisc,
    postDisc: postDisc,
    putDisc: putDisc,
    deleteDisc: deleteDisc
}

/* Public Access
 * ----------------------
 */
function getPublicDiscs(userId, callback) {
	Disc.find({userId: userId, visible: true}, function (err, discs){
		if (err)
			return callback(Error.createError(err, Error.internalError));
		
		return callback(null, discs);
	});
}

function getPublicDisc(userId, discId, callback) {
	Disc.findById(discId, function(err, disc) {
	    if (err)
	   		return callback(Error.createError(err, Error.internalError));
	   	
	   	if (!disc)
	   		return callback(Error.createError('Unknown disc identifier.', Error.objectNotFoundError));
	   	
	   	if (disc.visible || (userId && userId == disc.userId)) {
	   		if (disc.primaryImage) {
				DiscImageController.getDiscImage(userId, disc.primaryImage, function(err, image) {
					if (err)
						return callback(Error.createError(err, Error.internalError));
					
					if (image) {
						disc.retPrimaryImage = image;
					}
					
					return callback(null, disc);
				});
			} else {
				return callback(null, disc);
			}
	   	} else {
	   		return callback(Error.createError('Disc is not visible to the public.', Error.unauthorizedError));
	   	}
	});
}



/* Private Access
 * ----------------------
 */

/// Get All Discs by User
function getDiscs(userId, callback) {
    Disc.find({userId: userId}, function (err, discs){
		if (err)
			return callback(Error.createError(err, Error.internalError));
		
		return callback(null, discs);
	});
}

/// Get Disc by Id and User
function getDisc(userId, discId, callback) {
	Disc.findById(discId, function(err, disc) {
		if (err) 
			return callback(Error.createError(err, Error.internalError));
		
		if (!disc)
	   		return callback(Error.createError('Unknown disc identifier.', Error.objectNotFoundError));
		if (disc.userId == userId) {
			return callback(null, disc);
		} else {
	   		return callback(Error.createError('Not authorized to view disc.', Error.unauthorizedError));
		}
	});	
}

/// Create Disc
function postDisc(userId, data, callback) {
    var disc = new Disc();
    disc.userId = userId;
    if (!data.brand || !data.name || data.brand == '' || data.name == '') {
    	return callback(Error.createError('Invalid data received for disc creation.', Error.invalidDataError));
    }
    
    disc.brand = data.brand;
    disc.name = data.name;
   	disc.material = data.material;
   	disc.type = data.type;
   	disc.color = data.color;
   	disc.notes = data.notes;
   	
   	if (data.visible) {
   		disc.visible = data.visible;
   	}
   	
   	var param;
   	if (data.weight && _.isNumber(param = parseInt(data.weight))) {
   		disc.weight = param;
   	}
   	
   	if (data.speed && _.isNumber(param = parseInt(data.speed))) {
   		disc.speed = data.speed;
   	}
   	
   	if (data.glide && _.isNumber(param = parseInt(data.glide))) {
   		disc.glide = data.glide;
   	}
   	
   	if (data.turn && _.isNumber(param = parseInt(data.turn))) {
   		disc.turn = data.turn;
   	}
   	
   	if (data.fade && _.isNumber(param = parseInt(data.fade))) {
   		disc.fade = data.fade;
   	}
   	
   	disc.tagList = [];
   	if (data.tagList) {
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
	getDisc(userId, discId, function(err, disc){
		if (err)
			return callback(Error.createError(err, Error.internalError));
			
		if (!disc)
			return callback(Error.createError('Unknown disc identifier.', Error.objectNotFoundError));
			
		if (data.brand) {
			disc.brand = data.brand;
		}
		
		if (data.name) {
			disc.name = data.name;
		}
		
		if (data.material) {
			disc.material = data.material;
		}
		
		if (data.type) {
			disc.type = data.type;
		}
		
		if (data.color) {
			disc.color = data.color;
		}
		
		if (data.notes) {
			disc.notes = data.notes;
		}
		
	   	if (typeof(data.visible) !== 'undefined') {
	   		disc.visible = data.visible;
	   	}
		
		if (data.image) {
			disc.image = data.image;
		}
		
		var param;
	   	if (data.weight && _.isNumber(param = parseInt(data.weight))) {
	   		disc.weight = param;
	   	}
	   	
	   	if (data.speed && _.isNumber(param = parseInt(data.speed))) {
	   		disc.speed = data.speed;
	   	}
	   	
	   	if (data.glide && _.isNumber(param = parseInt(data.glide))) {
	   		disc.glide = data.glide;
	   	}
	   	
	   	if (data.turn && _.isNumber(param = parseInt(data.turn))) {
	   		disc.turn = data.turn;
	   	}
	   	
	   	if (data.fade && _.isNumber(param = parseInt(data.fade))) {
	   		disc.fade = data.fade;
	   	}
	   	
	   	if (data.tagList) {
	   		disc.tagList = [];
	   		_.each(data.tagList, function(tag) {
	   			if (tag !== "" && !_.contains(disc.tagList, tag)) {
	   				disc.tagList.push(tag);
	   			}
	   		});
	   	}
	   	
	   	if (data.primaryImage) {
	   		console.log('Updating primary image.');
	   		DiscImageController.getDiscImage(userId, data.primaryImage, function(err, discImage) {
	   			if (!err && discImage && !_.isEmpty(discImage)) {
	   				disc.primaryImage = discImage._id;
	   			}
	   			
	   			disc.save(function(err){
					if (err)
						return callback(Error.createError(err, Error.internalError));
					else
						return callback(null, disc);
				});
	   		});
	   	} else {
	   		disc.save(function(err){
				if (err)
					return callback(Error.createError(err, Error.internalError));
				else
					return callback(null, disc);
			});
	   	}
	});
}

/// Delete Disc
function deleteDisc(userId, discId, gfs, callback) {
	getDisc(userId, discId, function(err, disc){
		if (err)
			return callback(err);
			
		if (!disc)
			return callback(Error.createError('Unknown disc identifier.', Error.objectNotFoundError));
		
		DiscImageController.deleteDiscImages(userId, discId, gfs, function(err, discImages) {
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