var _ = require('underscore');
var async = require('async');
var Error = require('../utils/error');
var Disc = require('../models/disc');
var UserController = require('./user.js');
var ArchiveController = require('./archive.js');
var ImageController = require('./imageCache.js');
var FileUtil = require('../utils/file.js');

module.exports = {
    /* Standard Functions */
    getPreview: getPreview,
    getDiscs: getDiscs,
    getDisc: getDisc,
    createDisc: createDisc,
    updateDisc: updateDisc,
    deleteDisc: deleteDisc,
    getDiscImages: getDiscImages,
    getDiscImage: getDiscImage,
    deleteDiscImages: deleteDiscImages,
    deleteUserDiscs: deleteUserDiscs,
    
    /* Admin Functions */
    getAllDiscs: getAllDiscs
}

/* Standard Functions */
function getPreview(userId, refDiscId, callback) {
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
    UserController.getActiveUser(userId, function(err, user) {
		if (err)
			return callback(err);
			
		if (typeof(reqUserId) !== 'undefined' && reqUserId == userId) {
            Disc.find({userId: userId}).sort({createDate: -1}).exec(function (err, discs){
                if (err)
                    return callback(Error.createError(err, Error.internalError));
                
                return callback(null, discs);
            });
        } else {
            Disc.find({userId: userId, visible: true}).sort({createDate: -1}).exec(function (err, discs){
                if (err)
                    return callback(Error.createError(err, Error.internalError));
                
                return callback(null, discs);
            });
        }
	});
}

function getDisc(userId, discId, callback) {
    getDiscInternal(discId, function(err, disc) {
        if (err)
            return callback(err);
        
        if (disc.visible || (userId && userId == disc.userId)) {
            return callback(null, disc);
        } else {
            return callback(Error.createError('Disc is not visible to the public.', Error.unauthorizedError));
        }
    });
}

function getDiscInternal(discId, callback) {
    Disc.findOne({_id: discId}, function(err, disc) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        if (!disc)
            return callback(Error.createError('Unknown disc identifier.', Error.objectNotFoundError));
            
        UserController.getActiveUser(disc.userId, function(err, user) {
    		if (err)
    			return callback(err);
    			
            return callback(null, disc);
        });
    });
}

