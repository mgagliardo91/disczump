var async = require('async');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var configDB = require('../../config/config.js');

var url = 'mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/bak';

MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
      var collection = db.collection('feedbacks');
      var arr = collection.find().snapshot();
      
      var q = async.queue(function(e, callback) {
          if (e.createDate) {
              var date = new Date(e.createDate);
              e.createDate = date;
          }
          
          collection.save(e);
          return callback();
      }, Infinity);
      
      arr.forEach(function(e) {
          q.push(e);
      });
      
      q.drain = function() {
          if (arr.isClosed()) {
              console.log('All items have been processed.');
              db.close();
          }
      }
  }
});