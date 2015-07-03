var DataItem = require('../models/dataItem');
var Error = require('../utils/error');

module.exports = {
    createDataItem: createDataItem,
    createGeneric: createGeneric
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