function createDisc(userId, data, callback) {
    var disc = new Disc();
    disc.userId = userId;
    
    if (typeof data.brand === 'undefined' || !data.brand.trim().length) {
        return callback(Error.createError('Creating a disc requires providing a brand.', Error.invalidDataError));
    }
    
    if (typeof data.name === 'undefined' || !data.name.trim().length) {
        return callback(Error.createError('Creating a disc requires providing a name.', Error.invalidDataError));
    }
    
    disc.brand = data.brand.trim();
    disc.name = data.name.trim();
    
    if (typeof data.material !== 'undefined') {
        disc.material = data.material.trim();
    }
    
    
    if (typeof data.type !== 'undefined') {
        disc.type = data.type.trim();
    }
    
    
    if (typeof data.color !== 'undefined') {
        disc.color = data.color.trim();
    }
    
    if (typeof data.notes !== 'undefined') {
        disc.notes = data.notes;
    }
    
    if (typeof data.visible !== 'undefined') {
        disc.visible = data.visible;
    }
    
    if (typeof data.weight !== 'undefined') {
        if (data.weight == '') {
            disc.weight = undefined;
        } else if (/^\d{1,3}$/.test(data.weight)){
            disc.weight = data.weight;
        }
    }
    
    if (typeof data.speed !== 'undefined') {
        if (data.speed == '') {
            disc.speed = undefined;
        } else if (/^[-]?\d{1,2}$/.test(data.speed)){
            disc.speed = data.speed;
        }
    }
    
    if (typeof data.glide !== 'undefined') {
        if (data.glide == '') {
            disc.glide = undefined;
        } else if (/^[-]?\d{1,2}$/.test(data.glide)){
            disc.glide = data.glide;
        }
    }
    
    if (typeof data.turn !== 'undefined') {
        if (data.turn == '') {
            disc.turn = undefined;
        } else if (/^[-]?\d{1,2}$/.test(data.turn)){
            disc.turn = data.turn;
        }
    }
    
    if (typeof data.fade !== 'undefined') {
        if (data.fade == '') {
            disc.fade = undefined;
        } else if (/^[-]?\d{1,2}$/.test(data.fade)){
            disc.fade = data.fade;
        }
    }
    
    if (typeof data.condition !== 'undefined') {
        if (data.condition == '') {
            disc.condition = undefined;
        } else if (/^\d{1,2}$/.test(data.condition)){
            disc.condition = data.condition;
        }
    }
    
    disc.tagList = [];
    if (typeof data.tagList !== 'undefined' && _.isArray(data.tagList)) {
        _.each(data.tagList, function(tag) {
            if (tag !== "" && !_.contains(disc.tagList, tag)) {
                disc.tagList.push(tag);
            }
        });
    }
    
    async.series([
        function(cb) {
             if (typeof data.imageList !== 'undefined' && _.isArray(data.imageList)) {
                async.eachSeries(data.imageList, function(imageId, imgCb) {
                    ImageController.getImageCache(imageId, function(err, imageObj) {
                        if (!err && imageObj) {
                            disc.imageList.push(imageObj);
                            if (typeof (disc.primaryImage) === 'undefined') {
                                disc.primaryImage = imageObj._id;
                            }
                        }
                        
                        imgCb();
                    });
                }, function(err) {
                    cb();
                });
            } else {
                cb();
            }
        },
        function(cb) {
            if (typeof data.primaryImage !== 'undefined') {
                var imageObj = _.findWhere(disc.imageList, {_id: data.primaryImage});
                if (imageObj) {
                    disc.primaryImage = imageObj._id;
                }
                
                cb();
            } else {
                if (disc.imageList.length) {
                    disc.primaryImage = disc.imageList[0]._id;
                }
                cb();
            }
        }
    ], function(err, results){
        disc.save(function(err){
            if (err)
                return callback(Error.createError(err, Error.internalError));
            else
                return callback(null, disc);
        });
    });
}

