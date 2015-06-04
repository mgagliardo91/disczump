var Event = require('../models/event');

module.exports = {
    types: {
        AccountCreation:    'AccountCreation',
        AccountDeletion:    'AccountDeletion',
        AccountUpdate:      'AccountUpdate',
        AccountLink:        'AccountLink',
        AccountUnlink:      'AccountUnlink'
    },
    
    createEvent: createEvent
}

function createEvent(userId, message) {
    var event = new Event();
    
    event.userId = userId;
    event.message = message;
    
    event.save();
}