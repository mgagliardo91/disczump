var mongoose = require('mongoose');
var shortId = require('shortid');

var admin = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    userId: String,
    createDate: Date,
    permissions: {
        accessAdmin: {type: Boolean, default: true},
        viewAccount: {type: Boolean, default: true},
        updateAccount: {type: Boolean, default: false},
        deleteAccount: {type: Boolean, default: false},
        mockAccount: {type: Boolean, default: false}
    }
	
    
});

admin.pre('save', function(next) {
    if (this.isNew) {
		this.createDate = new Date();
    }
	
    next();
});

module.exports = mongoose.model('Admin', admin);