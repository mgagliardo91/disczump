var mongoose = require('mongoose');
var shortId = require('shortid');

var messageSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId: {type: String},
    threadId: {type: String},
    body: {type: String},
    createDate: {type: Date},
    attachments: [String]
    
});

messageSchema.pre('save', function(next) {
    if (this.isNew) {
		this.createDate = new Date();
    }
	
    next();
});

messageSchema.index({ threadId: 1 });

module.exports = mongoose.model('Message', messageSchema);