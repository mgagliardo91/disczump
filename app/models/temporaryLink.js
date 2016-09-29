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
        default: new Date(),
        expires: TTL
    }
    
});

module.exports = mongoose.model('TemporaryLink', temporaryLinkSchema);
