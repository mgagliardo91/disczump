var DiscTemplate = require('../models/discTemplate');
var Error = require('../utils/error');

module.exports = {
    createMold: createMold,
    createMaterial: createMaterial,
    getTemplates: getTemplates,
    getTemplateById: getTemplateById,
    getMaterials: getMaterials,
    queryTemplates: queryTemplates,
    deleteMolds: deleteMolds,
    deleteMaterials: deleteMaterials
}

function getTemplates(callback) {
    DiscTemplate.DiscMold.find({}, function(err, templates) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback(null, templates);
    });
}

function getTemplateById(templateId, callback) {
    DiscTemplate.DiscMold.findOne({_id: templateId}, function(err, template) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback(null, template);
    });
}

function getMaterials(templateId, callback) {
     DiscTemplate.DiscMold.findOne({_id: templateId}, function(err, template) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
         
         if (!template)
             return callback(Error.createError("No template found for provided mold.", Error.objectNotFoundError))
        
        DiscTemplate.DiscMaterial.findOne({brand: template.brand}, function(err, materials) {
            if (err)
                return callback(Error.createError(err, Error.internalError));

            return callback(null, materials);
        });
    });
}

function queryTemplates(query, callback) {
    if (typeof(query) === 'undefined') {
        return callback(null, []);
    }
    
    DiscTemplate.DiscMold.find({textSearch: new RegExp(query, 'i')}, function(err, templates) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback(null, templates);
    });
}

function createMold(data, callback) {
    var mold = new DiscTemplate.DiscMold(data);
    mold.textSearch = data.brand + ' ' + data.name;
    
    mold.save(function(err, mold) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
            
        return callback(null, mold);
    });
}

function createMaterial(data, callback) {
    var material = new DiscTemplate.DiscMaterial(data);
  
    material.save(function(err, material) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
      
        return callback(null, material);
    });
}

function deleteMolds(callback) {
    DiscTemplate.DiscMold.remove({}, function(err) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback();
    });
}

function deleteMaterials(callback) {
    DiscTemplate.DiscMaterial.remove({}, function(err) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback();
    });
}