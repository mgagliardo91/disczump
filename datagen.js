var mongoose            = require('mongoose');
var User            = require('./app/models/user');
var ClientModel             = require('./app/models/client');
var AccessTokenModel        = require('./app/models/accessToken');
var RefreshTokenModel       = require('./app/models/refreshToken');
var faker               = require('faker');
var configDB = require('./config/config.js');

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

User.remove({}, function(err) {
    /*var user = new User({ local : {email: "mgagliardo91@gmail.com"} });
    user.local.password = user.generateHash("password!");
    var i;
    user.save(function(err, user) {
        if(err) return console.log(err);
        else console.log("New user - %s:%s",user.local.email,user.local.password);
    });

    for(i=0; i<4; i++) {
        user = new User({ local: { email: faker.internet.email().toLowerCase() }});
        user.local.password = user.generateHash("simplepassword");
        user.save(function(err, user) {
            if(err) return console.log(err);
            else console.log("New user - %s:%s",user.local.email,user.local.password);
        });
    }*/
});

ClientModel.remove({}, function(err) {
    var client = new ClientModel({ name: "DiscZump Mobile", clientId: "DiscZumpMV1", clientSecret:"password!" });
    client.save(function(err, client) {
        if(err) return console.log(err);
        else console.log("New client - %s:%s",client.clientId,client.clientSecret);
    });
});
AccessTokenModel.remove({}, function (err) {
    if (err) return console.log(err);
});
RefreshTokenModel.remove({}, function (err) {
    if (err) return console.log(err);
});

setTimeout(function() {
    mongoose.disconnect();
}, 3000);