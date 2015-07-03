var mongoose = require('mongoose');
var DataItem = require('../app/models/dataItem.js');
var configDB = require('../config/config.js');
var Handlebars = require('handlebars');
var fs = require('fs');
var localConfig = require('../config/localConfig');
var Mailer = require('../app/utils/mailer.js');

var conn = mongoose.createConnection('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);
    
conn.once('open', function() {
   
   DataItem.find({label: 'BetaEmail'}, function(err, dataItems) {
   	  if (err) {
   	      console.log(err);
   	      return;
   	  }
   	  async.each(dataItems, function(email, callback) {
        var message = generateConfirmationEmail(email.data);
        Mailer.sendMail(email.data, 'DiscZump is Online!', message, function(err, result) {
           if (err) console.log(err);
           callback();
        });
     ,function(err) {
        mongoose.disconnect();
     });
  });
});

function generateConfirmationEmail(email, confirm) {
    var html = fs.readFileSync('./private/html/notifyOnline.handlebars', 'utf8');
    var template = Handlebars.compile(html);
    return template({email: email, serverURL: localConfig.serverURL});
}