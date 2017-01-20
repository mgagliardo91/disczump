var PromoCode = require('../models/promoCode');
var Error = require('../utils/error');
var logger = require('../utils/logger');
var XDate = require('xdate');
var _ = require('underscore');

module.exports = {
    createPromoCode: createPromoCode,
    getPromoCode: getPromoCode,
    setPromoUsed: setPromoUsed
}

function createPromoCode(params, callback) {
    var code = new PromoCode(params);
    code.save(function(err) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback(null, code);
    });
}

function getPromoCode(code, callback) {
    if (typeof(code) === 'undefined') 
        return callback(Error.createError('Invalid promo code.', Error.invalidDataError));
    
    PromoCode.findOne({code: code.toLowerCase()}, function(err, code) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        if (!code)
            return callback(Error.createError('Invalid promo code.', Error.invalidDataError));
        
        if (!code.active)
            return callback(Error.createError('The promo code is not available.', Error.invalidDataError));
        
        var startDate = new XDate(code.startDate);
        var endDate = code.endDate ? new XDate(code.endDate) : undefined;
        var today = new XDate();
        
        if (startDate > today)
            return callback(Error.createError('Invalid promo code. The specified promotion has not yet began.', Error.invalidDataError));
        
        if (endDate && endDate < today)
            return callback(Error.createError('Invalid promo code. The specified promotion has already ended.', Error.invalidDataError));
        
        return callback(null, code);
    });
}

function setPromoUsed(id) {
    if (typeof(id) === 'undefined')
        return;
    
    PromoCode.findOne({_id: id}, function(err, code) {
        if (!err && code) {
            code.setUsed();
        }
    });
}