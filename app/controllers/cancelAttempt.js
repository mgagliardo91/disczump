var CancelAttempt = require('../models/cancelAttempt.js');
var Error = require('../utils/error.js');

module.exports = {
    getActiveAttempts: getActiveAttempts,
    createAttempt: createAttempt,
    deleteAttempt: deleteAttempt,
    incrementAttemptCount: incrementAttemptCount
}

function getActiveAttempts(callback) {
    CancelAttempt.find({complete: false}, function(err, attempts) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        return callback(null, attempts);
    });
}

function getAttempt(id, callback) {
     CancelAttempt.find({_id: id}, function(err, attempt) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        if (!attempt)
            return callback(Error.createError('Unknown attempt identifier.', Error.objectNotFoundError));
        
         return callback(null, attempt);
     });
}

function createAttempt(userId, profileId, error, callback) {
    CancelAttempt.remove({ userId: userId, complete: false}, function(err) {
        var attempt = new CancelAttempt({
            userId: userId, 
            profileId: profileId
        });
        
        attempt.errorsReceived.push(error);

        attempt.save(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));

            return callback(null, attempt);
        });
    });
}

function incrementAttemptCount(id, callback) {
    getAttempt(id, function(err, attempt) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        attempt.tryCount += 1;
        
        attempt.save(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, attempt);
        });
    });
}

function deleteAttempt(id, callback) {
    getAttempt(id, function(err, attempt) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        attempt.remove(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            return callback(null, {_id: attempt._id, status: 'OK'});
        });
    });
}