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
			geo: String,
            geoLat: String,
            geoLng: String,
            postalCode: String,
			city: String,
			administrationArea: String,
			administrationAreaShort: String,
			country: String,
			countryCode: String
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
