var mongoose = require('mongoose');
var UserController = require('../app/controllers/user.js');
var DevController = require('../app/controllers/development.js');
var Grid = require('gridfs-stream');
var configDB = require('../config/config.js');
var fs = require('fs');
var path = require('path');
var async = require('async');
var faker = require('faker');
var _ = require('underscore');
var output = 'Results:\n\n';
var users = [];

Grid.mongo = mongoose.mongo;

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

mongoose.connection.on('connected', function() {
   var gfs = Grid(mongoose.connection.db);
   
   for (var i = 0; i < 30; i++) {
        users.push({
            email: faker.internet.email(),
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            username: faker.internet.userName(),
            password: faker.internet.password(),
            zipCode: faker.address.zipCode().substr(0, 5)
        });
    }
    
    async.each(users, function(userInfo, callback) {
        UserController.createUser(userInfo, function(err, user) {
            if (err)
                return console.log(err);
            
            console.log('Successfully created user: ' + user.local.email);
            output += JSON.stringify(user.local) + '\n';
            
            DevController.createDiscData(gfs, user._id, function(err) {
                if (err) {
                    return callback(err);
                }
                    
                console.log('Successfully created disc content for user: ' + user._id);
                callback();
            })
        });
    }, function(err) {
        console.log(err);
        fs.writeFile(path.join(__dirname, "./", "data.txt"), output, function(err) {
            mongoose.disconnect();
        });
    });
   
});