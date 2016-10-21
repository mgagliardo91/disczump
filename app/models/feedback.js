var mongoose = require('mongoose');
var shortId = require('shortid');

var feedback = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    feedback: {type: String},
    userId: {type: String},
    createDate: {type: Date}
    
});

feedback.pre('save', function(next) {
    if (this.isNew) {
		this.createDate = new Date();
    }
	
    next();
});

module.exports = mongoose.model('Feedback', feedback);