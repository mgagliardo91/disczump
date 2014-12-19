// app/models/temporaryLink.js

var mongoose = require('mongoose');
var TTL = require('../../config/config.js').recoverTTL;

var temporaryLinkSchema = mongoose.Schema({

    authorizationId: {
        type: String,
        required: true,
        unique: true
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
        default: Date.now,
        expires: TTL
    }
    
});

module.exports = mongoose.model('TemporaryLink', temporaryLinkSchema);
