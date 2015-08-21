// app/models/thread.js

var mongoose = require('mongoose');

var threadSchema = mongoose.Schema({
    
    isPrivate       : {type: Boolean, default: false},
    createDate      : {type: Date, default: Date.now},
    modifiedDate    : {type: Date, default: Date.now()},
    messageCount    : {type: Number, default: 0},
    archive         : {type: Boolean, default: false}
    
});

module.exports = mongoose.model('Thread', threadSchema);