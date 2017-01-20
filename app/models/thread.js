var mongoose = require('mongoose');
var shortId = require('shortid');

var threadSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    isPrivate: {type: Boolean, default: false},
    users: [String],
    createDate: {type: Date},
    modifiedDate: {type: Date},
    messageCount: {type: Number, default: 0},
    archive: {type: Boolean, default: false}
    
});

threadSchema.pre('save', function(next) {
    if (this.isNew) {
		this.createDate = new Date();
		this.modifiedDate = new Date();
    }
	
    next();
});

module.exports = mongoose.model('Thread', threadSchema);