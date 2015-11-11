var mongoose = require('mongoose');
var shortId = require('shortid');

var discArchiveSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
	discId: String,
    userId: String,
    brand: String,
    name: String,
    type: String,
    weight: String,
    material: String,
    color: String,
    createDate: Date,
    archiveDate: {type: Date, default: Date.now}
    
});

module.exports = mongoose.model('DiscArchive', discArchiveSchema);