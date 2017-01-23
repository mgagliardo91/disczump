/*
* Description:
* This script will go through and update all users with facebook-linked accounts
* to have the correct facebook url.
*/

var DZ_HOME = process.env.DZ_HOME;
var async = require('async');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var configDB = require(DZ_HOME + '/config/config.js');

var url = 'mongodb://' + configDB.database.host + ':' +
  configDB.database.port + '/' + configDB.database.db;

// CONFIG
var TABLE_NAME = 'users';

MongoClient.connect(url, function(err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    var collection = db.collection(TABLE_NAME);
    var arr = collection.find().snapshot();

    var q = async.queue(function(obj, callback) {
      // EXECUTE COMMANDS HERE
      if (typeof(obj.facebook) !== 'undefined' && typeof(obj.facebook.id) !== 'undefined') {
        obj.facebook.image = '//graph.facebook.com/' + obj.facebook.id + '/picture?type=large';
	    }
      
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