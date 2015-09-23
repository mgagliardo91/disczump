// app/models/user.js

var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');
var UserConfig = require('../../config/config.js').user.preferences;
var shortId = require('shortid');

var userSchema = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    local            : {
        username     : {type: String, unique: true},
        firstName    : String,
        lastName     : String,
        email        : {type: String, unique: true},
        password     : String,
        dateJoined  : {type: Date, default: Date.now},
        lastAccess  : {type: Date, default: Date.now},
        active       : {type: Boolean, default: false},
        passcode     : String,
        image        : String,
        alias        : String,
        zipCode      : String,
        pdgaNumber   : String,
        accessCount     : {
            desktop : {type: Number, default: 0},
            mobile : {type: Number, default: 0},
        }
    },
    facebook         : {
        id           : String,
        token        : String,
        email        : String,
        name         : String,
    },
    preferences      : {
        colorize     : {
            putter      : {type: String, default: UserConfig.colorize.putter},
            mid         : {type: String, default: UserConfig.colorize.mid},
            fairway     : {type: String, default: UserConfig.colorize.fairway},
            distance    : {type: String, default: UserConfig.colorize.distance},
            mini        : {type: String, default: UserConfig.colorize.mini}
        },
        colorizeVisibility : {type: Boolean, default: UserConfig.colorizeVisibility},
        displayCount : {type: String, default: UserConfig.displayCount},
        defaultSort  : {type: mongoose.Schema.Types.Mixed, 
            default: UserConfig.defaultSort
        },
        defaultView  : {type: String, default: UserConfig.defaultView},
        galleryCount : {type: String, default: UserConfig.galleryCount}
    },
    internal         : {
        eventLog     : [mongoose.Schema.Types.Mixed]
    }
});

userSchema.methods.totalAccessCount = function() {
    return this.local.accessCount.desktop + this.local.accessCount.mobile;
}

userSchema.methods.addEvent = function(event) {
    
    if (typeof(event) !== 'undefined') {
        this.internal.eventLog.push({
           event: event,
           occured: Date.now()
        });
        
        this.save();
    }
    
}

userSchema.methods.accountToString = function() {
    var account = {};
    
    account._id = this._id;
    account.dateJoined = this.local.dateJoined;
    account.username = this.local.username;
	
	if (typeof(this.local.firstName) !== 'undefined') {
    account.firstName = this.local.firstName;
	}
	
	if (typeof(this.local.lastName) !== 'undefined') {
    account.lastName = this.local.lastName;
	}
	
	if (typeof(this.local.image) !== 'undefined') {
		account.image = this.local.image;
	}
	
	if (typeof(this.local.zipCode) !== 'undefined') {
		account.zipCode = this.local.zipCode;
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

module.exports = mongoose.model('User', userSchema);
