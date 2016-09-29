var mongoose = require('mongoose');
var shortId = require('shortid');

var billingInquirySchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId: {
        type: String,
        required: true
    },
    inquiryDate: {
        type: Date,
        default: new Date()
    },
    profileId: {
        type: String
    },
	contactMade: {
		type: Boolean,
		default: false
	},
	contactDate: {
		type: Date	
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

billingInquirySchema.methods.addError = function(err) {
	if (typeof(this.errorsReceived) === 'undefined') {
		this.errorsReceived = [];
	}
	
	this.errorsReceived.push(err);
	this.tryCount = typeof(this.tryCount) !== 'undefined' ? this.tryCount + 1 : 1;
	this.save();
}

billingInquirySchema.methods.makeContact = function(err) {
	if (typeof(this.errorsReceived) === 'undefined') {
		this.errorsReceived = [];
	}
	
	this.errorsReceived.push(err);
	this.tryCount = typeof(this.tryCount) !== 'undefined' ? this.tryCount + 1 : 1;
	this.contactMade = true;
	this.contactDate = new Date();
	this.save();
}

billingInquirySchema.methods.archive = function(status) {
	if (status) {
		this.status = status;
	}
	
	this.complete = true;
	this.save();
}

module.exports = mongoose.model('BillingInquiry', billingInquirySchema);