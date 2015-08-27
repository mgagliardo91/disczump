// app/models/thread.js

var mongoose = require('mongoose');
var shortId = require('shortid');

var threadSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    isPrivate       : {type: Boolean, default: false},
    createDate      : {type: Date, default: Date.now},
    modifiedDate    : {type: Date, default: Date.now()},
    messageCount    : {type: Number, default: 0},
    archive         : {type: Boolean, default: false}
    
});

module.exports = mongoose.model('Thread', threadSchema);