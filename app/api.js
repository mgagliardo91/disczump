var passport = require('passport');
var Busboy = require('busboy');
var gfs;
var gm = require('gm').subClass({ imageMagick: true });
var async = require('async');
var Error = require('./utils/error');
var AccessTokenController = require('./controllers/accessToken');
var ClientController = require('./controllers/client');
var EventController = require('./controllers/event');
var UserController = require('./controllers/user');
var MessageController = require('./controllers/message');
var DiscController = require('./controllers/disc');
var ImageController = require('./controllers/imageCache');
var FeedbackController = require('./controllers/feedback');
var DiscTemplateController = require('./controllers/discTemplate');
var logger = require('../config/logger.js').logger;
var config = require('../config/config.js');
var localConfig = require('../config/localConfig.js');
var FileUtil = require('./utils/file.js');
var Confirm = require('./utils/confirm');
var Mailer = require('./utils/mailer.js');
var request = require('request');
var Solr = require('./utils/solr.js');

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
                    
                }
            );
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
        })
        .delete(hasAccess, function(req, res) {
            MessageController.deactivateThread(req.user._id, req.params.threadId, function(err, threadState) {
               if (err)
                    return res.json(err);
                
                return res.json(threadState);
            });
        })
        
    app.route('/threads/:threadId/messages')
        .get(hasAccess, function(req, res) {
            MessageController.getMessages(req.user._id, req.params.threadId, req.query, function(err, messages) {
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
        	     FeedbackController.createFeedback(req.user, req.body.data, function(err, dataItem) {
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
        
    app.route('/account/image')
        .post(hasAccess, function(req, res) {
            var sendResponse = false;
            var busboy = new Busboy({
                  headers: req.headers
              });
             
            busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
                if (fieldname == 'accountImage' && /^image\//.test(mimetype)) {
                    console.log("Fieldname: " + fieldname + "; Filename: " + filename + "; Encoding: " + encoding + "; MIME: " + mimetype);
                    
                    FileUtil.saveImage(gm, gfs, file, {
                        mimetype: mimetype,
                        filename: filename,
                        maxSize: config.images.maxSize
                        }, function(err, newFile) {
                            if (err) return res.json(err);
                            
                            UserController.postUserImage(req.user._id, newFile._id, gfs, function(err, user) {
                                if (err)
                                    return res.json(err);
                                
                                return res.json(user);
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
        })
        .delete(hasAccess, function(req, res) {
            UserController.deleteUserImage(req.user._id, gfs, function(err, user) {
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
                
                user.addEvent(EventController.Types.AccountPasswordReset, 'User authenticated password reset.');
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
        })
        .post(clientAccess, function(req, res) {
            if (!req.permissions.createUsers) {
                return res.json(401, Error.createError('Access to this API call requires a client permission [createUsers].', Error.unauthorizedError))
            }
            
            UserController.createUser(req.body, function(err, user) {
                if (err)
                    return res.json(err);
                    
                Confirm.initializeConfirmAccount(user._id, function(err, user, message) {
                    if (err) {
                        return res.json(err);
                    }
                    
                    Mailer.sendMail(user.local.email, 'disc|zump Account Confirmation', message, function(err, result) {
                       if (err) {
                            return res.json(err);
                        }
                        
                        EventController.addEvent(user._id, EventController.Types.AccountCreation, 'New account created for user [' + user._id + '] by client [' + req.client._id + '].' );
                        return res.json(user.accountToString());
                    });
                });
            });
        });
        
    app.route('/users/:userId')
        .get(optAccess, function(req, res) {
            UserController.getAccount(req.params.userId, function(err, user) {
               if (err)
                    return res.json(err);
                    
                DiscController.getDiscCountByUser(user._id, function(err, count) {
                    if (err)
                        return res.json(err);
                        
                    user.discCount = count;
                    return res.json(user);
                });
           })
        });
        
    app.route('/users/:userId/preview')
        .get(optAccess, function(req, res) {
            DiscController.getPreview(req.params.userId, req.query.refDiscId, function(err, preview) {
              if (err)
                    return res.json(err);
                    
                return res.json(preview);
            });
        });
    
    app.route('/users/:userId/discs')
    
        .get(function(req, res) {
            var userId = undefined;
            if (req.user) userId = req.user._id;
            
            
            DiscController.getDiscsByUser(userId, req.params.userId, function(err, discs) {
                if (err)
                    return res.json(err);
                
                return res.json(discs);
            });
        });
    
    app.route('/search/discs/')
        .get(hasAccess, function(req, res) {
            
            var params = {
                search: req.query.q,
                sort: [],
                filter: {},
                size: 50,
                page: 1
            };
            
            DiscController.browseDiscs(params, function(err, discs) {
                if (err)
                    return res.json(err);
                    
                return res.json(discs);
            });
            
            
            // DiscController.testTextSearch(req.query.q, function(err, discs) {
            //     if (err)
            //         return res.json(err);
                    
            //     return res.json(discs);
            // });
        });
    
    app.route('/discs')
    
        .post(hasAccess, function(req, res) {
            DiscController.createDisc(req.user._id, req.body, function(err, disc) {
                if (err)
                  return res.json(err);
                
                logger.info('Successfully posted new disc %s', JSON.stringify(disc));
                return res.json(disc);
              });
        })
    
        
        .get(hasAccess, function(req, res) {
            DiscController.getDiscsByUser(req.user._id, req.user._id, function(err, discs) {
                if (err)
                  return res.json(err);
            
                logger.info('Successfully retrieved discs for user %s', req.user.local.email);
                return res.json(discs);
              });
        });
        
    app.route('/discs/:discId')
    
        .get(optAccess, function(req, res) {
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
            DiscController.updateDisc(req.user._id, req.params.discId, req.body, gfs, function(err, disc) {
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
        .get(optAccess, function(req, res) {
            var userId = undefined;
            if (req.user) userId = req.user._id;
            
            DiscController.getDiscImages(userId, req.params.discId, function(err, discImages) {
                if (err)
                    return res.json(err);
                
                return res.json(discImages);
            });
        });
        
    app.route('/discs/:discId/images/:imageId')
        .get(optAccess, function(req, res) {
            DiscController.getDiscImage(req.user._id, req.params.discId, req.params.imageId, function(err, discImage) {
                if (err)
                    return res.json(err);
                    
                return res.json(discImage);
            });
        });
        
    app.route('/discs/:discId/primaryImage')
        .get(optAccess, function(req, res) {
            DiscController.getDiscImage(req.user._id, req.params.discId, req.params.imageId, function(err, discImage) {
                if (err)
                    return res.json(err);
                    
                return res.json(discImage);
            });
        });
    
    app.route('/images')
        .post(hasAccess, function(req, res) {
            var sendResponse = false;
            var busboy = new Busboy({
                  headers: req.headers
              });
             
            busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
                if (fieldname == 'discImage' && /^image\//.test(mimetype)) {
                    console.log("Fieldname: " + fieldname + "; Filename: " + filename + "; Encoding: " + encoding + "; MIME: " + mimetype);
                    
                    FileUtil.saveImage(gm, gfs, file, {
                        mimetype: mimetype,
                        filename: filename,
                        maxSize: config.images.maxSize
                        }, function(err, newFile) {
                            if (err) return res.json(err);
                            
                            ImageController.pushImageCache(gm, gfs, req.user._id, newFile._id, function(err, imageObj) {
                                if (err)
                                    return res.json(err);
                                    
                                return res.json(imageObj);
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
        
    app.route('/templates')
        .get(hasAccess, function(req, res) {
            DiscTemplateController.getTemplates(function(err, templates) {
                if (err)
                    return res.json(err);
                
                return res.json(templates);
            });
        });
        
    app.route('/explore')
        .post(function(req, res) {
            console.log(req.get('origin'));
            var requestString = Solr.createDiscReq(req.body, req.params.userId);
            var options = {
                url: localConfig.solrURL + ':8983/solr/discs/query',
                json: true,
                body: requestString,
                method: 'POST'
            }
            
            request(options, function (err, response, body) {
                if (err || response.statusCode != 200 || body.error) {
                    return res.json(Error.createError('Error processing query request.', Error.internalError));
                }
                
                return res.json(body);
            })
        });
    
    app.route('/trunk/:userId')
        .post(function(req, res) {
            var requestString = Solr.createDiscReq(req.body, req.params.userId);
            var options = {
                url: localConfig.solrURL + ':8983/solr/discs/query',
                json: true,
                body: requestString,
                method: 'POST'
            }
            
            request(options, function (err, response, body) {
                if (err || response.statusCode != 200) {
                    return res.json(Error.createError('Error processing query request.', Error.internalError));
                }
                
                return res.json(body);
            })
        });
    
    app.route('/facet')
        .post(function(req, res) {
            var requestString = Solr.createFacetReq(req.body);
            var options = {
                url: localConfig.solrURL + ':8983/solr/discs/query',
                json: true,
                body: requestString,
                method: 'POST'
            }
            request(options, function (err, response, body) {
                if (err || response.statusCode != 200) {
                    return res.json(Error.createError('Error processing query request.', Error.internalError));
                }
                
                return res.json(body);
            })
        });
    
    app.get('*', function(req, res){
       res.json(401, Error.createError('Unknown path', Error.unauthorizedError)); 
    });
}

function optAccess(req, res, next) {
    if (req.isAuthenticated()) return next();
     passport.authenticate('bearer', { session : false }, function(err, user, info) {
        if (err) { return next(); }
        if (!user) { return next(); }
        req.user = user;
        next();
    })(req, res, next);
}

function hasAccess(req, res, next) {
    
    if (req.isAuthenticated()) return next();
    passport.authenticate('bearer', { session : false }, function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { 
            return res.json(401, Error.createError('Access to this API call requires an account.', Error.unauthorizedError));
        }
        
        req.user = user;
        next();
    })(req, res, next);
}

function clientAccess(req, res, next) {
     passport.authenticate('oauth2-client-password', { session : false }, function(err, client) {
        if (err) {
            return res.json(401, err);
        }
        
        if (!client) { 
            return res.json(401, Error.createError('Access to this API call requires a valid client.', Error.unauthorizedError))
        }
        next();
    })(req, res, next);
}