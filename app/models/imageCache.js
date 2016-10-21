var mongoose = require('mongoose');
var shortId = require('shortid');

var imageCacheSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
	fileId: String,
    thumbnailId: String,
    createDate: {type: Date}
    
});

imageCacheSchema.pre('save', function(next) {
    if (this.isNew) {
		this.createDate = new Date();
    }
	
    next();
});

module.exports = mongoose.model('ImageCache', imageCacheSchema);