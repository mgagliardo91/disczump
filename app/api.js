var Error = require('./utils/error');
var UserController = require('./controllers/user');
var MessageController = require('./controllers/message');
var DiscController = require('./controllers/disc');
var DiscImageController = require('./controllers/discImage');
var DataItemController = require('./controllers/dataItem');
var passport = require('passport');
var logger = require('../config/logger.js').logger;
var config = require('../config/config.js');
var Busboy = require('busboy');
var gfs;
var gm = require('gm').subClass({ imageMagick: true });
var async = require('async');

// app/api.js
module.exports = function(app, passport, gridFs) {
    
    gfs = gridFs;
    
    app.route('/validate/username')
        .get(function(req, res) {
            if (typeof(req.query.q) === 'undefined') {
                return res.json({});
            }
            
            UserController.query('local.username', req.query.q, function(err, users) {
                if (err)
                    return res.json(err);
                
                return res.json({query: req.query.q, count: users.length});
            });
        });
    
    app.route('/validate/email')
        .get(function(req, res) {
            if (typeof(req.query.q) === 'undefined') {
                return res.json({});
            }
            
            UserController.query('local.email', req.query.q, function(err, users) {
                if (err)
                    return res.json(err);
                
                return res.json({query: req.query.q, count: users.length});
            });
        });
    
    app.route('/threads')
        .get(hasAccess, function(req, res) {
           MessageController.getPrivateThreads(req.user._id, function(err, localThreads) {
               if (err)
                    return res.json(err);
                    
                return res.json(localThreads);
           });
        })
        .post(hasAccess, function(req, res) {
            
            async.series([
                    function(cb) {
                        UserController.getUser(req.body.receivingUser, function(err, user) {
                            if (err) {
                                res.json(Error.createError('Invalid receiving user identifier.', Error.invalidDataError));
                                cb(err);
                            } else {
                                cb();
                            }
                        });
                    },
                    function(cb) {
                        MessageController.createPrivateThread(req.user._id, req.body.receivingUser, function (err, localThread) {
                            if (err) {
                                res.json(err);
                            } else {
                                res.json(localThread);
                            }
                            
                            cb();
                        });
                    }
                ],
                function(err, results) {
                    
                });
            
            
        });
    
    app.route('/threads/:threadId')
        .get(hasAccess, function(req, res) {
            MessageController.getThreadState(req.user._id, req.params.threadId, function(err, threadState) {
                if (err)
                    return res.json(err);
                    
                return res.json(threadState);
            });
        })
        .put(hasAccess, function(req, res) {
            MessageController.putThreadState(req.user._id, req.params.threadId, req.body, function(err, threadState) {
                if (err)
                    return res.json(err);
                    
                return res.json(threadState);
            });
        });
        
    app.route('/threads/:threadId/messages')
        .get(hasAccess, function(req, res) {
            MessageController.getMessages(req.user._id, req.params.threadId, function(err, messages) {
                if (err)
                    return res.json(err);
                    
                return res.json(messages);
           });
        })
        .post(hasAccess, function(req, res) {
            
            if (typeof(req.body.content) === 'undefined') {
                return res.json(Error.createError('Post must contain a content property.'));
            }
            
            MessageController.sendMessage(req.user._id, req.params.threadId, req.body, function(err, message) {
                if (err)
                    return res.json(err);
                    
                return res.json(message);
            });
        });
    
    app.route('/feedback')
        .post(hasAccess, function(req,res) {
        	     DataItemController.createGeneric(req.user._id, req.body.data, 'Feedback', function(err, dataItem) {
        	          if (err)
                    return res.json(err);
                    
                return res.json(dataItem);
        	     });
        });
    
    app.route('/account')
        .get(hasAccess, function(req, res) {
           UserController.getAccount(req.user._id, function(err, user) {
               if (err)
                    return res.json(err);
                    
                return res.json(user);
           })
        })
        .put(hasAccess, function(req, res) {
            UserController.updateAccount(req.user._id, req.body, function (err, user) {
                if (err)
                    return res.json(err);
                
                return res.json(user);
            });
        });
    
    app.route('/account/preferences')
        .get(hasAccess, function(req, res) {
            UserController.getPreferences(req.user._id, function(err, user) {
                if (err)
                    return res.json(err);
                
                return res.json(user);
            })
        })
        .post(hasAccess, function(req, res) {
            UserController.restorePreferences(req.user._id, function (err, user) {
                if (err)
                    return res.json(err);
                
                return res.json(user);
            });
        })
        .put(hasAccess, function(req, res) {
            UserController.updatePreferences(req.user._id, req.body, function (err, user) {
                if (err)
                    return res.json(err);
                
                return res.json(user);
            });
        });
        
    app.route('/account/reset')
        .put(hasAccess, function(req,res) {
            UserController.tryResetPassword(req.user._id, req.body.currentPw, 
                req.body.newPw, function(err, user) {
                if (err)
                    return res.json(err);
                
                user.addEvent('User authenticated password reset.');
                return res.json(user.accountToString());
            })
        });
    
    app.route('/users')
        .get(hasAccess, function(req, res) {
            if (typeof(req.query.q) === 'undefined') {
                return res.json([]);
            }
            
            UserController.queryUsers(req.query.q, function(err, users) {
                if (err)
                    return res.json(err);
                
                return res.json(users);
            });
        });
        
    app.route('/users/:userId')
        .get(hasAccess, function(req, res) {
            UserController.getAccount(req.params.userId, function(err, user) {
               if (err)
                    return res.json(err);
                    
                return res.json(user);
           })
        });
    
    app.route('/users/:userId/discs')
    
        .get(function(req, res) {
            var userId = undefined;
            if (req.user) userId = req.user._id;
            
            
            DiscController.getDiscs(userId, req.params.userId, function(err, discs) {
                if (err)
                    return res.json(err);
                
                return res.json(discs);
            });
        });
    
    app.route('/discs')
    
        .post(hasAccess, function(req, res) {
            DiscController.postDisc(req.user._id, req.body, function(err, disc) {
                if (err)
                  return res.json(err);
                
                logger.info('Successfully posted new disc %s', JSON.stringify(disc));
                return res.json(disc);
              });
        })
    
        
        .get(hasAccess, function(req, res) {
            DiscController.getDiscs(req.user._id, req.user._id, function(err, discs) {
                if (err)
                  return res.json(err);
            
                logger.info('Successfully retrieved discs for user %s', req.user.local.email);
                return res.json(discs);
              });
        });
        
    app.route('/discs/:discId')
    
        .get(function(req, res) {
            var userId = undefined;
            if (req.user) userId = req.user._id;
            
            DiscController.getDisc(userId, req.params.discId, function(err, disc) {
                if (err)
                  return res.json(err);
            
                logger.info('Successfully retrieved disc %s', JSON.stringify(disc));
                return res.json(disc);
            });
        })
        
        .put(hasAccess, function(req, res) {
            DiscController.putDisc(req.user._id, req.params.discId, req.body, function(err, disc) {
                if (err)
                  return res.json(err);
            
                logger.info('Successfully updated disc %s', JSON.stringify(disc));
                return res.json(disc);
              });
        })
        
        .delete(hasAccess, function(req, res) {
            DiscController.deleteDisc(req.user._id, req.params.discId, gfs, function(err, disc) {
                if (err)
                  return res.json(err);
            
                logger.info('Successfully deleted disc %s', JSON.stringify(disc));
                return res.json(disc);
              });
        });
    
    app.route('/discs/:discId/images')
        .get(function(req, res) {
            var userId = undefined;
            if (req.user) userId = req.user._id;
            
            DiscController.getDisc(userId, req.params.discId, function(err, disc) {
                if (err)
                    return res.json(err);
                
                DiscImageController.getDiscImages(userId, disc._id, function(err, discImages) {
                    if (err)
                        return res.json(err);
                    
                    return res.json(discImages);
                })
            });
        })
        .post(hasAccess, function(req, res) {
            DiscController.getDisc(req.user._id, req.params.discId, function(err, disc) {
                if (err)
                  return res.json(err);
            
                var sendResponse = false;
                var busboy = new Busboy({
                      headers: req.headers
                  });
                 
                busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
                    if (fieldname == 'discImage' && /^image\//.test(mimetype)) {
                        console.log("Fieldname: " + fieldname + "; Filename: " + filename + "; Encoding: " + encoding + "; MIME: " + mimetype);
                        
                        DiscImageController.saveImage(gm, gfs, file, {
                            mimetype: mimetype,
                            filename: filename,
                            maxSize: config.images.maxSize
                            }, function(newFile) {
                                DiscImageController.postDiscImage(req.user._id, disc._id, newFile._id, function(err, discImage) {
                                    if (err)
                                        return res.json(err);
                                    
                                    DiscImageController.createThumbnail(gm, gfs, discImage, function(err, image) {
                                        if (err)
                                            return res.json(err);
                                        
                                        return res.json(image);
                                    });
                                    
                                    return res.json(discImage);
                                });
                        });
                    } else {
                        sendResponse = true;
                        file.resume();
                    }
                    
                });
                busboy.on('finish', function() {
                    if (sendResponse) {
                        return res.json({});
                    }
                });
                req.pipe(busboy);
            });
        });
    
    app.route('/images/:imageId')
        .get(function(req, res) {
            var userId = undefined;
            if (req.user) userId = req.user._id;
            
            DiscImageController.getDiscImage(userId, req.params.imageId, function(err, discImage) {
                if (err)
                    return res.json(err);
                    
                return res.json(discImage);
            });
        })
        .delete(hasAccess, function(req, res){
            DiscImageController.deleteDiscImage(req.user._id, req.params.imageId, gfs, function(err, discImage) {
                if (err)
                    return res.json(err);
                    
                return res.json(discImage);
            });
        })
    
    app.get('*', function(req, res){
       res.json(401, 'Unknown path'); 
    });
}

function hasAccess(req, res, next) {
    
    if (req.isAuthenticated()) return next();
    passport.authenticate('bearer', { session : false }, function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { 
            return res.json(401, Error.createError('Access to this page requires an account.', Error.unauthorizedError));
        }
        req.user = user;
        next();
    })(req, res, next);
}