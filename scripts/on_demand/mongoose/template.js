/*
* Description:
* This script will...
*/

var DZ_HOME = process.env.DZ_HOME;
var mongoose = require('mongoose');
var configDB = require(DZ_HOME + '/config/config.js');
var async = require('async');

// Load mongoose models/controllers here
var MODEL_NAME = '[ENTER MODEL NAME HERE]';
var Model = require(DZ_HOME + '/app/models/' + MODEL_NAME + '.js');

mongoose.connect('mongodb://' + configDB.database.host + ':' +
  configDB.database.port + '/' + configDB.database.db);

Model.find(function(err, objList) {

  async.each(objList, function(obj, callback) {
    // EXECUTE CODE HERE ON OBJ

    // Use to save object
    obj.save(function(err) {
      if (err)
        console.log(err);
      callback();
    });
  }, function(err) {
    mongoose.disconnect();
  });

});