module.exports = {
    
    init: function(io, socketCache, logger) {
        io.on('connection', function (socket) {
            socket.on('initialize', function (data) {
                logger.info('Socket connected: [' + socket.id + ']');
                socketCache.pushSocket(data.sessionId, socket);
            });
            socket.on('disconnect', function() {
                logger.info('Socket disconnected: [' + socket.id + ']');
                socketCache.removeSocket(socket.id);
            });
        });
    },
    
    TypeMsg: 'MessageNotification',
    
    sendNotification: function(socket, type, data) {
        socket.emit('notification', { type: type, data: data});
    }
}