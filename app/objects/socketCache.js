var _ = require('underscore');
var shortid = require('shortid');
var socketTable = [];

module.exports = {
    requestSession: requestSession,
    pushSocket: pushSocket,
    hasSockets: hasSockets,
    getSockets: getSockets,
    getSocketCount: getSocketCount,
    removeSocket: removeSocket
}

function requestSession(userId) {
    var sessionId = shortid.generate();
    var socketEntry = _.findWhere(socketTable, {userId: userId.toString()});
    
    if (typeof(socketEntry) === 'undefined') {
        socketEntry = {
            userId: userId.toString(),
            sessionId: sessionId,
            sockets: []
        }
        socketTable.push(socketEntry);
    } else {
        socketEntry.sessionId = sessionId;
    }
    
    return sessionId;
}

function pushSocket(sessionId, socket) {
    var socketEntry = _.findWhere(socketTable, {sessionId: sessionId});
    
    if (typeof(socketEntry) !== 'undefined') {
        socketEntry.sockets.push({
            socketId: socket.id,
            socket: socket
        })
    }
}

function hasSockets(userId) {
    var socketEntry = _.findWhere(socketTable, {userId: userId});
    
    return typeof(socketEntry) !== 'undefined' && socketEntry.sockets.length;
}

function getSockets(userId) {
    var socketEntry = _.findWhere(socketTable, {userId: userId});
    
    if (typeof(socketEntry) === 'undefined') {
        return undefined;
    }
    
    return socketEntry.sockets;
}

function getSocketCount() {
    return socketTable.length;
}

function removeSocket(socketId) {
    var socketEntry = _.find(socketTable, function(entry) {
        return _.findWhere(entry.sockets, {socketId: socketId});
    });
    
    if (typeof(socketEntry) !== 'undefined') {
        if (socketEntry.sockets.length == 1) {
            socketTable = _.reject(socketTable, function(entry) { return entry == socketEntry; });
        } else {
            socketEntry.sockets = _.reject(socketEntry.sockets, function(socket) { return socket.socketId == socketId});
        }
    }
}