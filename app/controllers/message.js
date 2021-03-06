var _ = require('underscore');
var async = require('async');
var fs = require('fs');
var XDate = require('xdate');
var Error = require('../utils/error');
var UserController = require('./user');
var Message = require('../models/message');
var Thread = require('../models/thread');
var Socket = require('../utils/socket.js');
var ThreadLocal = require('../models/threadLocal');
var socketManager = require('../objects/socketCache.js');
var MessageConfig = require('../../config/config.js').message;
var LocalConfig = require('../../config/localConfig.js');
var Mailer = require('../utils/mailer.js');
var Handlebars = require('handlebars');

module.exports = {
    getThreadState: getThreadState,
    getTotalUnread: getTotalUnread,
    putThreadState: putThreadState,
    deactivateThread: deactivateThread,
    getMessages: getMessages,
    sendMessage: sendMessage,
    getPrivateThreads: getPrivateThreads,
    createPrivateThread: createPrivateThread,
    deleteUserThreads: deleteUserThreads
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

function getTotalUnread(userId, callback) {
    ThreadLocal.aggregate([
        {
            $match: {
                userId: userId
            }
        },
        {
            $lookup: {
                from: 'threads',
                localField: 'threadId',
                foreignField: '_id',
                as: 'parentThread'
            }
        },
        {
             $match: { 'parentThread': { $ne: [] } }
        },
        {
            $project: {
                unreadMsgCount: { $subtract: [ {$arrayElemAt:['$parentThread.messageCount', 0]}, '$messageCount' ] }
              }
        },
        {
            $group : {
               _id : null,
               totalUnread: { $sum: '$unreadMsgCount' },
            }
        }
    ], function (err, result) {
        if (err) {
            return callback(Error.createError(err, Error.internalError));
        } else {
           return callback(null, result.length ? result[0] : {totalUnread: 0});
        }
    });
}

function putThreadState(userId, threadId, threadState, callback) {
    var messageCount;
    
    if (typeof(threadState.messageCount) !== 'undefined') {
        messageCount = parseInt(threadState.messageCount);
        if (_.isNaN(messageCount)) {
            messageCount = undefined;
        }
    }
    
    getLocalThread(userId, threadId, function(err, localThread) {
        if (err) return callback(err);
        
        getLocalThreadObj(localThread, function(err, localThreadObj) {
            if (err) return callback(err);
            
            if (typeof(threadState.threadTag) !== 'undefined') {
                localThread.threadTag = threadState.threadTag;
            }
          
            if (typeof(threadState.active) !== 'undefined' && threadState.active) {
                localThread.active = true;
            }
        
            if (typeof(messageCount) !== 'undefined' && messageCount > localThreadObj.messageCount && messageCount <= localThreadObj.currentMessageCount) {
                localThread.messageCount = messageCount;
            }
            
            localThread.save(function(err) {
                if (err) return callback(Error.createError(err, Error.internalError));
                
                localThreadObj.messageCount = localThread.messageCount;
                localThreadObj.threadTag = localThread.threadTag;
                
                // Socket.sendNotification(userId, Socket.TypeThread, localThreadObj);
                
                return callback(null, localThreadObj);
            });
        });
    });
}

function deactivateThread(userId, threadId, callback) {
    getLocalThread(userId, threadId, function(err, localThread) {
        if (err) return callback(err);
            
        localThread.active = false;
        localThread.save(function() {
            if (err) return callback(err);
            
            callback(null, {"_id" : localThread._id});
        });
    });
}

function getMessages(userId, threadId, params, callback) {
     getLocalThread(userId, threadId, function(err, localThread) {
        if (err) return callback(err);
        
        Message.find({threadId: localThread.threadId}).sort({createDate: -1}).exec(function(err, messages) {
            if (err)
                return callback(Error.createError(err, Error.internalError));
                
            localThread.messageCount = messages.length;
            localThread.save();
            
            var startIndex = 0;
            
            if (typeof(params.refId) !== 'undefined') {
                var refMessage = _.findWhere(messages, {'_id' : params.refId});
                
                if (refMessage) {
                    startIndex = Math.min(messages.length - 1, messages.indexOf(refMessage) + 1);
                }
            }
        
            var messageCount = messages.length - startIndex;
            var pMessageCount;
            
            if (typeof(params.count) !== 'undefined' && 
                !_.isNaN(pMessageCount = parseInt(params.count)) &&
                pMessageCount <= messageCount) {
                messageCount = pMessageCount;
            }
            
            return callback(null, messages.splice(startIndex, messageCount));
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
                if (err)
                    return callback(Error.createError(err, Error.internalError));
                
                Message.count({threadId: thread._id}, function(err, count) {
                    if (err)
                        return callback(Error.createError(err, Error.internalError));
                        
                    thread.modifiedDate = message.createDate;
                    thread.messageCount = count;
                    localThread.messageCount = count;
                    thread.save();
                    localThread.save();
            
                    return callback(null, message);
                });
            });
        });
    });
}

