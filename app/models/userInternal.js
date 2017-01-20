var mongoose = require('mongoose');
var shortId = require('shortid');

var userInternalSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId: {type: String, unique: true},
    eventLog: [mongoose.Schema.Types.Mixed]
});

userInternalSchema.pre('save', function(next) {
    if (this.isNew) {
		this.createDate = new Date();
    }
	
    next();
});

userInternalSchema.methods.addEvent = function(type, event) {
    if (typeof(event) !== 'undefined') {
        this.eventLog.push({
           type: type,
           message: event,
           dateCreated: new Date()
        });
        
        this.save();
    }
}

module.exports = mongoose.model('UserInternal', userInternalSchema);