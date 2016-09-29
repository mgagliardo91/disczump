var _ = require('underscore');
var XDate = require('xdate');
var async = require('async');

var Disc = require('../models/disc');

var UserController = require('./user.js');
var ArchiveController = require('./archive.js');
var ImageController = require('./imageCache.js');

var Error = require('../utils/error');
var FileUtil = require('../utils/file.js');
var logger = require('../utils/logger.js');

var DiscConfig = require('../../config/config.js').disc;

module.exports = {
    /* Standard Functions */
    getDiscCountByUser: getDiscCountByUser,
    getDiscsByUser: getDiscsByUser,
    getDisc: getDisc,
	getMarketplaceDiscCount: getMarketplaceDiscCount,
    createDisc: createDisc,
    updateDisc: updateDisc,
    deleteDisc: deleteDisc,
    getDiscImages: getDiscImages,
    getDiscImage: getDiscImage,
    deleteDiscImages: deleteDiscImages,
    deleteUserDiscs: deleteUserDiscs,
	bumpDisc: bumpDisc,
	removeUsersDiscsFromMarketplace: removeUsersDiscsFromMarketplace,
    
    /* Admin Functions */
    getAllDiscs: getAllDiscs
}

function isDef(x) {
	return typeof x !== 'undefined';
}

function marketAvailable(userId, callback) {
	getMarketplaceDiscCount(userId, function(err, count) {
		if (err)
			return callback(Error.createError(err, Error.internalError));

		UserController.getMarketCap(userId, function(err, cap) {
			if (err)
				return callback(Error.createError(err, Error.internalError));
			
			return callback(null, cap == -1 || cap > count);
		});
	});
}

function updateMarket(disc) {
	if (!disc.marketplace.postedDate) {
		disc.marketplace.postedDate = new Date();
	} else {
		var lastMod = new XDate(disc.marketplace.postedDate);
		logger.debug('Attempting to update disc');
		if (lastMod.diffMinutes(new XDate()) >= DiscConfig.marketplaceModThresholdMins) {
			disc.marketplace.postedDate = new Date();
		}
	}
}

/* Standard Functions */
function getDiscCountByUser(userId, callback, all) {
	var query = {
		userId: userId
	};
	
	if (!all) {
		query.visible = true;
	}
	
    Disc.count(query, function(err, count) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
            
	     return callback(null, count);
	});
}
 
