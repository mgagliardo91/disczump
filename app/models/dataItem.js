// app/models/dataItem.js

var mongoose = require('mongoose');
var shortId = require('shortid');

var dataItem = mongoose.Schema({
    _id: {
	    type: String,
	    unique: true,
	    default: shortId.generate
	},
    data            : {type: String},
    label           : {type: String},
    userId          : {type: String},
    createDate      : {type: Date, default: Date.now}
    
});

module.exports = mongoose.model('DataItem', dataItem);