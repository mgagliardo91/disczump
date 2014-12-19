// app/models/accessToken.js

var mongoose = require('mongoose');
var TTL = require('../../config/config.js').tokenTTL;

var accessTokenSchema = mongoose.Schema({

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
