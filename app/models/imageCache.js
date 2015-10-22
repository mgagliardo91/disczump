// app/models/event.js

var mongoose = require('mongoose');
var shortId = require('shortid');

var imageCacheSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
	fileId          : String,
    thumbnailId     : String,
    createDate      : {type: Date, default: Date.now}
    
});

module.exports = mongoose.model('ImageCache', imageCacheSchema);