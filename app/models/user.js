var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');
var crypto = require('crypto');
var UserConfig = require('../../config/config.js').user.preferences;
var CryptoConfig = require('../../config/auth.js').crypto;
var shortId = require('shortid');

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
        dateJoined: {type: Date, default: Date.now},
        lastAccess: {type: Date, default: Date.now},
        active: {type: Boolean, default: false},
        passcode: String,
        image: String,
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
    facebook: {
        id: String,
        token: String,
        email: String,
        name: String,
        image: String,
    },
    preferences: {
        colorize: {
            putter: {type: String, default: UserConfig.colorize.putter},
            mid: {type: String, default: UserConfig.colorize.mid},
            fairway: {type: String, default: UserConfig.colorize.fairway},
            distance: {type: String, default: UserConfig.colorize.distance},
            mini: {type: String, default: UserConfig.colorize.mini}
        },
        colorizeVisibility: {type: Boolean, default: UserConfig.colorizeVisibility},
        displayCount: {type: String, default: UserConfig.displayCount},
        defaultSort: {type: mongoose.Schema.Types.Mixed, 
            default: UserConfig.defaultSort
        },
        defaultView: {type: String, default: UserConfig.defaultView},
        galleryCount: {type: String, default: UserConfig.galleryCount},
        showTemplatePicker: {type: Boolean, default: UserConfig.showTemplatePicker},
        notifications: {
            newMessage: {type: Boolean, default: UserConfig.notifications.newMessage}
        }
    },
    internal: {
        eventLog: [mongoose.Schema.Types.Mixed]
    }
});

userSchema.methods.pref = function(preference) {
    return this.preferences[preference];
}

userSchema.methods.totalAccessCount = function() {
    return this.local.accessCount.desktop + this.local.accessCount.mobile;
}

userSchema.methods.addEvent = function(type, event) {
    if (typeof(event) !== 'undefined') {
        this.internal.eventLog.push({
           type: type,
           message: event,
           dateCreated: Date.now()
        });
        
        this.save();
    }
}

userSchema.methods.updateAccessCount = function(platform) {
    this.local.accessCount[platform] += 1;
    this.local.lastAccess = Date.now();
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
	
	if (typeof(this.local.location.zipcode) !== 'undefined') {
		account.zipcode = this.local.location.zipcode;
		account.location = (this.local.location.city ? this.local.location.city + ', ' : '') + 
    		this.local.location.stateAcr + ' ' + this.local.location.zipcode + ', ' + 
    		this.local.location.countryCode;
    	account.shortLocation = (this.local.location.city ? this.local.location.city + ', ' : '') +
    	    this.local.location.stateAcr;
	}
	
	if (typeof(this.local.pdgaNumber) !== 'undefined') {
		account.pdgaNumber = this.local.pdgaNumber;
	}
	
	if (typeof(this.local.accessCount) !== 'undefined') {
		account.firstUse = this.local.accessCount.desktop <= 1;
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
