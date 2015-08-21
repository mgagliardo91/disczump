// app/models/messageAccess.js

var mongoose = require('mongoose');

var threadLocalSchema = mongoose.Schema({

    userId          : {type: String},
    isPrivate       : {type: Boolean, default: false},
    threadId        : {type: String},
    messageCount    : {type: Number, default: 0},
    threadPhoto     : {type: String},
    threadTag       : {type: String},
    message         : {type: String},
    createDate      : {type: Date, default: Date.now}
    
});

module.exports = mongoose.model('ThreadLocal', threadLocalSchema);