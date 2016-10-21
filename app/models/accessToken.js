var mongoose = require('mongoose');
var TTL = require('../../config/config.js').tokenTTL;
var shortId = require('shortid');

var accessTokenSchema = mongoose.Schema({
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
    lastAccess: {
        type: Date
    },
    createDate: {
        type: Date
    }
    
});

accessTokenSchema.methods.updateAccess = function() {
    this.lastAccess = new Date();
    this.save();
};

accessTokenSchema.pre('save', function(next) {
    if (this.isNew) {
		this.createDate = new Date();
		this.lastAccess = new Date();
    }
	
    next();
});

module.exports = mongoose.model('AccessToken', accessTokenSchema);
