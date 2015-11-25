var mongoose = require('mongoose');
var shortId = require('shortid');

var userArchiveSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
	userId: String,
    local: {
        username: {type: String, unique: true},
        firstName: String,
        lastName: String,
        email: {type: String, unique: true},
        dateJoined: {type: Date, default: Date.now},
        lastAccess: {type: Date, default: Date.now},
        pdgaNumber: String,
        location: {
            zipcode: String,
            lat: String,
            lng: String,
            city: String,
            state: String,
            stateAcr: String,
            country: String,
            countryCode: String,
        },
        accessCount: {
            desktop: {type: Number, default: 0},
            mobile: {type: Number, default: 0},
        }
    },
    internal: {
        eventLog: [mongoose.Schema.Types.Mixed]
    },
    archiveDate: {type: Date, default: Date.now}
});

module.exports = mongoose.model('UserArchive', userArchiveSchema);
