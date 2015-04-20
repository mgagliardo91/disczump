// app/models/user.js

var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var userSchema = mongoose.Schema({

    local            : {
        email        : String,
        password     : String,
        date_joined  : {type: Date, default: Date.now()},
        active       : {type: Boolean, default: false},
        passcode     : String,
        image        : String
    },
    facebook         : {
        id           : String,
        token        : String,
        email        : String,
        name         : String,
    },
    preferences      : {
        colorize     : {
            'putter'    : {type: String, default: 'rgb(251, 131, 131)'},
            'mid'       : {type: String, default: 'rgb(251, 221, 131)'},
            'fairway'   : {type: String, default: 'rgb(139, 251, 131)'},
            'distance'  : {type: String, default: 'rgb(131, 219, 251)'},
            'mini'      : {type: String, default: 'rgb(165, 131, 251)'}
        }
    }

});

userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

module.exports = mongoose.model('User', userSchema);
