// app/models/dataItem.js

var mongoose = require('mongoose');

var dataItem = mongoose.Schema({

    data            : {type: String},
    label           : {type: String},
    userId          : {type: String},
    createDate      : {type: Date, default: Date.now()}
    
});

module.exports = mongoose.model('DataItem', dataItem);