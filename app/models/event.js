var mongoose = require('mongoose');
var shortId = require('shortid');

var eventSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId: {type: String},
    type: {type: String},
    message: {type: String},
    createDate: {type: Date, default: Date.now}
    
});

module.exports = mongoose.model('Event', eventSchema);