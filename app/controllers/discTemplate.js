var DiscTemplate = require('../models/discTemplate');
var Error = require('../utils/error');

module.exports = {
    createTemplate: createTemplate,
    getTemplates: getTemplates,
    deleteTemplates: deleteTemplates
}

function getTemplates(callback) {
    DiscTemplate.find({}, function(err, templates) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback(null, templates);
            
    });
}

function createTemplate(data, callback) {
    var template = new DiscTemplate(data);
    
    template.save(function(err, template) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
            
        return callback(null, template);
    });
}

function deleteTemplates(callback) {
    DiscTemplate.remove({}, function(err) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
            
        return callback();
    });
}