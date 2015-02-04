// app/models/user.js

var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var userSchema = mongoose.Schema({

    local            : {
        email        : String,
        password     : String,
        date_joined  : {type: Date, default: Date.now()},
        active       : {type: Boolean, default: false}
    },
    facebook         : {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    },
    preferences      : {
        colorize     : {
            'putter'    : '',
            'mid'       : '',
            'fairway'   : '',
            'distance'  : '',
            'mini'      : ''
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
