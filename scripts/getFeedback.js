var mongoose = require('mongoose');
var DataItem = require('../app/models/dataItem.js');
var configDB = require('../config/config.js');
var fs = require('fs');
var _ = require('underscore');
var localConfig = require('../config/localConfig');
var Mailer = require('../app/utils/mailer.js');

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);
    
DataItem.find({'label': 'Feedback'}, function(err, dataItems) {
   	  if (err) {
   	      console.log(err);
   	      return;
   	  }
   	  
   	  var file = "Feedback:\r\n\r\n";
   	  _.each(dataItems, function(comment) {
   	  	   file += "Date: " + comment.createDate + "\r\n";
   	  	   file += "User: " + comment.userId + "\r\n";
   	  	   file += "Comment: " + comment.data + "\r\n\r\n";
   	  	});
   	  
     fs.writeFile("/admin/feedback.txt", file, function(err) {
        if(err) {
           console.log(err);
        } else {
        	   console.log("The file was saved!");
        }
     }); 
   	  
   	  Mailer.sendMail("mike@disczump.com", 'disc|zump Data', file, function(err, result) {
           if (err) console.log(err);
           mongoose.disconnect();
        });
  });