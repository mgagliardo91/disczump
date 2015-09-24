var Error = require('../utils/error');
var Disc = require('../models/disc');
var DiscImageController = require('./discImage');
var _ = require('underscore');

module.exports = {
    getPublicPreview: getPublicPreview,
    getDiscs: getDiscs,
    getDisc: getDisc,
    postDisc: postDisc,
    putDisc: putDisc,
    deleteDisc: deleteDisc
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
    Disc.findOne({_id: discId}, function(err, disc) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        if (!disc)
            return callback(Error.createError('Unknown disc identifier.', Error.objectNotFoundError));
        
        if (disc.visible || (userId && userId == disc.userId)) {
            if (disc.primaryImage) {
                DiscImageController.getDiscImage(userId, disc.primaryImage, function(err, image) {
                    if (err) {
                        if (err.error.type == Error.invalidDataError) {
                            disc.primaryImage = undefined;
                            
                            disc.save(function() {
                                return callback(null, disc);
                            });
                        } else {
                            return callback(Error.createError(err.error.message, Error.internalError));
                        }
                    } else {
                        if (image) {
                            disc.retPrimaryImage = image;
                        }
                        
                        return callback(null, disc);
                    }
                });
            } else {
                return callback(null, disc);
            }
        } else {
            return callback(Error.createError('Disc is not visible to the public.', Error.unauthorizedError));
        }
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
    getDisc(userId, discId, function(err, disc){
        if (err)
            return callback(Error.createError(err, Error.internalError));
            
        if (!disc)
            return callback(Error.createError('Unknown disc identifier.', Error.objectNotFoundError));
            
        if (disc.userId != userId)
            return callback(Error.createError('Unauthorized to modify disc.', Error.unauthorizedError));
        
        if (typeof data.brand !== 'undefined') {
            disc.brand = data.brand;
        }
        
        if (typeof data.name !== 'undefined') {
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
        
        if (_.has(data, 'image')) {
            disc.image = data.image;
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
        
        if (typeof data.primaryImage !== 'undefined') {
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
            
        if (disc.userId != userId)
            return callback(Error.createError('Unauthorized to delete disc.', Error.unauthorizedError));
        
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