function getDiscsByUser(reqUserId, userId, callback) {
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

function getMarketplaceDiscCount(userId, callback) {
	Disc.count({$and: [
					{userId: userId},
					{$or: [
						{'marketplace.forSale': true},
						{'marketplace.forTrade': true}
					]}
				]
		  }).exec(function(err, count) {
			if (err)
            	return callback(Error.createError(err, Error.internalError));
			
			return callback(null, count);
	});
}

function createDisc(userId, data, callback) {
    var disc = new Disc();
    disc.userId = userId;
    
    if (!isDef(data.brand) || !data.brand.trim().length) {
        return callback(Error.createError('Creating a disc requires a brand.', Error.invalidDataError));
    }
    
    if (!isDef(data.name) || !data.name.trim().length) {
        return callback(Error.createError('Creating a disc requires a name.', Error.invalidDataError));
    }
	
	var markSale, markTrade;
    
    disc.brand = data.brand.trim();
    disc.name = data.name.trim();
    
    if (isDef(data.material)) {
        disc.material = data.material.trim();
    }
    
    if (isDef(data.type)) {
        disc.type = data.type.trim();
    }
    
    if (isDef(data.color)) {
        disc.color = data.color.trim();
    }
    
    if (isDef(data.notes)) {
        disc.notes = data.notes.trim();
    }
    
	if (isDef(data.visible) && _.isBoolean(data.visible)) {
		disc.visible = data.visible;
	}
    
	if (data.hasOwnProperty('weight')) {
        if (data.weight != null) {
			var weight = parseInt(data.weight);
			if (!isNaN(weight) && weight < 1000 && weight > 0) disc.weight = weight;
        }
    }
	
	if (data.hasOwnProperty('speed')) {
        if (data.speed != null) {
			var speed = parseFloat(data.speed);
			if (!isNaN(speed) && speed < 100 && speed > 0) disc.speed = parseFloat((speed).toFixed(1));
        }
    }
	
	if (data.hasOwnProperty('glide')) {
        if (data.glide != null) {
			var glide = parseFloat(data.glide);
			if (!isNaN(glide) && glide < 100 && glide > 0) disc.glide = parseFloat((glide).toFixed(1));
        }
    }
	
	if (data.hasOwnProperty('turn')) {
        if (data.turn != null) {
			var turn = parseFloat(data.turn);
			if (!isNaN(turn) && turn < 100 && turn > -100) disc.turn = parseFloat((turn).toFixed(1));
        }
    }
	
	if (data.hasOwnProperty('fade')) {
        if (data.fade != null) {
			var fade = parseFloat(data.fade);
			if (!isNaN(fade) && fade < 100 && fade > -100) disc.fade = parseFloat((fade).toFixed(1));
        }
    }
	
	if (data.hasOwnProperty('condition')) {
        if (data.condition != null) {
			var condition = parseInt(data.condition);
			if (!isNaN(condition) && condition <= 10 && condition >= 0) disc.condition = condition;
        }
    }
    
    if (isDef(data.marketplace)) {
		if (data.marketplace.hasOwnProperty('value')) {
			if (data.marketplace.value != null) {
				var value = parseFloat(data.marketplace.value);
				if (!isNaN(value) && value >= 0) disc.marketplace.value = parseFloat((value).toFixed(2));
			}
		}
		
		markSale = isDef(data.marketplace.forSale) && data.marketplace.forSale;
		markTrade = isDef(data.marketplace.forTrade) && data.marketplace.forTrade;
    }
    
    disc.tagList = [];
    if (isDef(data.tagList) && _.isArray(data.tagList)) {
        _.each(data.tagList, function(tag) {
            if (tag !== '' && !_.contains(disc.tagList, tag)) {
                disc.tagList.push(tag);
            }
        });
    }
    
    async.series([
		function(cb) {
			if ((markSale && data.marketplace.forSale) || (markTrade && data.marketplace.forTrade)) {
				if (!disc.visible)
					return cb(Error.createError('Cannot mark disc for marketplace if it is set to private.', Error.invalidDataError));
				
				marketAvailable(userId, function(err, available) {
					if (err)
						return cb(err);
					
					if (available) {
						disc.marketplace.forSale = markSale ? markSale : undefined;
						disc.marketplace.forTrade = markTrade ? markTrade : undefined;
						updateMarket(disc);
						cb();
					} else {
						cb(Error.createError('Cannot mark disc for marketplace (For Sale/For Trade). User market cap has been reached.', Error.limitError));
					}
				});
			} else {
				cb();
			}
		},
        function(cb) {
             if (isDef(data.imageList) && _.isArray(data.imageList)) {
                async.eachSeries(data.imageList, function(imageId, imgCb) {
                    ImageController.getImageCache(imageId, function(err, imageObj) {
                        if (!err && imageObj) {
                            disc.imageList.push(imageObj);
                            if (!isDef(disc.primaryImage)) {
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
            if (isDef(data.primaryImage)) {
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
		if (err)
			return callback(err);
		
        disc.save(function(err){
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, disc);
        });
    });
}

function bumpDisc(userId, discId, callback) {
	getDiscInternal(discId, function(err, disc){
        if (err)
            return callback(Error.createError(err, Error.internalError));
            
        if (!disc)
            return callback(Error.createError('Unknown disc identifier.', Error.objectNotFoundError));
            
        if (disc.userId != userId)
            return callback(Error.createError('Unauthorized to modify disc.', Error.unauthorizedError));
		
		if (disc.marketplace.forSale || disc.marketplace.forTrade) {
			updateMarket(disc);
			
			disc.save(function(err) {
				if (err)
					return callback(Error.createError(err, Error.internalError));
				
				return callback(null, disc);
			})
		} else return callback(null, disc);
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
		
		var markSale, markTrade;
		var priorActive = disc.marketplaceActive();
        
        if (isDef(data.brand) && data.brand.trim().length) {
            disc.brand = data.brand.trim();
        }
        
        if (isDef(data.name) && data.name.trim().length) {
            disc.name = data.name.trim();
        }
        
        if (isDef(data.material)) {
            disc.material = data.material.trim();
        }
        
        if (isDef(data.type)) {
            disc.type = data.type.trim();
        }
        
        if (isDef(data.color)) {
            disc.color = data.color.trim();
        }
        
        if (isDef(data.notes)) {
            disc.notes = data.notes.trim();
        }
        
        if (isDef(data.visible) && _.isBoolean(data.visible)) {
            disc.visible = data.visible;
        }
        
        if (data.hasOwnProperty('weight')) {
			if (data.weight === null) {
				disc.weight = undefined;
			} else {
				var weight = parseInt(data.weight);
				if (!isNaN(weight) && weight < 1000 && weight > 0) disc.weight = weight;
			}
		}

		if (data.hasOwnProperty('speed')) {
			if (data.speed === null) {
				disc.speed = undefined;
			} else {
				var speed = parseFloat(data.speed);
				if (!isNaN(speed) && speed < 100 && speed > 0) disc.speed = parseFloat((speed).toFixed(1));
			}
		}

		if (data.hasOwnProperty('glide')) {
			if (data.glide === null) {
				disc.glide = undefined;
			} else {
				var glide = parseFloat(data.glide);
				if (!isNaN(glide) && glide < 100 && glide > 0) disc.glide = parseFloat((glide).toFixed(1));
			}
		}

		if (data.hasOwnProperty('turn')) {
			if (data.turn === null) {
				disc.turn = undefined;
			} else {
				var turn = parseFloat(data.turn);
				if (!isNaN(turn) && turn < 100 && turn > -100) disc.turn = parseFloat((turn).toFixed(1));
			}
		}

		if (data.hasOwnProperty('fade')) {
			if (data.fade === null) {
				disc.fade = undefined;
			} else {
				var fade = parseFloat(data.fade);
				if (!isNaN(fade) && fade < 100 && fade > -100) disc.fade = parseFloat((fade).toFixed(1));
			}
		}

		if (data.hasOwnProperty('condition')) {
			if (data.condition === null) {
				disc.condition = undefined;
			} else {
				var condition = parseInt(data.condition);
				if (!isNaN(condition) && condition <= 10 && condition >= 0) disc.condition = condition;
			}
		}
        
        if (isDef(data.tagList) && _.isArray(data.tagList)) {
            disc.tagList = [];
            _.each(data.tagList, function(tag) {
                if (tag !== '' && !_.contains(disc.tagList, tag)) {
                    disc.tagList.push(tag);
                }
            });
        }
        
        if (isDef(data.marketplace)) {
            if (data.marketplace.hasOwnProperty('value')) {
				if (data.marketplace.value === null) {
						disc.marketplace.value = undefined;
				} else {
					var value = parseFloat(data.marketplace.value);
					if (!isNaN(value) && value >= 0) disc.marketplace.value = parseFloat((value).toFixed(2));
				}
			}
			
			markSale = typeof data.marketplace.forSale !== 'undefined';
			markTrade = typeof data.marketplace.forTrade !== 'undefined';
        }
        
        var curImageArray = [];
        async.series([
			function(cb) {
				if (priorActive) { // Update without checking
					if (markSale) {
						disc.marketplace.forSale = data.marketplace.forSale;
					}
					
					if (markTrade) {
						disc.marketplace.forTrade = data.marketplace.forTrade;
					}
					
					if (!disc.visible) {
						disc.marketplace.forSale = false;
						disc.marketplace.forTrade = false;
					}
					
					return cb();
				} else if ((markSale && data.marketplace.forSale) || (markTrade && data.marketplace.forTrade)) { // Moving to market
					if (!disc.visible)
						return cb(Error.createError('Cannot mark disc for marketplace if it is set to private.', Error.invalidDataError));
					
					marketAvailable(userId, function(err, available) {
						if (err)
							return cb(err);

						if (available) {
							if (markSale) {
								disc.marketplace.forSale = data.marketplace.forSale;
							}

							if (markTrade) {
								disc.marketplace.forTrade = data.marketplace.forTrade;
							}

							cb();
						} else {
							cb(Error.createError('Cannot mark disc for marketplace (For Sale/For Trade). User market cap has been reached.', Error.limitError));
						}

					});
				} else { // No update required
					return cb();
				}
			},
            function(cb) {
                 if (isDef(data.imageList) && _.isArray(data.imageList)) {
                    curImageArray = disc.imageList;
                    var imageArray = [];
                     
                    async.eachSeries(data.imageList, function(imageItem, imgCb){
                        if (!isDef(imageItem._id)) return imgCb();
                        
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
                        
                        deleteDiscImageObj(imageObj, gfs, function(err, imageObj) {});
                    });
                    
                    cb();
                } else {
                    cb();
                }
            }
        ], function(err, results) {
			if (err)
				return callback(err);
			
            if (isDef(data.primaryImage)) {
                var discImage = _.findWhere(disc.imageList, {_id: data.primaryImage});
                if (discImage) {
                    disc.primaryImage = discImage._id;
                }
            }
            
            if (!isDef(disc.primaryImage) && disc.imageList.length) {
                disc.primaryImage = disc.imageList[0]._id;
            }
			
			if ((disc.marketplace.forSale || disc.marketplace.forTrade) && !priorActive) {
				updateMarket(disc);
			}
            
			disc.modifiedDate = new Date();
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

function getPrimaryImage(userId, discId, callback) {
    getDisc(userId, discId, function(err, disc) {
        if (err)
            return callback(err);
        
        if (!disc.primaryImage)
            return callback(null, {});
            
		var discImage = _.findWhere(disc.imageList, {_id: disc.primaryImage});
        
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
			
		if (!discImages.length)
			return callback(null, discImages);
		
		async.each(discImages, function(discImage, asyncCB){
			deleteDiscImageObj(discImage, gfs, asyncCB);
		}, function(err){
			if (err)
				return callback(Error.createError(err, Error.internalError));
			
			return callback(null, discImages);
		});
		
	});
}

function deleteUserDiscs(userId, gfs, callback) {
    getDiscsByUser(userId, userId, function(err, discs) {
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

function removeUsersDiscsFromMarketplace(userId, callback) {
	getDiscsByUser(userId, userId, function(err, discs) {
        if (err)
            return callback(err);
        
        async.each(discs, function(disc, cb) {
			disc.marketplace.forSale = false;
			disc.marketplace.forTrade = false;
			disc.save(function (err) {
				return cb();
            });
        }, function(err) {
            return callback();
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