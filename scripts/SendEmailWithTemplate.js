var mongoose = require('mongoose');
var UserController = require('../app/controllers/user.js');
var HandleConfig = require('../app/utils/handleConfig.js');
var Handlebars = require('handlebars');
var Mailer = require('../app/utils/mailer.js');
var configDB = require('../config/config.js');
var localConfig = require('../config/localConfig');
var fs = require('fs');

if (process.argv.length < 4 ) {
    console.log('Invalid arguments');
    process.exit();
}

var templateName = process.argv[3];
var subject = process.argv[4] || 'disc|zump Notification';

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

mongoose.connection.on('connected', function() {
    HandleConfig.registerHelpers(Handlebars);
    UserController.getUser(process.argv[2], function(err, user){
        if (err) {
            mongoose.disconnect();
            return console.log(err);
        }
        
        var html = fs.readFileSync('../private/html/' + templateName + '.handlebars', 'utf8');
        var template = Handlebars.compile(html);
        var message = template({user: user, serverURL: localConfig.serverURL});
        
        Mailer.sendMail(user.local.email, subject, message, function(err, result) {
           if (err) {
                mongoose.disconnect();
                return console.log(err);
            }
                
            console.log('Email sent to [' + user.local.email + '] successfully.');
            mongoose.disconnect();
        });
    });
});