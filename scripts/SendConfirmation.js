var mongoose = require('mongoose');
var Confirm = require('../app/utils/confirm.js');
var Mailer = require('../app/utils/mailer.js');
var configDB = require('../config/config.js');
var async = require('async');

if (process.argv.length != 3) {
    console.log('Invalid arguments');
    process.exit();
}

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

mongoose.connection.on('connected', function() {
    Confirm.initializeConfirmAccount(process.argv[2], function(err, user, message) {
        if (err) {
            mongoose.disconnect();
            return console.log(err);
        }
        
        Mailer.sendMail(user.local.email, 'disc|zump Account Confirmation', message, function(err, result) {
           if (err) {
                mongoose.disconnect();
                return console.log(err);
            }
                
            console.log('Confirmation email sent to email [' + user.local.email + '] successfully.');
            mongoose.disconnect();
        });
    });
});