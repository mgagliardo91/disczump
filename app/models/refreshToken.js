var mongoose = require('mongoose');
var shortId = require('shortid');

var refreshTokenSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId: {
        type: String,
        required: true
    },
    clientId: {
        type: String,
        required: true
    },
    token: {
        type: String,
        unique: true,
        required: true
    },
    created: {
        type: Date
    }
    
});

refreshTokenSchema.pre('save', function(next) {
    if (this.isNew) {
		this.created = new Date();
    }
	
    next();
});

refreshTokenSchema.index({ token: 1 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
