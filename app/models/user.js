// app/models/user.js

var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');
var UserConfig = require('../../config/config.js').user.preferences;

var userSchema = mongoose.Schema({

    local            : {
        email        : String,
        password     : String,
        date_joined  : {type: Date, default: Date.now()},
        last_access  : {type: Date, default: Date.now()},
        active       : {type: Boolean, default: false},
        passcode     : String,
        image        : String,
        alias        : String,
        zipCode      : String,
        pdgaNumber   : String
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
	
	if (typeof(this.local.alias) !== 'undefined') {
		account.alias = this.local.alias;
	    
	}
	
	if (typeof(this.local.zipCode) !== 'undefined') {
		account.zipCode = this.local.zipCode;
	    
	}
	
	if (typeof(this.local.pdgaNumber) !== 'undefined') {
		account.pdgaNumber = this.local.pdgaNumber;
	    
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
