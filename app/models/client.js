var mongoose = require('mongoose');
var shortId = require('shortid');
var bcrypt   = require('bcrypt-nodejs')

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
    },
    createDate: {
		type: Date, 
		default: Date.now
	},
    permissions: {
        createUsers: {type: Boolean, default: false},
        deleteUsers: {type: Boolean, default: false}
    }
    
});

clientSchema.methods.generateHash = function(secret) {
    return bcrypt.hashSync(secret, bcrypt.genSaltSync(8), null);
};

module.exports = mongoose.model('Client', clientSchema);
