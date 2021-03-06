var mongoose = require('mongoose');
var shortId = require('shortid');

var threadLocalSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId: {type: String},
    isPrivate: {type: Boolean, default: false},
    threadId: {type: String},
    messageCount: {type: Number, default: 0},
    threadTag: {type: String},
    createDate: {type: Date},
    active: {type: Boolean, default: true},
    lastAlert: {type: Date}
    
});

threadLocalSchema.pre('save', function(next) {
    if (this.isNew) {
		this.createDate = new Date();
    }
	
    next();
});

threadLocalSchema.index({ threadId: 1, userId: 1 });
threadLocalSchema.index({ userId: 1, active: 1 });

module.exports = mongoose.model('ThreadLocal', threadLocalSchema);