var DiscTemplate = require('../models/discTemplate');
var Error = require('../utils/error');

module.exports = {
    createTemplate: createTemplate,
    getTemplates: getTemplates,
    getTemplateById: getTemplateById,
    queryTemplates: queryTemplates,
    deleteTemplates: deleteTemplates
}

function getTemplates(callback) {
    DiscTemplate.find({}, function(err, templates) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback(null, templates);
            
    });
}

function getTemplateById(templateId, callback) {
    DiscTemplate.findOne({_id: templateId}, function(err, template) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback(null, template);
    });
}

function queryTemplates(query, callback) {
    if (typeof(query) === 'undefined') {
        return callback(null, []);
    }
    
    DiscTemplate.find({textSearch: new RegExp(query, 'i')}, function(err, templates) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback(null, templates);
    });
}

function createTemplate(data, callback) {
    var template = new DiscTemplate(data);
    template.textSearch = data.brand + ' ' + data.name;
    
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