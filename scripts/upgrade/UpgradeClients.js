var async = require('async');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var configDB = require('../../config/config.js');

var url = 'mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db;

MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
      var collection = db.collection('clients');
      collection.drop();
      collection.insert({
        "_id" : "H1DUdRlF",
        "clientSecret" : "$2a$08$sQFudHDBzv/73DneBmETbueGq9ulpG3lPIK.68mRIUQT/xjdUHkWW",
        "name" : "disc|zump web",
        "clientId" : "dzWeb",
        "permissions" : {
                "deleteUsers" : true,
                "createUsers" : true
        },
        "__v" : 0
      });
      console.log('All items have been processed.');
      db.close();
  }
});