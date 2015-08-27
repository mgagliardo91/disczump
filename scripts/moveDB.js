//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');
var mongoose = require('mongoose');
var shortId = require('shortid');
var configDB = require('../config/config.js');
var async = require('async');

//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

// Connection URL. This is where your mongodb server is running.
var url = 'mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db;

// Use connect method to connect to the Server
MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    //HURRAY!! We are connected. :)
    console.log('Connection established to', url);
    
    var users = db.collection('users');
    var discs = db.collection('discs');
    var images = db.collection('discimages');
    // Find some documents 
    
    users.find({}).toArray(function(err, userList) {
       if (err) console.log(err);
       else {
           async.each(userList, function(user, userCb) {
               var userId = user._id.toString();
                user._id = shortId.generate();
                users.insert(user, function(err, result) {
                    if (err) console.log(err);
                    else {
                        console.log(user._id);
                        discs.find({"userId":userId}).toArray(function(err, discList) {
                        async.each(discList, function(disc, cb) {
                            var oldDiscId = disc._id.toString();
                            var primaryImage = disc.primaryImage;
                            disc._id = shortId.generate();
                            
                            console.log('Converting disc [' + oldDiscId + '] to [' + disc._id + ']');
                            disc.userId = user._id;
                            discs.insert(disc, function(err, result) {
                                if (err) cb(err);
                                else {
                                    images.find({"discId":oldDiscId.toString()}).toArray(function(err, imageList) {
                                        console.log('Disc [' + oldDiscId + '] image list count: ' + imageList.length);
                                        async.each(imageList, function(image, imageCb) {
                                            var oldImageId = image._id.toString();
                                            image._id = shortId.generate();
                                            if (primaryImage == oldImageId.toString()) {
                                                primaryImage = image._id;
                                            }
                                            console.log('Converting image [' + oldImageId + '] to [' + image._id + ']');
                                            image.userId = user._id;
                                            image.discId = disc._id;
                                            images.insert(image, function(err, result) {
                                                if (err) imageCb(err);
                                                else {
                                                    var queryId = oldImageId;
                                                    
                                                    if (mongoose.Types.ObjectId.isValid(oldImageId)) {
                                                        queryId = mongoose.Types.ObjectId(oldImageId);
                                                    }
                                                    
                                                    images.remove({'_id':queryId}, function(err, results) {
                                                        if (err) imageCb(err);
                                                        else imageCb();
                                                    });
                                                }
                                            });
                                        }, function(err) {
                                            if (err) console.log(err);
                                            var queryId = oldDiscId;
                                            
                                            if (mongoose.Types.ObjectId.isValid(oldDiscId)) {
                                                queryId = mongoose.Types.ObjectId(oldDiscId);
                                            }
                                            
                                            discs.remove({'_id':queryId}, function(err, results) {
                                                if (err) cb(err);
                                                else {
                                                    if (typeof(primaryImage) !== 'undefined') {
                                                        discs.updateOne(
                                                          { "_id" : disc._id },
                                                          {$set: {primaryImage:primaryImage}},
                                                          function(err, results) {
                                                              if (err) cb(err);
                                                              else cb();
                                                       });
                                                    } else {
                                                        cb();
                                                    }
                                                    
                                                }
                                            });
                                        });
                                    });
                                }
                            });
                        }, function(err) {
                            if (err) console.log(err);
                            
                            var queryId = userId;
                                            
                            if (mongoose.Types.ObjectId.isValid(userId)) {
                                queryId = mongoose.Types.ObjectId(userId);
                            }
                            
                            users.remove({'_id':queryId}, function(err, results) {
                                if (err) userCb(err);
                                else userCb();
                            });
                        });
                    });
                        
                    }
                });
           }, function(err) {
              if (err) console.log(err);
              else {
                  console.log('done');
                  db.close();
              }
           });
       }
    });
    
    // do some work here with the database.

    //Close connection
    //db.close();
  }
});