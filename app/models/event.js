// app/models/event.js

var mongoose = require('mongoose');

var eventSchema = mongoose.Schema({

    userId          : {type: String},
    message           : {type: String},
    createDate      : {type: Date, default: Date.now}
    
});

module.exports = mongoose.model('Event', eventSchema);