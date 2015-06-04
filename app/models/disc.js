// app/models/disc.js

var mongoose = require('mongoose');

var discSchema = mongoose.Schema({

    userId          : String,
    brand           : String,
    name            : String,
    type            : String,
    weight          : String,
    material        : String,
    color           : String,
    speed           : String,
    glide           : String,
    turn            : String,
    fade            : String,
    notes           : String,
    primaryImage    : String,
    tagList         : [String],
    visible         : {type:Boolean, default: false},
    condition       : String
    
});

module.exports = mongoose.model('Disc', discSchema);