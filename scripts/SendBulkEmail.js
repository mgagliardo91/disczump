var mongoose = require('mongoose');
var User = require('../app/models/user.js');
var HandleConfig = require('../app/utils/handleConfig.js');
var Handlebars = require('handlebars');
var Mailer = require('../app/utils/mailer.js');
var configDB = require('../config/config.js');
var localConfig = require('../config/localConfig');
var fs = require('fs');
var async = require('async');

if (process.argv.length != 4) {
    console.log('Invalid arguments');
    process.exit();
}

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

mongoose.connection.on('connected', function() {
    HandleConfig.registerHelpers(Handlebars);
    var html = fs.readFileSync('./private/html/simpleTemplate.handlebars', 'utf8');
    var content = fs.readFileSync(process.argv[2], 'utf8');
    User.find({'local.active': true}, function(err, users) {
        if (err) {
            mongoose.disconnect();
            return console.log(err);
        }
        
        async.each(users, function(user, cb) {
            var template = Handlebars.compile(html);
            var contentHtml = Handlebars.compile(content);
            var contentMessage = contentHtml({serverURL: localConfig.serverURL});
            var message = template({user: user, htmlContent: contentMessage, serverURL: localConfig.serverURL});
            
            Mailer.sendMail(user.local.email, process.argv[3], message, function(err, result) {
               if (err) {
                    return cb(err);
                }
                    
                return cb();
            });
        }, function(err) {
            if (err) {
                console.log(err);
            }
            
            console.log('Email broadcasted to all users successfully.');
            mongoose.disconnect();
        });
    });
});