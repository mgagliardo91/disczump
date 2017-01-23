var DZ_HOME = process.env.DZ_HOME;
var mongoose = require('mongoose');
var UserController = require(DZ_HOME + '/app/controllers/user.js');
var HandleConfig = require(DZ_HOME + '/app/utils/handleConfig.js');
var Handlebars = require('handlebars');
var Mailer = require(DZ_HOME + '/app/utils/mailer.js');
var configDB = require(DZ_HOME + '/config/config.js');
var localConfig = require(DZ_HOME + '/config/localConfig');
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
        
        var promoCode = process.argv[5];
        var html = fs.readFileSync(DZ_HOME + '/private/html/' + templateName + '.handlebars', 'utf8');
        var template = Handlebars.compile(html);
        var message = template({user: user, serverURL: localConfig.serverURL, promoCode: promoCode});
        
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