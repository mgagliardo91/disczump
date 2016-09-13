var Event = require('../models/event');
var _ = require('underscore');

module.exports = {
    Types: {
        AccountCreation: 'AccountCreation',
        AccountDeletion:'AccountDeletion',
        AccountUpdate: 'AccountUpdate',
        AccountLink: 'AccountLink',
        AccountUnlink : 'AccountUnlink',
        AccountPasswordReset : 'AccountPasswordReset',
        AccountDeleteInit : 'AccountDeleteInit',
        AccountDeleteConfirm : 'AccountDeleteConfirm',
        AccountPasswordInit: 'AccountPasswordInit',
        AccountPDGAClaim: 'AccountPDGAClaim',
        AccountPDGAReset: 'AccountPDGAReset'
    },
    
    addEvent: addEvent,
    getAllEvents: getAllEvents
}

function addEvent(userId, type, message) {
    var event = new Event({
        userId: userId,
        type: type,
        message: message
    });
    
    event.save();
}

function getAllEvents(params, callback) {
    var filters = [];
    
    if (!params.sort.length) {
        params.sort.push(['createDate', -1])
    }
    
    _.each(_.keys(params.filter), function(key) {
        var filter = {};
        filter[key] = new RegExp(params.filter[key], 'i');
        filters.push(filter);
    });
    
    Event.count(filters.length ? {$and: filters} : {}, function(err, count) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
            
        if (params.size > count) {
            params.size = count;
        }
        
        if (params.size * (params.page - 1) > count) {
            params.page = Math.floor(count / params.size) + 1;
        }
        
        Event
        .find(filters.length ? {$and: filters} : {})
        .sort(params.sort)
        .skip(params.size * (params.page - 1))
        .limit(params.size)
        .exec(function(err, events) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
                
            return callback(null, {
                events: events,
                total: count,
                page: params.page,
                size: params.size
            });
        });
    });
}