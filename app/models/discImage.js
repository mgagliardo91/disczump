// app/models/discImage.js

var mongoose = require('mongoose');

var discImageSchema = mongoose.Schema({

    userId          : String,
    discId          : String,
    fileId          : String
    
});

module.exports = mongoose.model('DiscImage', discImageSchema);