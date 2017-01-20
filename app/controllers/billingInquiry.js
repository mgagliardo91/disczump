var BillingInquiry = require('../models/billingInquiry.js');
var Error = require('../utils/error.js');

module.exports = {
    getActiveInquiries: getActiveInquiries,
    createInquiry: createInquiry,
    deleteInquiry: deleteInquiry,
    incrementInquiryCount: incrementInquiryCount
}

function getActiveInquiries(callback) {
    BillingInquiry.find({complete: false}, function(err, inquiries) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback(null, inquiries);
    });
}

function getInquiry(id, callback) {
     BillingInquiry.find({_id: id}, function(err, inquiry) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        if (!inquiry)
            return callback(Error.createError('Unknown inquiry identifier.', Error.objectNotFoundError));
        
         return callback(null, inquiry);
     });
}

function createInquiry(user, error, callback, contactMade) {
    BillingInquiry.remove({ userId: user._id, complete: false}, function(err) {
        var inquiry = new BillingInquiry({
            userId: user._id, 
            profileId: user.account.profile.profileId
        });
        
        inquiry.errorsReceived.push(error);
        
        if (contactMade) {
            inquiry.contactMade = true;
            inquiry.contactDate = new Date();
        }

        inquiry.save(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));

            return callback(null, inquiry);
        });
    });
}

function incrementInquiryCount(id, callback) {
    getInquiry(id, function(err, inquiry) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        inquiry.tryCount += 1;
        
        inquiry.save(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, inquiry);
        });
    });
}

function deleteInquiry(id, callback) {
    getInquiry(id, function(err, inquiry) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        inquiry.remove(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, {_id: inquiry._id, status: 'OK'});
        });
    });
}