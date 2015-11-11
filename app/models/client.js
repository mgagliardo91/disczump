var mongoose = require('mongoose');
var shortId = require('shortid');

var clientSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    name: {
        type: String,
        unique: true,
        required: true
    },
    clientId: {
        type: String,
        unique: true,
        required: true
    },
    clientSecret: {
        type: String,
        required: true
    }
    
});

module.exports = mongoose.model('Client', clientSchema);
