// app/models/messageAccess.js

var mongoose = require('mongoose');

var messageSchema = mongoose.Schema({

    userId          : {type: String},
    threadId        : {type: String},
    body            : {type: String},
    createDate      : {type: Date, default: Date.now},
    attachments     : [String]
    
});

module.exports = mongoose.model('Message', messageSchema);