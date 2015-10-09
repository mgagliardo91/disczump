var Error = require('../utils/error');
var UserController = require('./user');
var Message = require('../models/message');
var Thread = require('../models/thread');
var Socket = require('../../config/socket.js');
var ThreadLocal = require('../models/threadLocal');
var _ = require('underscore');
var async = require('async');
var socketManager = require('../objects/socketCache.js');
var Mailer = require('../utils/mailer.js');
var fs = require('fs');
var XDate = require('xdate');
var MessageConfig = require('../../config/config.js').message;
var LocalConfig = require('../../config/localConfig.js');
var Handlebars = require('handlebars');

module.exports = {
    getThreadState: getThreadState,
    putThreadState: putThreadState,
    deactivateThread: deactivateThread,
    getMessages: getMessages,
    sendMessage: sendMessage,
    getPrivateThreads: getPrivateThreads,
    createPrivateThread: createPrivateThread
}

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
    
    if (typeof(threadState.messageCount) !== 'undefined') {
        messageCount = parseInt(threadState.messageCount);
        if (!_.isNaN(messageCount)) {
            messageCount = undefined;
        }
    }
    
    getLocalThread(userId, threadId, function(err, localThread) {
        if (err) return callback(err);
        
        getLocalThreadObj(localThread, function(err, localThreadObj) {
            if (err) return callback(err);
        
            if (typeof(messageCount) === 'undefined' || messageCount < localThreadObj.messageCount || messageCount > localThreadObj.currentMessageCount) {
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
                var socket = socketManager.getSocket(localThread.userId);
                
                if (typeof(socket) !== 'undefined') {
                    Socket.sendNotification(socket, Socket.TypeMsg, message);
                } else {
                    UserController.getUser(localThread.userId, function(err, user) {
                        if (!err && user && user.preferences.notifications.newMessage) {
                            if (localThread.lastAlert) {
                                var lastAlert = new XDate(localThread.lastAlert);
                                if (lastAlert.diffMinutes(new XDate()) < MessageConfig.alertThresholdMin) {
                                    return;
                                }   
                            }
                            
                            localThread['lastAlert'] = Date.now();
                            localThread.save();
                            var alert = generateEmailNotification(user, origUser, message);
                            Mailer.sendMail(user.local.email, 'disc|zump Message Alert', alert);
                        }
                    });
                }
            });
        });
    });  
}

function generateEmailNotification(user, origUser, message) {
    var html = fs.readFileSync('./private/html/messageAlert.handlebars', 'utf8');
    var template = Handlebars.compile(html);
    return template({user: user, origUser: origUser, message : message, serverURL: LocalConfig.serverURL});
}

function getPrivateThreads(userId, callback) {
    var retThreads = [];
    ThreadLocal.find({userId: userId, active: true}, function(err, localThreads) {
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
    
    // See if thread already exists
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

function createThreadLocal(userId, refUserId, thread, callback) {
    
    UserController.getUser(refUserId, function(err, user) {
        
        if (err) return callback(err);
        
        var t = new ThreadLocal();
        t.isPrivate = thread.isPrivate;
        t.threadId = thread._id;
        t.userId = userId;
        t.threadTag = thread._id;
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