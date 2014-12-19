var nodemailer = require("nodemailer");
var logger = require('../../config/logger.js').logger;
var config = require('../../config/auth.js').gmailAuth;

var generator = require('xoauth2').createXOAuth2Generator({
    user: config.user,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken: config.refreshToken
});

var smtpTransport = nodemailer.createTransport(
    {
        service: "Gmail",
        auth: {
            xoauth2: generator
        }
    });
  
module.exports = {
    sendMail : function(paramTo, paramSubject, paramHtml, callback) {
        var mailOptions = {
            from: 'DiscZump <' + config.user + '>',
            to: paramTo,
            subject: paramSubject,
            generateTextFromHTML: true,
            html: paramHtml
        }
        
        smtpTransport.sendMail(mailOptions, function(error, response){
            if(error)
                return callback(error);
            
            callback(null);
        });
    }
}