function updateDisc(userId, discId, data, gfs, callback) {
    getDiscInternal(discId, function(err, disc){
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
        
        if (typeof data.material !== 'undefined') {
            disc.material = data.material.trim();
        }
        
        if (typeof data.type !== 'undefined') {
            disc.type = data.type.trim();
        }
        
        if (typeof data.color !== 'undefined') {
            disc.color = data.color.trim();
        }
        
        if (typeof data.notes !== 'undefined') {
            disc.notes = data.notes.trim();
        }
        
        if (typeof data.visible !== 'undefined' && _.isBoolean(data.visible)) {
            disc.visible = data.visible;
        }
        
        if (typeof data.weight !== 'undefined') {
            if (data.weight == '') {
                disc.weight = undefined;
            } else if (/^\d{1,3}$/.test(data.weight)){
                disc.weight = data.weight;
            }
        }
        
        if (typeof data.speed !== 'undefined') {
            if (data.speed == '') {
                disc.speed = undefined;
            } else if (/^[-]?\d{1,2}$/.test(data.speed)){
                disc.speed = data.speed;
            }
        }
        
        if (typeof data.glide !== 'undefined') {
            if (data.glide == '') {
                disc.glide = undefined;
            } else if (/^[-]?\d{1,2}$/.test(data.glide)){
                disc.glide = data.glide;
            }
        }
        
        if (typeof data.turn !== 'undefined') {
            if (data.turn == '') {
                disc.turn = undefined;
            } else if (/^[-]?\d{1,2}$/.test(data.turn)){
                disc.turn = data.turn;
            }
        }
        
        if (typeof data.fade !== 'undefined') {
            if (data.fade == '') {
                disc.fade = undefined;
            } else if (/^[-]?\d{1,2}$/.test(data.fade)){
                disc.fade = data.fade;
            }
        }
        
        if (typeof data.condition !== 'undefined') {
            if (data.condition == '') {
                disc.condition = undefined;
            } else if (/^\d{1,2}$/.test(data.condition)){
                disc.condition = data.condition;
            }
        }
        
        if (typeof data.tagList !== 'undefined' && _.isArray(data.tagList)) {
            disc.tagList = [];
            _.each(data.tagList, function(tag) {
                if (tag !== "" && !_.contains(disc.tagList, tag)) {
                    disc.tagList.push(tag);
                }
            });
        }
        
        
        var curImageArray = disc.imageList;
        async.series([
            function(cb) {
                 if (typeof data.imageList !== 'undefined' && _.isArray(data.imageList)) {
                    var imageArray = [];
                     
                    async.eachSeries(data.imageList, function(imageItem, imgCb){
                        if (typeof (imageItem._id) === 'undefined') return imgCb();
                        
                        var index = _.findIndex(curImageArray, {_id: imageItem._id});
                        
                        if (index > -1) {
                            imageArray.push(curImageArray.splice(index, 1)[0]);
                            return imgCb();
                        }
                        
                        ImageController.getImageCache(imageItem._id, function(err, imageObj) {
                            if (!err && imageObj) {
                                imageArray.push(imageObj);
                            }
                            
                            return imgCb();
                        });
                    }, function(err) {
                        disc.imageList = imageArray;
                        return cb();
                    });
                 } else {
                     cb();
                 }
            },
            function(cb) {
                if (curImageArray.length) {
                    _.each(curImageArray, function(imageObj) {
                        if (disc.primaryImage == imageObj._id) {
                            disc.primaryImage = disc.imageList.length ? disc.imageList[0]._id : undefined;
                        }
                        
                        deleteDiscImageObj(imageObj, gfs, function(err, imageObj) {
                            if (err)
                                console.log(err);
                        });
                    });
                    
                    cb();
                } else {
                    cb();
                }
            }
        ], function(err, results) {
            if (_.has(data, 'primaryImage')) {
                var discImage = _.findWhere(disc.imageList, {_id: data.primaryImage});
                if (discImage) {
                    disc.primaryImage = discImage._id;
                }
            }
            
            if (typeof (disc.primaryImage) === 'undefined' && disc.imageList.length) {
                disc.primaryImage = disc.imageList[0]._id;
            }
            
            disc.save(function(err, disc){
                if (err)
                    return callback(Error.createError(err, Error.internalError));
                
               return callback(null, disc);
            });
        });
    });
}

function deleteDisc(userId, discId, gfs, callback) {
    getDiscInternal(discId, function(err, disc){
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
                
                ArchiveController.archiveDisc(disc);
                return callback(null, disc);
            });
        });
    });
}

function getDiscImages(userId, discId, callback) {
	getDisc(userId, discId, function(err, disc) {
		if (err) 
			return callback(err);
		
		return callback(null, disc.imageList);
	});
}

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

function deleteUserDiscs(userId, gfs, callback) {
    getDiscs(userId, userId, function(err, discs) {
        if (err)
            return callback(err);
        
        async.each(discs, function(disc, cb) {
            deleteDiscImages(userId, disc._id, gfs, function(err, discImages) {
                ArchiveController.archiveDisc(disc);
                disc.remove(function (err, disc) {
                    return cb();
                });
            });
        }, function(err) {
            callback();
        });
    });
}

/* Admin Functions */
function getAllDiscs(params, callback) {
    var filters = [];
    
    if (!params.sort.length) {
        params.sort.push(['brand', 1])
    }
    
    _.each(_.keys(params.filter), function(key) {
        var filter = {};
        filter[key] = new RegExp(params.filter[key], 'i');
        filters.push(filter);
    });
    
    Disc.count(filters.length ? {$and: filters} : {}, function(err, count) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
            
        if (params.size > count) {
            params.size = count;
        }
        
        if (params.size * (params.page - 1) > count) {
            params.page = Math.floor(count / params.size) + 1;
        }
        
        Disc
        .find(filters.length ? {$and: filters} : {})
        .sort(params.sort)
        .skip(params.size * (params.page - 1))
        .limit(params.size)
        .exec(function(err, discs) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
                
            return callback(null, {
                discs: discs,
                total: count,
                page: params.page,
                size: params.size
            });
        });
    });

}

/* Private Functions */
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