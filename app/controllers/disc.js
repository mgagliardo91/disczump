var Disc = require('../models/disc');
var _ = require('underscore');

module.exports = {
    getDiscs: getDiscs,
    getDisc: getDisc,
    postDisc: postDisc,
    putDisc: putDisc,
    deleteDisc: deleteDisc
}

/// Get All Discs by User
function getDiscs(userId, callback) {
    return Disc.find({userId : userId}, callback);
}

/// Get Disc by Id and User
function getDisc(userId, discId, callback) {
	Disc.findById(discId, function(err, disc) {
		if (err) 
			return callback(err);
			
		if (disc && disc.userId == userId) 
			return callback(null, disc);
		else
			return callback(null, {});
	});	
}

/// Create Disc
function postDisc(userId, data, callback) {
    var disc = new Disc();
    disc.userId = userId;
    if (!data.brand || !data.name) {
    	return callback('Invalid disc data', null);
    }
    
    disc.brand = data.brand;
    disc.name = data.name;
   	disc.material = data.material;
   	disc.type = data.type;
   	disc.color = data.color;
   	disc.notes = data.notes;
   	
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

	disc.save(function(err){
		if (err)
			return callback(err, null);
		else
			return callback(null, disc);
	});
}

/// Update disc
function putDisc(userId, discId, data, callback) {
	getDisc(userId, discId, function(err, disc){
		if (err)
			return callback(err);
			
		if (_.isEmpty(disc))
			return callback(null, disc);
			
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
		
		if (data.image) {
			disc.image = data.image;
		}
		
		if (data.weight && _.isNumber(data.weight)) {
			disc.weight = data.weight;
		}
		
		if (data.speed && _.isNumber(data.speed)) {
			disc.speed = data.speed;
		}
		
		if (data.glide && _.isNumber(data.glide)) {
			disc.glide = data.glide;
		}
		
		if (data.turn && _.isNumber(data.turn)) {
			disc.turn = data.turn;
		}
		
		if (data.fade && _.isNumber(data.fade)) {
			disc.fade = data.fade;
		}
		
		disc.save(function(err){
			if (err)
				return callback(err, null);
			else
				return callback(null, disc);
		});
	});
}

/// Delete Disc
function deleteDisc(userId, discId, callback) {
	getDisc(userId, discId, function(err, disc){
		if (err)
			return callback(err);
			
		if (_.isEmpty(disc))
			return callback(null, disc);
		
		disc.remove(function (err, disc) {
			if (err)
				return callback(err);
			else
				console.log(disc);
				return callback(null, disc);
		});
	});
}