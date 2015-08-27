// app/models/messageAccess.js

var mongoose = require('mongoose');
var shortId = require('shortid');

var threadLocalSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
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