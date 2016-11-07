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
      var collection = db.collection('discs');
      var arr = collection.find().snapshot();
      
      var q = async.queue(function(e, callback) {
          if (e.weight) {
              e.weight = parseInt(e.weight);
          }

          if (e.speed) {
              e.speed = parseInt(e.speed);
          }

          if (e.turn) {
              e.turn = parseInt(e.turn);
          }

          if (e.glide) {
              e.glide = parseInt(e.glide);
          }

          if (e.fade) {
              e.fade = parseInt(e.fade);
          }

          if (e.condition) {
              e.condition = parseInt(e.condition);
          }
          
          if (e.createDate) {
              var cDate = new Date(e.createDate);
              e.createDate = cDate;
              e.modifiedDate = cDate;
          }

          e.marketplace = {
              forSale: false,
              forTrade: false
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