var mongoose = require('mongoose');
var shortId = require('shortid');

var Error = require('../utils/error');

var accountChangeRequestSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId: {
        type: String,
        required: true
    },
	userEmail: {
		type: String,
		required: true
	},
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
	fromAccount: {
		type: {type: String},
		amount: {type: Number}
	},
	toAccount: {
		type: {type: String},
		amount: {type: Number}
	},
	error: {
		type: mongoose.Schema.Types.Mixed
	},
	paymentChange: {
		type: Boolean
	},
	completed: {
		type: Boolean,
		default: false
	},
	immediateCharge: {
		type: Number
	},
	promo: {
		type: mongoose.Schema.Types.Mixed
	},
	failed: {
		type: Boolean,
		default: false
	},
    createDate: {
        type: Date
    }
    
});

accountChangeRequestSchema.methods.success = function(immedCharge, callback) {
	this.completed = true;
	
	if (typeof(immedCharge) !== 'undefined') {
		this.immediateCharge = immedCharge;
	}
	
	this.save(function(err) {
		if (err)
			return callback(Error.createError(err, Error.internalError));
		
		return callback();
	});
}

accountChangeRequestSchema.methods.fail = function(error, callback) {
	this.error = error;
	this.failed = true;
	this.completed = true;
	this.save(function(err) {
		if (err)
			return callback(Error.createError(err, Error.internalError));
		
		return callback();
	});
}

accountChangeRequestSchema.pre('save', function(next) {
    if (this.isNew) {
		this.createDate = new Date();
    }
	
    next();
});

module.exports = mongoose.model('AccountChangeRequest', accountChangeRequestSchema);