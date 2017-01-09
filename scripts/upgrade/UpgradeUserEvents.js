var mongoose= require('mongoose');
var async = require('async');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var configDB = require('../../config/config.js');
var UserInternal = require('../../app/models/userInternal.js');

var url = 'mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db;
mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);
// var url = 'mongodb://' + configDB.database.host + ':' + 
//     configDB.database.port + '/testdb';

MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
      
      var collection = db.collection('users');
      var arr = collection.find().snapshot();
      
      var q = async.queue(function(e, callback) {
          if (typeof(e.internal) === 'undefined' || typeof(e.internal.eventLog) === 'undefined') {
              console.log(e);
          }
          
            var events = e.internal.eventLog;
            var intUser = new UserInternal({
                userId: e._id
            });

            intUser.eventLog = [];

            events.forEach(function(event) {
                intUser.eventLog.push(event);
            });
          
          intUser.save(function(err) {
                if (!err) {
                    e.internal = undefined;
                    collection.save(e);
                    return callback();
                } else {
                    console.log('Error saving internal user for id: ' + e._id + '. ' + err);
                    return callback();
                }
            });
      }, Infinity);
      
      arr.forEach(function(e) {
          q.push(e);
      });
      
      q.drain = function() {
          if (arr.isClosed()) {
              console.log('All items have been processed.');
              db.close();
                mongoose.disconnect();
          }
      }
  }
});