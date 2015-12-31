var Client = require('../models/client');
var shortId = require('shortid');
var Error = require('../utils/error');

module.exports = {
    getClient: getClient,
    getClientByCred: getClientByCred,
    createClient: createClient
}

function getClient(id, callback) {
    Client.findOne({_id: id}, function(err, client) {
        if (err) {
            return callback(Error.createError(err, Error.internalError));
        }
        
        if (!client) {
            return callback(Error.createError('Client not found.', Error.objectNotFoundError));
        }
        
        return callback(null, client);
    });
}

function getClientByCred(clientId, clientSecret, callback) {
    Client.findOne({clientId: clientId}, function(err, client) {
        if (err) {
            return callback(Error.createError(err, Error.internalError));
        }
        
        if (!client) {
            return callback(Error.createError('Client not found.', Error.objectNotFoundError));
        }
        
        if (client.clientSecret != clientSecret) {
            return callback(Error.createError('Invalid client secret.', Error.unauthorizedError));
        }
        
        return callback(null, client);
    });
}

function createClient(data, callback) {
    var client = new Client({
        name: data.name,
        clientId: data.clientId,
        permissions: data.permissions
    });
    
    client.clientSecret = client.generateHash(shortId.generate());
    
    client.save(function(err) {
        if (err) {
            return callback(Error.createError(err, Error.internalError));
        }
        
        return callback(null, client);
    })
}