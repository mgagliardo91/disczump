var _ = require('underscore');
var logger = require('./logger.js');
var cache;

module.exports = {
    
    init: function(io, socketCache, logger) {
        
        cache = socketCache;
        
        io.on('connection', function (socket) {
            socket.on('initialize', function (data) {
                logger.info('Socket connected: [' + socket.id + ']');
                cache.pushSocket(data.sessionId, socket);
                socket.emit('notification', {type: 'InfoNotification', data: 'Socket connected.'});
            });
            socket.on('disconnect', function() {
                logger.info('Socket disconnected: [' + socket.id + ']');
                cache.removeSocket(socket.id);
            });
        });
    },
    
    TypeMsg: 'MessageNotification',
    TypeThread: 'ThreadUpdateNotification',
    TypeInfo: 'InfoNotification',
    TypeCallback: 'CallbackNotification',
    
    sendInfo: sendInfo,
    sendCallback: sendCallback,
    sendNotification: sendNotification,
}

function sendCallback(userId, name, data) {
    sendNotification(userId, 'CallbackNotification', {callbackName: name, message: data});
}

function sendInfo(userId, data) {
    sendNotification(userId, 'InfoNotification', data);
}

function sendNotification(userId, type, data) {
    var sockets = cache.getSockets(userId);
    
    if (sockets && sockets.length) {
        _.each(sockets, function(socketObj) {
            try{
                socketObj.socket.emit('notification', { type: type, data: data});
            } catch (e) {
                logger.error('Error when attempting to emit to socket.', e);
            }
        });
    }
}