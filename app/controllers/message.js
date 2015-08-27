var Error = require('../utils/error');
var UserController = require('./user');
var Message = require('../models/message');
var Thread = require('../models/thread');
var Socket = require('../../config/socket.js');
var ThreadLocal = require('../models/threadLocal');
var _ = require('underscore');
var async = require('async');
var socketManager = require('../objects/socketCache.js');

module.exports = {
    getThreadState: getThreadState,
    putThreadState: putThreadState,
    getMessages: getMessages,
    sendMessage: sendMessage,
    getPrivateThreads: getPrivateThreads,
    createPrivateThread: createPrivateThread
}

function getLocalThreadObj(localThread, callback) {
    
    var localThreadObj = localThread.toObject();
    
    Thread.findOne({_id: localThreadObj.threadId}, function(err, thread) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        localThreadObj.currentMessageCount = thread.messageCount;
        localThreadObj.modifiedDate = thread.modifiedDate;
        callback(null, localThreadObj);
    });
}

function getLocalThread(userId, threadId, callback) {
    ThreadLocal.findOne({userId: userId, threadId: threadId}, function(err, localThread) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        if (!localThread)
            return callback(Error.createError('Unauthorized access to the specified message thread.', Error.unauthorizedError));
           
        callback(null, localThread);
    });
}

function getThreadState(userId, threadId, callback) {
    getLocalThread(userId, threadId, function(err, localThread) {
        if (err) return callback(err);
        
        getLocalThreadObj(localThread, function(err, localThreadObj) {
            if (err) return callback(err);
            
            return callback(null, localThreadObj);
        });
    });
}

function putThreadState(userId, threadId, threadState, callback) {
    var messageCount;
    
    if (typeof(threadState.messageCount) === 'undefined') {
        return callback(Error.createError('The object is missing messageCount.', Error.invalidDataError));
    }
    
    messageCount = parseInt(threadState.messageCount);
    if (_.isNaN(messageCount)) {
        return callback(Error.createError('The messageCount parameter must be an integer.', Error.invalidDataError));
    }
    
    getLocalThread(userId, threadId, function(err, localThread) {
        if (err) return callback(err);
        
        getLocalThreadObj(localThread, function(err, localThreadObj) {
            if (err) return callback(err);
        
            if (messageCount < localThreadObj.messageCount || messageCount > localThreadObj.currentMessageCount) {
                return callback(null, localThreadObj);
            } else {
                localThread.messageCount = messageCount;
                localThread.save(function(err) {
                    if (err) return callback(Error.createError(err, Error.internalError));
                    
                    localThreadObj.messageCount = localThread.messageCount;
                    
                    return callback(null, localThreadObj);
                });
            }
        });
    });
}

function getMessages(userId, threadId, callback) {
     getLocalThread(userId, threadId, function(err, localThread) {
        if (err) return callback(err);
        
        Message.find({threadId: localThread.threadId}).sort({createDate: 1}).exec(function(err, messages) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
                
            localThread.messageCount = messages.length;
            localThread.save();
            
            return callback(null, messages);
        });
    });
}

function sendMessage(userId, threadId, messageObj, callback) {
     getLocalThread(userId, threadId, function(err, localThread) {
         
        if (err) return callback(err);
        var message = new Message();
        message.userId = userId;
        message.threadId = localThread.threadId;
        message.body = messageObj.content;
        message.save(function(err) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
            
            notifyUsers(message, userId);
            
            Thread.findOne({_id: localThread.threadId}, function(err, thread) {
                thread.modifiedDate = message.createDate;
                thread.messageCount = thread.messageCount + 1;
                localThread.messageCount = thread.messageCount;
                thread.save();
                localThread.save();
            });
            
            return callback(null, message);
        });
    });
}

function notifyUsers(message, userId) {
    ThreadLocal.find({threadId: message.threadId, userId: {$ne: userId}}, 'userId', function(err, localThreads) {
        _.each(localThreads, function(localThread) {
            var socket = socketManager.getSocket(localThread.userId);
            
            if (typeof(socket) !== 'undefined') {
                Socket.sendNotification(socket, Socket.TypeMsg, message);
            }
        });
    });
}

function getPrivateThreads(userId, callback) {
    var retThreads = [];
    ThreadLocal.find({userId: userId}, function(err, localThreads) {
        if (err) return Error.createError(err, Error.internalError);
        
        async.each(localThreads, function(localThread, cb) {
            getLocalThreadObj(localThread, function(err, localThreadObj) {
                if (err) return cb(err);
                
                retThreads.push(localThreadObj);
                cb();
            });
        }, function(err) {
            if (err) return callback(err);
            _.sortBy(retThreads, 'modifiedDate');
            return callback(null, retThreads);
        });
        
    });
}

function createPrivateThread(userId, receivingUserId, callback) {
    
    ThreadLocal.find({userId: userId, isPrivate: true}, function(err, privateThreads) {
        if (err) return callback(Error.createError(err, Error.internalError));
        
        if (!privateThreads || _.isEmpty(privateThreads)) {
            
            generatePrivateThread(userId, receivingUserId, function(err, localThread) {
                if (err) return callback(err);
                
                getLocalThreadObj(localThread, function(err, localThreadObj) {
                    if (err) return callback(err);
                    
                    return callback(null, localThreadObj);
                });
            });
        } else {
            async.each(privateThreads, function(thread, asyncCB) {
                ThreadLocal.findOne({threadId: thread.threadId, userId: receivingUserId, isPrivate: true}, function(err, existingThread) {
                    if (!err && existingThread) {
                        asyncCB(true);
                    } else {
                        asyncCB(false);
                    }
                });
            }, function(err) {
                if (err) return callback(Error.createError('A thread already exists.', Error.invalidDataError));
                
                generatePrivateThread(userId, receivingUserId, function(err, localThread) {
                    if (err) return callback(err);
                    
                    getLocalThreadObj(localThread, function(err, localThreadObj) {
                        if (err) return callback(err);
                        
                        return callback(null, localThreadObj);
                    });
                });
            });
        }
    });
}

function generatePrivateThread(firstUser, secondUser, callback) {
    
    var curThread = undefined;
    
    async.series([
        function(cb) {
            createThread(true, function(err, thread) {
                if (err) {
                    cb(err);
                } else {
                    curThread = thread;
                    cb();
                }
            })
        },
        function(cb) {
            createThreadLocal(firstUser, secondUser, curThread, function(err, threadLocal) {
                if (err) cb(err);
                else cb(null, threadLocal);
            })
        },
        function(cb) {
            createThreadLocal(secondUser, firstUser, curThread, function(err, threadLocal) {
                if (err) cb(err);
                else cb(null, threadLocal);
            })
        }
    ],
    function(err, results){
        if (err) return callback(err);
        
        return callback(null, results[1]);
    });
    
    
}

function createThreadLocal(userId, refUserId, thread, callback) {
    
    UserController.getUser(refUserId, function(err, user) {
        
        if (err) return callback(err);
        
        var t = new ThreadLocal();
        t.isPrivate = thread.isPrivate;
        t.threadId = thread._id;
        t.userId = userId;
        t.threadPhoto = user.local.image;
        t.threadTag = user.getAlias();
        t.save(function(err) {
            if (err) return callback(Error.createError(err, Error.internalError));
        
            callback(null, t);
        });
    });
}

function createThread(isPrivate, callback) {
    var t = new Thread();
    t.isPrivate = isPrivate;
    t.save(function(err) {
        if (err) return callback(Error.createError(err, Error.internalError));
        
        callback(null, t);
    });
}