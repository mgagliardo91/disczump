// app/models/client.js

var mongoose = require('mongoose');

var clientSchema = mongoose.Schema({

    name: {
        type: String,
        unique: true,
        required: true
    },
    clientId: {
        type: String,
        unique: true,
        required: true
    },
    clientSecret: {
        type: String,
        required: true
    }
    
});

module.exports = mongoose.model('Client', clientSchema);
