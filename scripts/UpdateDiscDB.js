var configDB = require('../config/config.js');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var async = require('async');
var url = 'mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db;

MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
      var collection = db.collection('discs');
      var arr = collection.find().snapshot();
      arr.forEach(function(e) {
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
          
              e.modifiedDate = new Date().toISOString();
              
              if (typeof(e.marketplace) !== 'undefined') {
                  delete e.marketplace.value;
                  e.marketplace.modifiedDate = new Date().toISOString();
              } else {
                  e.marketplace = {
                      forSale: false,
                      forTrade: false,
                      modifiedDate: new Date().toISOString()
                  }
              }
              
              collection.save(e);
          console.log('done');
      });
  }
});