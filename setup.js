var mongoose            = require('mongoose');
var ClientModel             = require('../app/models/client');
var AccessTokenModel        = require('../app/models/accessToken');
var RefreshTokenModel       = require('../app/models/refreshToken');
var configDB = require('../config/config.js');
var testConfig = require('./config.js');

console.log('Starting...');

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);
    
console.log('Connection created.');
var client = new ClientModel({ name: testConfig.Client.name, clientId: testConfig.Client.id, clientSecret: testConfig.Client.secret });
console.log(client);
client.save(function(err, client) {
    if(err) return console.log(err);
    else console.log("New client - %s:%s", client.clientId, client.clientSecret);
    
    mongoose.disconnect();
    console.log('Done');
});
AccessTokenModel.remove({}, function (err) {
    if (err) return console.log(err);
});
RefreshTokenModel.remove({}, function (err) {
    if (err) return console.log(err);
});