// app/models/discImage.js

var mongoose = require('mongoose');
var shortId = require('shortid');

var discImageSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId          : String,
    discId          : String,
    fileId          : String,
    thumbnailId     : String
    
});

module.exports = mongoose.model('DiscImage', discImageSchema);