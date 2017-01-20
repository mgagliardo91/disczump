var nodemailer = require("nodemailer");
var config = require('../../config/auth.js').gmailAuth;
var admins = require('../../config/config.js').admins;
var Error = require('./error');
var logger = require('./logger.js');

var generator = require('xoauth2').createXOAuth2Generator({
    user: config.user,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken: config.refreshToken
});

var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        xoauth2: generator
    }
});
  
module.exports = {
    TypeFeedbackAlert: 'disc|zump Feedback Alert',
    TypeFeedbackResponse: 'disc|zump Feedback Response',
    TypeMessageAlert: 'disc|zump Message Alert',
    TypeAccountDeletion: 'disc|zump Account Deletion',
    TypePasswordRecovery: 'disc|zump Password Recovery',
    TypeAccountConfirmation: 'disc|zump Account Confirmation',
    TypeAccountChange: 'disc|zump Account Change Alert',
    TypePaymentFailed: 'disc|zump Payment Failed Alert',
    TypeInquiryFailed: 'disc|zump Payment Inquiry Failure',
    TypeAttemptFailed: 'disc|zump Cancel Attempt Failure',
    
    sendMail: sendMail,
    sendAdmin: sendAdmin
}

function sendAdmin(paramSubject, paramHtml, callback) {
    return sendMail(admins.toString(), paramSubject, paramHtml, callback)
}

function sendMail(paramTo, paramSubject, paramHtml, callback) {
    var mailOptions = {
        from: 'disc|zump Staff <' + config.user + '>',
        to: paramTo,
        subject: paramSubject,
        generateTextFromHTML: true,
        html: paramHtml
    }

    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error) {
            logger.error('Unable to send email', error);
            if (callback) callback(Error.createError(error, Error.internalError));
            return;
        }

        logger.info('Email sent successfullly.');
        if (callback) callback();
    });
}