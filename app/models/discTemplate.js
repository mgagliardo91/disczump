var mongoose = require('mongoose');
var shortId = require('shortid');;

var discTemplateSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    brand           : String,
    name            : String,
    type            : String,
    material        : String,
    speed           : String,
    glide           : String,
    turn            : String,
    fade            : String
    
});

module.exports = mongoose.model('DiscTemplate', discTemplateSchema);