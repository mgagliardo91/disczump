// app/models/disc.js

var mongoose = require('mongoose');
var shortId = require('shortid');

var discSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId          : String,
    brand           : String,
    name            : String,
    type            : String,
    weight          : String,
    material        : String,
    color           : String,
    speed           : String,
    glide           : String,
    turn            : String,
    fade            : String,
    notes           : String,
    primaryImage    : String,
    imageList       : [{
                        _id: {
                    	    type: String,
                    	    unique: true,
                    	    default: shortId.generate
                    	},
                        fileId          : String,
                        thumbnailId     : String
                    }],
    tagList         : [String],
    visible         : {type:Boolean, default: false},
    condition       : String,
    createDate      : {type: Date, default: Date.now}
    
});

module.exports = mongoose.model('Disc', discSchema);