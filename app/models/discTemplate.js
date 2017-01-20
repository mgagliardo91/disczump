var mongoose = require('mongoose');
var shortId = require('shortid');;

var discTemplateSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
	textSearch: String,
    brand: String,
    name: String,
    type: String,
    material: String,
    speed: Number,
    glide: Number,
    turn: Number,
    fade: Number
    
});

discTemplateSchema.index({ textSearch: 1 });

module.exports = mongoose.model('DiscTemplate', discTemplateSchema);