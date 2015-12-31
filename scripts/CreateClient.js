var mongoose = require('mongoose');
var ClientController = require('../app/controllers/client.js');
var configDB = require('../config/config.js');

if (process.argv.length < 4) {
    console.log('Invalid arguments');
    process.exit();
}

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

mongoose.connection.on('connected', function() {
    var permissions = {
        createUser: false,
        deleteUser: false
    }
    
    if (process.argv.length >= 6) {
        if (process.argv[4] === '1') {
            permissions = {
                createUser: true,
                deleteUser: true
            }
        }
    }
    
    ClientController.createClient({
         'name': process.argv[2],
         'clientId': process.argv[3],
         'permissions': permissions
    }, function(err, client) {
        if (err) {
            console.log(err);
        } else {
            console.log(client)
        }
        mongoose.disconnect();
    });
});