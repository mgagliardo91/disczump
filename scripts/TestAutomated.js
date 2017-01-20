var mongoose = require('mongoose');
var configDB = require('../config/config.js');
var Grid = require('gridfs-stream');
var winston = require('winston');
var path = require('path');

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)({
            json: false,
            datePattern: '.yyyy-MM-dd-HH-mm',
            filename: path.join(__dirname, "../logs", "TestAutomatedOuput.log") 
      })
    ]
});

var Membership = require('./automated/membership.js')(logger);

Grid.mongo = mongoose.mongo;

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

mongoose.connection.on('connected', function() {
   var gfs = Grid(mongoose.connection.db);
    
    Membership.DoInquiry(function() {
        mongoose.disconnect();
    });
});