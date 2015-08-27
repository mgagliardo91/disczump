// app/models/refreshToken.js

var mongoose = require('mongoose');
var shortId = require('shortid');

var refreshTokenSchema = mongoose.Schema({
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
        default: Date.now
    }
    
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
