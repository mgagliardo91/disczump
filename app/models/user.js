var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');
var crypto = require('crypto');
var CryptoConfig = require('../../config/auth.js').crypto;
var shortId = require('shortid');
var Geo = require('../utils/geo.js');
var membershipConfig = require('../../config/config').membership;

var userSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    local: {
        username: {type: String, unique: true},
        firstName: String,
        lastName: String,
        email: {type: String, unique: true},
        password: String,
        dateJoined: {type: Date},
        lastAccess: {type: Date},
        active: {type: Boolean, default: false},
        passcode: String,
        image: String,
        pdgaNumber: String,
		bio: String,
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
    facebook: {
        id: String,
        token: String,
        email: String,
        name: String,
        image: String,
    },
	account: {
		type: {type: String, default: membershipConfig.TypeBasic},
		marketCap: {type: Number, default: membershipConfig.CapBasic},
		profile: {
			type: {type: String, default: membershipConfig.TypeBasic},
			lastModified: {type: Date},
			startDate: {type: Date},
			nextBillDate: {type: Date},
			payPeriod: {type: String},
			tender: {type: String},
			origPNRef: {type: String},
			origBAId: {type: String},
			draftAmount: {type: Number, default: 0},
			profileId: {type: String},
			acct: {type: String},
			expDate: {type: String},
			pendingReset: {type: Boolean, default: false},
			active: {type: Boolean, default: false}
		},
        notifications: {
            newMessage: {type: Boolean, default: true },
			siteUpdates: {type: Boolean, default: true }
        },
		verifications: {
			facebook: {type: Boolean, default: false},
			pdga: {type: Boolean, default: false}
		}
	},
    internal: {
        eventLog: [mongoose.Schema.Types.Mixed]
    }
});

userSchema.pre('save', function(next) {
    if (this.isNew) {
		this.local.dateJoined = new Date();
		this.local.lastAccess = new Date();
    }
	
    next();
});

userSchema.methods.pref = function(preference) {
    return this.preferences[preference];
}

userSchema.methods.totalAccessCount = function() {
    return this.local.accessCount.desktop + this.local.accessCount.mobile;
}

userSchema.methods.setPending = function() {
    this.account.profile.pendingReset = true;
	this.save();
}

userSchema.methods.addEvent = function(type, event) {
    if (typeof(event) !== 'undefined') {
        this.internal.eventLog.push({
           type: type,
           message: event,
           dateCreated: new Date()
        });
        
        this.save();
    }
}

userSchema.methods.updateAccessCount = function(platform) {
    this.local.accessCount[platform] += 1;
    this.local.lastAccess = new Date();
    this.save();
}

userSchema.methods.accountToString = function() {
    var account = {};
    
    account._id = this._id;
    account.dateJoined = this.local.dateJoined;
    account.username = this.local.username;
    account.linked = typeof(this.facebook.id) !== 'undefined';
    account.lastAccess = this.local.lastAccess;
    
    if (account.linked) {
        account.facebookImage = this.facebook.image;
    }
	
	if (typeof(this.local.bio) !== 'undefined') {
    	account.bio = this.local.bio;
	}
	
	if (typeof(this.local.firstName) !== 'undefined') {
    	account.firstName = this.local.firstName;
	}
	
	if (typeof(this.local.lastName) !== 'undefined') {
    	account.lastName = this.local.lastName;
	}
	
	if (typeof(this.local.image) !== 'undefined') {
		account.image = '/files/' + this.local.image;
	} else if (typeof(this.facebook.image !== 'undefined')) {
	    account.image = this.facebook.image;
	}
	
	if (typeof(this.local.location.postalCode) !== 'undefined') {
		account.postalCode = this.local.location.postalCode;
		var location = Geo.getFormattedLoc(this.local.location);
		account.shortLocation = location.shortLocation;
		account.longLocation = location.longLocation;
		account.geoLat = this.local.location.geoLat;
		account.geoLng = this.local.location.geoLng;
	}
	
	if (typeof(this.local.pdgaNumber) !== 'undefined') {
		account.pdgaNumber = this.local.pdgaNumber;
	}
	
	if (typeof(this.local.accessCount) !== 'undefined') {
		account.firstUse = this.local.accessCount.desktop <= 1;
	}
	
	if (this.account.verifications.facebook === true) {
		account.fbId = this.facebook.id;
	}
	
	account.verifications = this.account.verifications;
	
	return account;
}

userSchema.methods.fullAccountToString = function() {
	var account = this.accountToString();
	
	account.email = this.local.email;
	account.accountType = this.account.type;
	account.marketCap = this.account.marketCap;
	
	if (this.account.profile.active) { 
		account.profile = {
			tender: this.account.profile.tender,
			draftAmount: this.account.profile.draftAmount,
			nextBillDate: this.account.profile.nextBillDate,
			type: this.account.profile.type ? this.account.profile.type : this.account.type,
			exists: typeof(this.account.profile.profileId) !== 'undefined'
		}
	} else {
		account.profile = {
			tender: this.account.profile.tender,
			draftAmount: this.account.profile.draftAmount,
			type: this.account.profile.type ? this.account.profile.type : this.account.type,
			nextBillDate: this.account.profile.type != this.account.type ? this.account.profile.nextBillDate : undefined,
			exists: typeof(this.account.profile.profileId) !== 'undefined'
		}
	}
	
	if (this.account.profile.tender === 'C') {
		account.profile.acct = this.account.profile.acct;
		account.profile.expDate = this.account.profile.expDate;
	}
	
	return account;
}

userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

userSchema.methods.hashId = function() {
    var cipher = crypto.createCipher(CryptoConfig.algorithm, CryptoConfig.password);
    var crypted = cipher.update(this._id,'utf8','hex');
    crypted += cipher.final('hex');
    return crypted;
}

module.exports = mongoose.model('User', userSchema);
