var mongoose            = require('mongoose');
var User            = require('../app/models/user.js');
var configDB = require('../config/config.js');
var async = require('async');
var fs = require('fs');

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

var unsub = process.argv[2] && process.argv[2] === '-u';
var fileName = unsub ? '../docs/mailList_unsub.csv' : '../docs/mailList.csv';

User.find(function(err, users) {
    
    var emailList = [];
    
    async.each(users, function(user, callback) {
        if (!unsub && user.account.notifications.siteUpdates) {
            emailList.push(user._id + ',' + user.local.username + ',' + user.local.firstName + ',' + user.local.lastName + ',' + user.local.email);
        }
        
        if (unsub && !user.account.notifications.siteUpdates) {
            emailList.push(user.local.email);
        }
        
        return callback();
    }, function(err) {
       mongoose.disconnect();
        
        var file = emailList.join('\n');
        fs.writeFile(fileName, file, function(err) {
           if (err)
               console.log(err);
           console.log('Done');
        });
        
    });
    
});