// app/models/disc.js

var mongoose = require('mongoose');

var discSchema = mongoose.Schema({

    userId          : String,
    brand           : String,
    name            : String,
    type            : String,
    weight          : Number,
    material        : String,
    color           : String,
    speed           : Number,
    glide           : Number,
    turn            : Number,
    fade            : Number,
    notes           : String,
    tagList         : [String],
    visible         : {type:Boolean, default: false}
    
});

module.exports = mongoose.model('Disc', discSchema);