function notifyUsers(message, userId) {
    var origUser;
    
    async.series([
        function(cb) {
            UserController.getUser(userId, function(err, user) {
                if (err) {
                    return cb(err);
                }
                
                origUser = user;
                cb();
            });
        }
    ],
    function(err, results) {
        if (err)
            return;
            
        ThreadLocal.find({threadId: message.threadId, userId: {$ne: origUser._id}}, function(err, localThreads) {
            _.each(localThreads, function(localThread) {
                
                async.series([
                    function(cb) {
                        if (!localThread.active) {
                            localThread.active = true;
                            localThread.save(cb);
                        } else cb();
                    }
                ], function(err, results) {
                    if (socketManager.hasSockets(localThread.userId)) {
                        Socket.sendNotification(localThread.userId, Socket.TypeMsg, message);
                    } else {
                        UserController.getUser(localThread.userId, function(err, user) {
                            if (!err && user && user.account.notifications.newMessage) {
                                if (localThread.lastAlert) {
                                    var lastAlert = new XDate(localThread.lastAlert);
                                    if (lastAlert.diffMinutes(new XDate()) < MessageConfig.alertThresholdMin) {
                                        return;
                                    }   
                                }
                                
                                localThread['lastAlert'] = new Date();
                                localThread.save();
                                var alert = generateEmailNotification(user, origUser, message);
                                Mailer.sendMail(user.local.email, 'disc|zump Message Alert', alert);
                            }
                        });
                    }
                });
            });
        });
    });  
}

function getPrivateThreads(userId, archived, callback) {
    var retThreads = [];
    ThreadLocal.find({userId: userId, active: !archived}, function(err, localThreads) {
        if (err) return Error.createError(err, Error.internalError);
        
        async.each(localThreads, function(localThread, cb) {
            getLocalThreadObj(localThread, function(err, localThreadObj) {
                if (err) return cb(err);
                
                retThreads.push(localThreadObj);
                cb();
            });
        }, function(err) {
            if (err) return callback(err);
            retThreads = _.sortBy(retThreads, function(element) { return element.modifiedDate; }).reverse();
            return callback(null, retThreads);
        });
        
    });
}

function createPrivateThread(userId, receivingUserId, callback) {
    Thread.findOne({$and: [{isPrivate: true},{users: userId},{users: receivingUserId}]}, function(err, thread) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        if (!thread) {
            generatePrivateThread(userId, receivingUserId, function(err, localThread) {
                if (err) return callback(err);
                
                getLocalThreadObj(localThread, function(err, localThreadObj) {
                    if (err) return callback(err);
                    
                    return callback(null, localThreadObj);
                });
            });
        } else {
            getLocalThread(userId, thread._id, function(err, localThread) {
                if (err)
                    return callback(err);
                
                async.series([
                    function(cb) {
                        if (!localThread.active) {
                            localThread.active = true;
                            localThread.save(function(err) {
                                if (err) return cb(err);
                                
                                return cb();
                            });
                        } else cb();
                    }
                ], function(err, results) {
                    if (err) return callback(err);
                    
                    getLocalThreadObj(localThread, function(err, localThreadObj) {
                        if (err)
                            return callback(err);
                            
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
            var users = [firstUser, secondUser];
            createThread(users, true, function(err, thread) {
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

function deleteUserThreads(userId, callback) {
    ThreadLocal.remove({userId: userId}, function(err) {
        if (err)
            console.log(err);
        
        callback();
    });
}

/* Private Functions */
function getLocalThreadObj(localThread, callback) {
    var localThreadObj = localThread.toObject();
    
    Thread.findOne({_id: localThread.threadId}, function(err, thread) {
        if (err)
            return callback(Error.createError(err, Error.internalError));
        
        localThreadObj.currentMessageCount = thread.messageCount;
        localThreadObj.modifiedDate = thread.modifiedDate;
        localThreadObj.users = thread.users;
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

function generateEmailNotification(user, origUser, message) {
    var html = fs.readFileSync('./private/html/messageAlert.handlebars', 'utf8');
    var template = Handlebars.compile(html);
    return template({user: user, hashId: user.hashId(), origUser: origUser, message : message, serverURL: LocalConfig.serverURL});
}

function createThreadLocal(userId, refUserId, thread, callback) {
    UserController.getUser(refUserId, function(err, user) {
        
        if (err) return callback(err);
        
        var t = new ThreadLocal();
        t.isPrivate = thread.isPrivate;
        t.threadId = thread._id;
        t.userId = userId;
        t.threadTag = user.local.username;
        t.save(function(err) {
            if (err) return callback(Error.createError(err, Error.internalError));
        
            callback(null, t);
        });
    });
}

function createThread(users, isPrivate, callback) {
    var t = new Thread();
    t.users = users;
    t.isPrivate = isPrivate;
    t.save(function(err) {
        if (err) return callback(Error.createError(err, Error.internalError));
        
        callback(null, t);
    });
}