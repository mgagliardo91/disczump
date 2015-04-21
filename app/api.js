var Error = require('./utils/error');
var UserController = require('./controllers/user');
var DiscController = require('./controllers/disc');
var DiscImageController = require('./controllers/discImage');
var passport = require('passport');
var logger = require('../config/logger.js').logger;
var config = require('../config/config.js');
var Busboy = require('busboy');
var gfs;
var gm = require('gm').subClass({ imageMagick: true });

// app/api.js
module.exports = function(app, passport, gridFs) {
    
    gfs = gridFs;
    
    app.route('/account/preferences')
        .get(hasAccess, function(req, res) {
            UserController.getPreferences(req.user._id, function(err, user) {
                if (err)
                    return res.json(err);
                
                return res.json(user);
            })
        })
        .put(hasAccess, function(req, res) {
            UserController.updatePreferences(req.user._id, req.body, function (err, user) {
                if (err)
                    return res.json(err);
                
                return res.json(user);
            });
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