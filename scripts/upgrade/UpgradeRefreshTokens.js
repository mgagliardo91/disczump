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
      var collection = db.collection('refreshtokens');
      collection.drop();
      console.log('All items have been processed.');
      db.close();
  }
});