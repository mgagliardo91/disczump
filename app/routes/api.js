var Busboy = require('busboy');
var async = require('async');
var request = require('request');
var gm = require('gm').subClass({
	imageMagick: true
});

var AccessTokenController = require('../controllers/accessToken');
var ClientController = require('../controllers/client');
var EventController = require('../controllers/event');
var UserController = require('../controllers/user');
var MessageController = require('../controllers/message');
var DiscController = require('../controllers/disc');
var ImageController = require('../controllers/imageCache');
var FeedbackController = require('../controllers/feedback');
var DiscTemplateController = require('../controllers/discTemplate');

var Error = require('../utils/error');
var logger = require('../utils/logger.js');
var FileUtil = require('../utils/file.js');
var Confirm = require('../utils/confirm');
var Recover = require('../utils/recover.js');
var Mailer = require('../utils/mailer.js');
var Solr = require('../utils/solr.js');
var Verify = require('../utils/verification.js');
var Access = require('../utils/access.js');
var StringUtils = require('../utils/stringUtils.js');

var config = require('../../config/config.js');
var localConfig = require('../../config/localConfig.js');

var gfs;

// app/api.js
module.exports = function(app, gridFs) {

	gfs = gridFs;

	app.route('/account')
		.get(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to get account data', req.user._id);
			UserController.getAccount(req.user._id, function(err, user) {
				if (err)
					return next(err);
				
				StringUtils.stringifyUser(user, function(err, account) {
					if (err)
						return next(err);
					
					return res.json(account);
				}, true);
			})
		})
		.put(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to update account data', req.user._id);
			UserController.updateAccount(req.user._id, req.body, function(err, user) {
				if (err)
					return next(err);

				StringUtils.stringifyUser(user, function(err, account) {
					if (err)
						return next(err);

					return res.json(account);
				}, true);
			});
		})
		.delete(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to initialize deletion of account data', req.user._id);
			ClientController.getClientPermissions(req.clientId, function(err, permissions) {
				if (err)
					return next(err);

				if (!permissions.deleteUsers)
					return next(Error.createError('Access to this API call requires a client permission [deleteUsers].', Error.unauthorizedError));

				logger.debug('Client [%s] has access to delete users', req.clientId);
				Confirm.initializeConfirmDelete(req.user._id, function(err, user, message) {
					if (err)
						return next(err);

					logger.debug('Sending delete confirmation email to user [%s]', user._id);
					Mailer.sendMail(user.local.email, Mailer.TypeAccountDeletion, message, function(err, result) {
						if (err)
							return next(err);

						return res.json({
							userId: req.user._id,
							status: 'OK'
						});
					});
				});
			});
		});

	app.route('/account/delete')
		.post(Access.clientAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to delete account data', req.user._id);
			if (!req.body.authorizationId)
				return next(Error.createError('An authorization identifier is required.', Error.invalidDataError));

			ClientController.getClientPermissions(req.clientId, function(err, permissions) {
				if (err)
					return next(err);

				if (!permissions.deleteUsers)
					return next(Error.createError('Access to this API call requires a client permission [deleteUsers].', Error.unauthorizedError));
				
				logger.debug('Client [%s] has access to delete users', req.clientId);
				
				Confirm.confirmDelete(req.body.authorizationId, gfs, function(err, user) {
					if (err)
						return next(err);

					EventController.addEvent(user._id, EventController.Types.AccountDeletion, 'Account has been deleted for user [' + user._id + '].');
					logger.info('User [%s] has successfully deleted account', req.user._id);
					
					return res.json({
						userId: user._id,
						status: 'OK'
					});
				});
			});
		});

	app.route('/account/image')
		.post(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to post account image', req.user._id);
			UserController.postUserImage(req.user._id, req.body._id, gfs, function(err, user) {
				if (err)
					return next(err);

				StringUtils.stringifyUser(user, function(err, account) {
					if (err)
						return next(err);

					return res.json(account);
				}, true);
			});
		})
		.delete(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to delete account image', req.user._id);
			UserController.deleteUserImage(req.user._id, gfs, function(err, user) {
				if (err)
					return next(err);

				StringUtils.stringifyUser(user, function(err, account) {
					if (err)
						return next(err);

					return res.json(account);
				}, true);
			});
		});

	app.route('/account/preferences')
		.get(Access.hasAccess, function(req, res, next) {
			return next(Error.createError('/preferences will be a future implementation.', Error.notImplemented));
		})
		.post(Access.hasAccess, function(req, res, next) {
			return next(Error.createError('/preferences will be a future implementation.', Error.notImplemented));
		})
		.put(Access.hasAccess, function(req, res, next) {
			return next(Error.createError('/preferences will be a future implementation.', Error.notImplemented));
		});
	
	app.route('/account/notifications')
		.get(Access.hasAccess, function(req, res, next) {
			UserController.getAccountNotifications(req.user._id, function(err, notifications) {
				if (err)
					return next(err);
				
				return res.json(notifications);
			})
		})
		.put(Access.hasAccess, function(req, res, next) {
			UserController.setAccountNotifications(req.user._id, req.body, function(err, notifications) {
				if (err)
					return next(err);
				
				return res.json(notifications);
			})
		})
	
	app.route('/account/verifications')
		.put(Access.hasAccess, function(req, res, next) {
			UserController.setAccountVerifications(req.user._id, req.body, function(err, user) {
				if (err)
					return next(err);
				
				StringUtils.stringifyUser(user, function(err, account) {
					if (err)
						return next(err);

					return res.json(account);
				}, true);
			})
		})

	app.route('/account/market')
		.get(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to get account market settings', req.user._id);
			DiscController.getMarketplaceDiscCount(req.user._id, function(err, count) {
				if (err)
					return next(err);

				return res.json({
					marketCap: req.user.account.marketCap,
					marketUsed: count,
					marketAvailable: req.user.account.marketCap - count
				});
			});
		});
	
	app.route('/account/count')
		.get(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to get account disc count settings', req.user._id);
			DiscController.getDiscCountByUser(req.user._id, function(err, count) {
				if (err)
					return next(err);

				return res.json({
					count: count,
					status: 'OK'
				});
			}, true);
		});
	
		app.route('/account/confirm')
		.post(Access.clientAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to confirm account via email', req.body.email);
		
			if (!req.body.email)
				return next(Error.createError('A valid email is required for a password reset.', Error.invalidDataError));
			
			UserController.getUserByEmail(req.body.email, function(err, user) {
				if (err)
					return next(err);
				
				if (!user)
					return next(Error.createError('Unable to locate user with provided email address.', Error.invalidDataError));
				
				if (user.local.active)
					return next(Error.createError('The account is already activated.', Error.invalidDataError));
				
				Confirm.initializeConfirmAccount(user._id, function(err, user, message) {
					if (err) {
						return next(err);
					}

					Mailer.sendMail(user.local.email, Mailer.TypeAccountConfirmation, message, function(err, result) {
						if (err) {
							return next(err);
						}
						
						StringUtils.stringifyUser(user, function(err, account) {
							if (err)
								return next(err);

							return res.json(account);
						}, true);
					});
				});
			});
		});

	app.route('/account/reset')
		.post(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to reset account password', req.user._id);
			UserController.tryResetPassword(req.user._id, req.body.currentPw, req.body.newPw,
				function(err, user) {
					if (err)
						return next(err);

					UserController.addUserEvent(user._id, EventController.Types.AccountPasswordReset, 'User authenticated password reset.');
					return res.json({
						userId: req.user._id,
						status: 'OK'
					});
				})
		});

	app.route('/account/recover')
		.post(Access.clientAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to recover account via email', req.body.email);
		
			if (!req.body.email)
				return next(Error.createError('A valid email is required for a password reset.', Error.invalidDataError));

			Recover.initializeRecovery(req.body.email, function(err, message) {
				if (err)
					return next(err);

				Mailer.sendMail(req.body.email, Mailer.TypePasswordRecovery, message, function(err, result) {
					if (err)
						return next(err);

					return res.json({
						status: 'OK'
					});
				});
			});
		});

	app.route('/account/recover/:authorizationId')
		.get(Access.clientAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to recover account via email', req.body.email);
			Recover.validateRecovery(req.params.authorizationId, function(err, recover) {
				if (err)
					return next(err);

				return res.json({
					status: 'OK'
				});
			})
		})
		.post(Access.clientAccess, function(req, res) {
			Recover.resetPassword(req.params.authorizationId, req.body.password, function(err, user) {
				if (err)
					return next(err);

				return res.json({
					status: 'OK'
				});
			})
		});
	
	app.route('/account/unsubscribe')
		.post(Access.clientAccess, function(req, res, next) {
			logger.debug('User is requesting to be unsubscribed from a notification.');
			UserController.unsubscribe(req.body.hashId, req.body.notification, function(err, user) {
				if (err)
					return next(err);

				return res.json({
					status: 'OK'
				});
			})
		})
	
	app.route('/discs')
		.post(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to create a disc', req.user._id);
			DiscController.createDisc(req.user._id, req.body, function(err, disc) {
				if (err)
					return next(err);

				logger.info('Successfully posted new disc %s', JSON.stringify(disc));
				return res.json(StringUtils.stringifyDisc(disc));
			});
		})
		.get(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to get their discs', req.user._id);
			DiscController.getDiscsByUser(req.user._id, req.user._id, function(err, discs) {
				if (err)
					return next(err);
				
				return res.json(discs);
			});
		});
	
	app.route('/discs/:discId/bump')
        .get(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to get bump remaining for disc [%s]', req.user._id, req.params.discId);
            DiscController.getDisc(req.user._id, req.params.discId, function(err, disc) {
				if (err)
					return next(err);
				
                var tempDisc = StringUtils.stringifyDisc(disc);
                
				return res.json({
                    _id: tempDisc._id,
                    bumpRemaining: tempDisc.marketplace.bumpRemaining
                });
			});
        })
		.put(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to bump disc [%s]', req.user._id, req.params.discId);
			DiscController.bumpDisc(req.user._id, req.params.discId, function(err, disc) {
				if (err)
					return next(err);
				
				var tempDisc = StringUtils.stringifyDisc(disc);
                
				return res.json({
                    _id: tempDisc._id,
                    bumpRemaining: tempDisc.marketplace.bumpRemaining
                });
			});
		});

	app.route('/discs/:discId')
		.get(Access.optAccess, function(req, res, next) {
			var userId = req.user? req.user._id : undefined;

			DiscController.getDisc(userId, req.params.discId, function(err, disc) {
				if (err)
					return next(err);
				
				return res.json(StringUtils.stringifyDisc(disc));
			});
		})
		.put(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to update disc [%s]', req.user._id, req.params.discId);
			DiscController.updateDisc(req.user._id, req.params.discId, req.body, gfs, function(err, disc) {
				if (err)
					return next(err);
				
				return res.json(StringUtils.stringifyDisc(disc));
			});
		})
		.delete(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to delete disc [%s]', req.user._id, req.params.discId);
			DiscController.deleteDisc(req.user._id, req.params.discId, gfs, function(err, disc) {
				if (err)
					return next(err);
				
				return res.json({
					discId: disc._id,
					status: 'OK'
				});
			});
		});

	app.route('/discs/:discId/primaryImage')
		.get(Access.optAccess, function(req, res, next) {
			DiscController.getDiscImage(req.user._id, req.params.discId, req.params.imageId, function(err, discImage) {
				if (err)
					return next(err);

				return res.json(discImage);
			});
		});

	app.route('/feedback')
		.post(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is posting new feedback', req.user._id);
			FeedbackController.createFeedback(req.user, req.body.data, function(err, dataItem) {
				if (err)
					return next(err);

				return res.json(dataItem);
			});
		});
	
	app.route('/images')
		.post(function(req, res, next) {
			var sendResponse = false;
			var busboy = new Busboy({
				headers: req.headers
			});

			busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
				if ((fieldname == 'discImage' || fieldname == 'accountImage') && /^image\//.test(mimetype)) {
					logger.debug('Receving image file [%s]', filename);

					FileUtil.saveImage(gm, gfs, file, {
						mimetype: mimetype,
						filename: filename,
						maxSize: config.images.maxSize
					}, function(err, newFile) {
						if (err) return next(err);

						ImageController.pushImageCache(gm, gfs, newFile._id, function(err, imageObj) {
							if (err)
								return next(err);

							return res.json(imageObj);
						}, fieldname == 'accountImage');
					});
				} else {
					sendResponse = true;
					file.resume();
				}
			});
			busboy.on('finish', function() {
				if (sendResponse) {
					return res.json(Error.createError('Invalid image post.', Error.invalidDataError));
				}
			});
			req.pipe(busboy);
		});
	
	app.route('/query/discs')
		.post(Access.clientAccess, function(req, res, next) {
			var userId = req.user ? req.user._id : undefined;
		
			var requestString = Solr.createDiscReq(req.body, req.params.userId, userId);
			var options = {
				url: localConfig.solrURL + ':8983/solr/discs/query',
				json: true,
				body: requestString,
				method: 'POST'
			}
				
			request(options, function(err, response, body) {
				if (err || response.statusCode != 200 || body.error) {
					return next(Error.createError('Error processing query request.', Error.internalError));
				}

				return res.json(Solr.stripBody(body));
			})
		});
	
	app.route('/query/discs/facet')
		.post(Access.clientAccess, function(req, res, next) {
			var requestString = Solr.createFacetReq(req.body, req.body.userId);
			var options = {
				url: localConfig.solrURL + ':8983/solr/discs/query',
				json: true,
				body: requestString,
				method: 'POST'
			}
			
			request(options, function(err, response, body) {
				if (err || response.statusCode != 200) {
					return next(Error.createError('Error processing query request.', Error.internalError));
				}

				return res.json(Solr.stripBody(body));
			})
		});

	app.route('/query/trunk/:userId')
		.post(Access.clientAccess, function(req, res, next) {
			var reqId = req.user ? req.user._id : undefined;
			var requestString = Solr.createDiscReq(req.body, req.params.userId, reqId);
			var options = {
				url: localConfig.solrURL + ':8983/solr/discs/query',
				json: true,
				body: requestString,
				method: 'POST'
			}

			request(options, function(err, response, body) {
				if (err || response.statusCode != 200) {
					return next(Error.createError('Error processing query request.', Error.internalError));
				}

				return res.json(Solr.stripBody(body));
			})
		});

	app.route('/query/users')
		.post(Access.clientAccess, function(req, res, next) {
			var requestString = Solr.createUserReq(req.body);
			var options = {
				url: localConfig.solrURL + ':8983/solr/users/query',
				json: true,
				body: requestString,
				method: 'POST'
			}

			request(options, function(err, response, body) {
				if (err || response.statusCode != 200 || body.error) {
					return next(Error.createError('Error processing query request.', Error.internalError));
				}

				return res.json(Solr.stripBody(body));
			})
		})
	
	app.route('/templates')
		.get(Access.clientAccess, function(req, res, next) {
			DiscTemplateController.queryTemplates(req.query.q, function(err, templates) {
				if (err)
					return next(err);

				return res.json(templates);
			});
		});

	app.route('/templates/:templateId')
		.get(Access.clientAccess, function(req, res, next) {
			DiscTemplateController.getTemplateById(req.params.templateId, function(err, template) {
				if (err)
					return next(err);

				return res.json(template);
			});
		});
	
	app.route('/threads/messageCount')
		.get(Access.hasAccess, function(req, res, next) {
		MessageController.getTotalUnread(req.user._id, function(err, threads) {
				if (err)
					return next(err);

				return res.json(threads);
		});
	});
	
	app.route('/threads')
		.get(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to their message threads', req.user._id);
			MessageController.getPrivateThreads(req.user._id, req.query.archived, function(err, localThreads) {
				if (err)
					return next(err);

				return res.json(localThreads);
			});
		})
		.post(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to post a new thread', req.user._id);
			async.series([
					function(cb) {
						UserController.getUser(req.body.receivingUser, function(err, user) {
							if (err)
								return cb(Error.createError('Invalid receiving user identifier.', Error.invalidDataError));
							
							return cb(null, user);
						});
					},
					function(cb) {
						MessageController.createPrivateThread(req.user._id, req.body.receivingUser, function(err, localThread) {
							if (err) 
								return cb(err);

							return cb(null, localThread);
						});
					}
				],
				function(err, results) {
					if (err)
						return next(err);
				
					return res.json(results[1]);
				}
			);
		});

	app.route('/threads/:threadId')
		.get(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to get thread [%s]', req.user._id, req.params.threadId);
			MessageController.getThreadState(req.user._id, req.params.threadId, function(err, threadState) {
				if (err)
					return next(err);

				return res.json(threadState);
			});
		})
		.put(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to update thread [%s]', req.user._id, req.params.threadId);
			MessageController.putThreadState(req.user._id, req.params.threadId, req.body, function(err, threadState) {
				if (err)
					return next(err);

				return res.json(threadState);
			});
		})
		.delete(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to delete thread [%s]', req.user._id, req.params.threadId);
			MessageController.deactivateThread(req.user._id, req.params.threadId, function(err, threadState) {
				if (err)
					return next(err);

				return res.json(threadState);
			});
		})

	app.route('/threads/:threadId/messages')
		.get(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to messages on thread [%s]', req.user._id, req.params.threadId);
			MessageController.getMessages(req.user._id, req.params.threadId, req.query, function(err, messages) {
				if (err)
					return next(err);

				return res.json(messages);
			});
		})
		.post(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is requesting access to post a message on thread [%s]', req.user._id, req.params.threadId);
			if (typeof(req.body.content) === 'undefined') {
				return next(Error.createError('Message post must contain a content property.', Error.invalidDataError));
			}

			MessageController.sendMessage(req.user._id, req.params.threadId, req.body, function(err, message) {
				if (err)
					return next(err);

				return res.json(message);
			});
		});

	app.route('/users')
		.post(Access.clientAccess, function(req, res, next) {
			logger.debug('Client [%s]  is attempting to create a new user', req.clientId);
		
			if (!req.permissions || !req.permissions.createUsers) {
				return next(Error.createError('Access to this API call requires a client permission [createUsers].', Error.unauthorizedError))
			}
		
			logger.debug('Client [%s] has access to create users', req.clientId);

			UserController.createUser(req.body, function(err, user) {
				if (err)
					return next(err);

				Confirm.initializeConfirmAccount(user._id, function(err, user, message) {
					if (err) {
						return next(err);
					}

					Mailer.sendMail(user.local.email, Mailer.TypeAccountConfirmation, message, function(err, result) {
						if (err) {
							return next(err);
						}

						EventController.addEvent(user._id, EventController.Types.AccountCreation, 'New account created for user [' + user._id + '] by client [' + req.clientId + '].');
						logger.info('Client [%s] has successfully created new user [%s]', req.clientId, user._id);
						StringUtils.stringifyUser(user, function(err, account) {
							if (err)
								return next(err);

							return res.json(account);
						}, true);
					});
				});
			});
		});
	
	app.route('/users/username/:username')
		.get(Access.clientAccess, function(req, res, next) {
			UserController.getUserByUsername(req.params.username, function(err, user) {
				if (err)
					return next(err);
				
				if (!user) {
					return next(Error.createError('Unknown username.', Error.objectNotFoundError));
				}

				StringUtils.stringifyUser(user, function(err, account) {
					if (err)
						return next(err);

					return res.json(account);
				});
			})
		});

	app.route('/users/:userId')
		.get(Access.clientAccess, function(req, res, next) {
			UserController.getUser(req.params.userId, function(err, user) {
				if (err)
					return next(err);

				StringUtils.stringifyUser(user, function(err, account) {
					if (err)
						return next(err);

					return res.json(account);
				});
			})
		});

	app.route('/verify/pdga')
		.post(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is attempting to claim a PDGA number', req.user._id);
			var options = {
				url: 'https://api.pdga.com/services/json/user/login',
				json: true,
				body: {
					username: req.body.username,
					password: req.body.password
				},
				headers: {
					'Content-Type': 'application/json'
				},
				method: 'POST'
			}

			request(options, function(err, response, body) {
				if (err) {
					return next(Error.createError('Error processing query request.', Error.internalError));
				}

				if (response.statusCode == 401) {
					return next(Error.createError(response.body.length ? response.body[0] : 'Invalid information', Error.unauthorizedError));
				}

				if (response.statusCode != 200) {
					return next(Error.createError(response.body.length ? response.body[0] : 'Unknown response from server.', Error.internalError));
				}

				var parsed = Verify.parsePDGA(body);

				if (!parsed.pdgaNumber) {
					return next(Error.createError('User does not have a PDGA number associated with the account.', Error.objectNotFoundError));
				}

				UserController.setPDGA(req.user._id, parsed.pdgaNumber, function(err, user) {
					if (err)
						return next(err);

					logger.info('User [%s] is has claimed PDGA Number [%s]', req.user._id, parsed.pdgaNumber);

					StringUtils.stringifyUser(user, function(err, account) {
						if (err)
							return next(err);

						return res.json(account);
					}, true);
				});
			})
		});

	app.route('/verify/pdga/reset')
		.post(Access.hasAccess, function(req, res, next) {
			logger.debug('User [%s] is attempting to release a claim on a PDGA number', req.user._id);
			UserController.resetPDGA(req.user._id, function(err, user) {
				if (err)
					return next(err);

				StringUtils.stringifyUser(user, function(err, account) {
					if (err)
						return next(err);

					return res.json(account);
				}, true);
			});
		});

	app.route('/validate/email')
		.get(Access.clientAccess, function(req, res, next) {
			if (typeof(req.body.email) === 'undefined') {
				return next(Error.createError('A valid email is required for validation.', Error.invalidDataError));
			}
			
			UserController.getUserByEmail(req.body.email, function(err, user) {
				if (err) {
					return next(err);
				}

				return res.json(user ? {
					userId: user._id,
					status: 'OK'
				} : {});
			});
		});

	app.route('/validate/facebook')
		.post(Access.clientAccess, function(req, res, next) {
		
			if (typeof(req.body.userID) === 'undefined') {
				return next(Error.createError('A valid Facebook ID is required for validation.', Error.invalidDataError));
			}
		
			UserController.getUserByFacebook(req.body.userID, function(err, user) {
				if (err) {
					return next(err);
				}

				return res.json(user ? {
					userId: user._id,
					status: 'OK'
				} : {});
			});

		});
	
	app.route('/validate/username')
		.get(Access.clientAccess, function(req, res, next) {
		
			if (typeof(req.body.username) === 'undefined') {
				return next(Error.createError('A valid username is required for validation.', Error.invalidDataError));
			}
			
			UserController.getUserByUsername(req.body.username, function(err, user) {
				if (err) {
					return next(err);
				}

				return res.json(user ? {
					userId: user._id,
					status: 'OK'
				} : {});
			});
		});

	app.get('*', function(req, res, next) {
		next(Error.createError('Unknown path', Error.unauthorizedError));
	});
}