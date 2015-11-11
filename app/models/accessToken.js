var mongoose = require('mongoose');
var TTL = require('../../config/config.js').tokenTTL;
var shortId = require('shortid');

var accessTokenSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId: {
        type: String,
        required: true
    },
    clientId: {
        type: String,
        required: true
    },
    token: {
        type: String,
        unique: true,
        required: true
    },
    created: {
        type: Date,
        default: Date.now,
        expires: TTL
    }
    
});

module.exports = mongoose.model('AccessToken', accessTokenSchema);
