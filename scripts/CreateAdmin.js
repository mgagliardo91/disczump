var mongoose = require('mongoose');
var UserController = require('../app/controllers/user.js');
var AdminController = require('../app/controllers/admin.js');
var configDB = require('../config/config.js');
var async = require('async');

if (process.argv.length != 3) {
    console.log('Invalid arguments');
    process.exit();
}

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

mongoose.connection.on('connected', function() {
    
    AdminController.createAdmin(process.argv[2], function(err, admin) {
        if (err) {
            console.log(err);
        } else {
            console.log(JSON.stringify(admin, null, '\t'));
        }
        
        return mongoose.disconnect();
    });
    
});