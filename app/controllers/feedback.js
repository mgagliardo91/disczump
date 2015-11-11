var Feedback = require('../models/feedback');
var Error = require('../utils/error');
var LocalConfig = require('../../config/localConfig.js');
var Config = require('../../config/config.js');
var Mailer = require('../utils/mailer.js');
var handleConfig = require('../utils/handleConfig.js');
var fs = require('fs');
var _ = require('underscore');

module.exports = {
    createFeedback: createFeedback,
    getAllFeedback: getAllFeedback
}

function createFeedback(user, data, callback) {
    var newItem = new Feedback({
        userId: user._id,
        feedback: data,
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

function getAllFeedback(params, callback) {
    var filters = [];
    
    if (!params.sort.length) {
        params.sort.push(['createDate', -1])
    }
    
    _.each(_.keys(params.filter), function(key) {
        var filter = {};
        filter[key] = new RegExp(params.filter[key], 'i');
        filters.push(filter);
    });
    
    Feedback.count(filters.length ? {$and: filters} : {}, function(err, count) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
            
        if (params.size > count) {
            params.size = count;
        }
        
        if (params.size * (params.page - 1) > count) {
            params.page = Math.floor(count / params.size) + 1;
        }
        
        Feedback
        .find(filters.length ? {$and: filters} : {})
        .sort(params.sort)
        .skip(params.size * (params.page - 1))
        .limit(params.size)
        .exec(function(err, feedback) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
                
            return callback(null, {
                feedback: feedback,
                total: count,
                page: params.page,
                size: params.size
            });
        });
    });
}