/*
* Description:
* This script will...
*/

var DZ_HOME = process.env.DZ_HOME;
var async = require('async');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var configDB = require(DZ_HOME + '/config/config.js');

var url = 'mongodb://' + configDB.database.host + ':' +
  configDB.database.port + '/' + configDB.database.db;

// CONFIG
var TABLE_NAME = '[ENTER TABLE NAME]';

MongoClient.connect(url, function(err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    var collection = db.collection(TABLE_NAME);
    var arr = collection.find().snapshot();

    var q = async.queue(function(obj, callback) {
      // EXECUTE COMMANDS HERE

      // Used to save obj if needed
      collection.save(obj);
      return callback();
    }, Infinity);

    // Setup promises
    arr.forEach(function(obj) {
      q.push(obj);
    });

    // Post callback event
    q.drain = function() {
      if (arr.isClosed()) {
        console.log('All items have been processed.');
        db.close();
      }
    }
  }
});