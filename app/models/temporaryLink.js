var mongoose = require('mongoose');
var TTL = require('../../config/config.js').recoverTTL;
var shortId = require('shortid');

var temporaryLinkSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId: {
        type: String,
        required: true
    },
    route: {
        type: String,
        required: true
    },
    created: {
        type: Date,
        expires: TTL
    }
    
});

temporaryLinkSchema.pre('save', function(next) {
    if (this.isNew) {
		this.created = new Date();
    }
	
    next();
});

module.exports = mongoose.model('TemporaryLink', temporaryLinkSchema);
