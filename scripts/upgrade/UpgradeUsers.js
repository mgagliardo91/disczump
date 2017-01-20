var async = require('async');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var configDB = require('../../config/config.js');

var url = 'mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db;
// var url = 'mongodb://' + configDB.database.host + ':' + 
//     configDB.database.port + '/testdb';

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
          
          if (e.local.location) {
              var location = e.local.location;
              var newLocation = {
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
              e.local.location = newLocation;
          }
          
          var prefs = e.preferences;
          var newMessage = false;
          if (prefs && prefs.notifications) {
              newMessage = prefs.notifications.newMessage;
          }
          delete e.preferences;
          delete e.local.pdgaNumber;
          
          e.account = {
              type: 'Basic',
              marketCap: 2,
              profile: {
                    type: 'Basic',
                    lastModified: new Date(),
                    startDate: new Date(e.local.dateJoined),
                    draftAmount: 0,
                    pendingReset: false,
                    active: false
                },
                notifications: {
                    newMessage: newMessage,
                    siteUpdates: true
                },
                verifications: {
                    facebook: false,
                    pdga: false
                }
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