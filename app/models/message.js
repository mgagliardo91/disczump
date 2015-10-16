// app/models/messageAccess.js

var mongoose = require('mongoose');
var shortId = require('shortid');

var messageSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId          : {type: String},
    threadId        : {type: String},
    body            : {type: String},
    createDate      : {type: Date, default: Date.now},
    attachments     : [String]
    
});

module.exports = mongoose.model('Message', messageSchema);