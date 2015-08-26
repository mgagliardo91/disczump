var _ = require('underscore');
var Error = require('../utils/error');
var shortid = require('shortid');
var socketTable = [];

module.exports = {
    requestSession: requestSession,
    pushSocket: pushSocket,
    getSocket: getSocket,
    removeSocket: removeSocket
}

function requestSession(userId) {
    var sessionId = shortid.generate();
    var socketEntry = _.findWhere(socketTable, {userId: userId.toString()});
    
    if (typeof(socketEntry) === 'undefined') {
        socketEntry = {
            userId: userId.toString(),
            sessionId: sessionId
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
        socketEntry.socketId = socket.id;
        socketEntry.socket = socket;
    }
}

function getSocket(userId) {
    var socketEntry = _.findWhere(socketTable, {userId: userId});
    
    if (typeof(socketEntry) === 'undefined') {
        return undefined;
    }
    
    return socketEntry.socket;
}

function removeSocket(socketId) {
    socketTable = _.reject(socketTable, function(socketEntry) { return socketEntry.socketId = socketId; });
}