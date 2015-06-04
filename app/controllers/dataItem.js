var DataItem = require('../models/dataItem');
var Error = require('../utils/error');

module.exports = {
    createDataItem: createDataItem
}

function createDataItem(data, callback) {
    DataItem.findOne({data: data}, function(err, dataItem) {
        if (err)
                return callback(Error.createError(err, Error.internalError));
        
        if (dataItem)
            return callback(Error.createError('This email address has already been added.', 'Existing Entry'));
        
        var newItem = new DataItem();
        newItem.data = data;
        newItem.save(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, newItem);
        });
    })
}