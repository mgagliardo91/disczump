var mongoose = require('mongoose');
var shortId = require('shortid');;

var discMoldSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
	textSearch: String,
	brand: String,
	name: String,
	type: String,
	speed: Number,
	glide: Number,
	turn: Number,
	fade: Number
});

var discMaterialSchema = mongoose.Schema({
	_id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
	brand: String,
	material: [String]
});

discMoldSchema.index({ textSearch: 1 });
discMaterialSchema.index({ brand: 1 });

module.exports = {
	DiscMold: mongoose.model('DiscMold', discMoldSchema),
	DiscMaterial: mongoose.model('DiscMaterial', discMaterialSchema)
}