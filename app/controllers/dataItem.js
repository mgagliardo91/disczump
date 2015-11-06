var DataItem = require('../models/dataItem');
var Error = require('../utils/error');
var LocalConfig = require('../../config/localConfig.js');
var Config = require('../../config/config.js');
var Mailer = require('../utils/mailer.js');
var handleConfig = require('../utils/handleConfig.js');
var fs = require('fs');

module.exports = {
    createDataItem: createDataItem,
    createGeneric: createGeneric,
    createFeedback: createFeedback
}

function createDataItem(data, label, callback) {
    DataItem.findOne({data: data}, function(err, dataItem) {
        if (err)
                return callback(Error.createError(err, Error.internalError));
        
        if (dataItem)
            return callback(Error.createError('This email address has already been added.', 'Existing Entry'));
        
        var newItem = new DataItem();
        newItem.data = data;
        newItem.label = label;
        newItem.save(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, newItem);
        });
    })
}

function createGeneric(userId, data, label, callback) {
	DataItem.findOne({userId: userId, data: data, label: label}, function(err, dataItem) {
        if (err)
                return callback(Error.createError(err, Error.internalError));
        
        if (dataItem)
            return callback(Error.createError('Entry already exsists.', 'Existing Entry'));
        
        var newItem = new DataItem();
        newItem.userId = userId;
        newItem.data = data;
        newItem.label = label;
        newItem.save(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, newItem);
        });
    })
}

function createFeedback(user, data, callback) {
    var newItem = new DataItem({
        userId: user._id,
        data: data,
        label: 'Feedback'
    });
    
    newItem.save(function(err) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
            
        var alert = generateEmailNotification(user, newItem);
        Mailer.sendMail(Config.admins.toString(), 'disc|zump Feedback Alert', alert);
        
        return callback(null, newItem);
    });
}

function generateEmailNotification(user, feedback) {
    var html = fs.readFileSync('./private/html/feedbackAlert.handlebars', 'utf8');
    var template = handleConfig.getMainHandle().compile(html);
    return template({user: user, feedback : feedback, serverURL: LocalConfig.serverURL});
}