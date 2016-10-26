var mongoose = require('mongoose');
var shortId = require('shortid');

var cancelAttemptSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId: {
        type: String,
        required: true
    },
    initialCancelDate: {
        type: Date
    },
    profileId: {
        type: String
    },
    tryCount: {
        type: Number,
		default: 1
    },
	complete: {
		type: Boolean,
		default: false
	},
	status: {
		type: String	
	},
	errorsReceived: [
		{
			type: mongoose.Schema.Types.Mixed,
			default: []
		}
	]
    
});

cancelAttemptSchema.methods.addError = function(err) {
	if (typeof(this.errorsReceived) === 'undefined') {
		this.errorsReceived = [];
	}
	
	this.errorsReceived.push(err);
	this.tryCount = typeof(this.tryCount) !== 'undefined' ? this.tryCount + 1 : 1;
	this.save();
}

cancelAttemptSchema.methods.archive = function(status) {
	if (status) {
		this.status = status;
	}
	
	this.complete = true;
	this.save();
}

cancelAttemptSchema.pre('save', function(next) {
    if (this.isNew) {
		this.initialCancelDate = new Date();
    }
	
    next();
});

module.exports = mongoose.model('CancelAttempt', cancelAttemptSchema);