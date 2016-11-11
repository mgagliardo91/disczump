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
      
      var collection = db.collection('users');
      var arr = collection.find().snapshot();
      
      var q = async.queue(function(e, callback) {
          var startDate;
          if (e.local.dateJoined) {
              startDate = new Date(e.local.dateJoined);
              e.local.dateJoined = startDate;
          }
          
          if (e.local.lastAccess) {
              var cDate = new Date(e.local.lastAccess);
              e.local.lastAccess = cDate;
          }
          
          if (e.archiveDate) {
              var archDate = new Date(e.archiveDate);
              e.archiveDate = archDate;
          }
          
          if (e.local.location) {
              var location = e.local.location;
              e.local.location = {
                    geo: location.lat + ',' + location.lng,
                    geoLat: location.lat,
                    geoLng: location.lng,
                    postalCode: location.zipcode,
                    city: location.city,
                    administrationArea: location.state,
                    administrationAreaShort: location.stateAcr,
                    country: location.country,
                    countryCode: location.countryCode
              };
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