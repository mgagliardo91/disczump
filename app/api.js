var Error = require('./utils/error');
var DiscController = require('./controllers/disc');
var DiscImageController = require('./controllers/discImage');
var passport = require('passport');
var logger = require('../config/logger.js').logger;
var Busboy = require('busboy');
var gfs;

// app/api.js
module.exports = function(app, passport, gridFs) {
    
    gfs = gridFs;
    
    app.route('/public/users/:userId/discs')
    
        .get(function(req, res) {
           DiscController.getPublicDiscs(req.params.userId, function(err, discs) {
                if (err)
                    return res.json(err);
                
                return res.json(discs);
           });
        });
        
        
    app.route('/public/discs/:discId')
        .get(function(req, res) {
            DiscController.getPublicDisc(req.params.discId, function(err, disc) {
                if (err)
                  return res.json(err);
                
                return res.json(disc);
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
            DiscController.getDiscs(req.user._id, function(err, discs) {
                if (err)
                  return res.json(err);
            
                logger.info('Successfully retrieved discs for user %s', req.user.local.email);
                return res.json(discs);
              });
        });
        
    app.route('/discs/:discId')
    
        .get(hasAccess, function(req, res) {
            DiscController.getDisc(req.user._id, req.params.discId, function(err, disc) {
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
        .get(hasAccess, function(req, res) {
            DiscController.getDisc(req.user._id, req.params.discId, function(err, disc) {
                if (err)
                    return res.json(err);
                
                DiscImageController.getDiscImages(req.user._id, disc._id, function(err, discImages) {
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
                        var ws = gfs.createWriteStream({
                                      mode: 'w',
                                      content_type: mimetype,
                                      filename: filename
                                  });
                        ws.on('close', function (file) {
                            DiscImageController.postDiscImage(req.user._id, disc._id, file._id, function(err, discImage) {
                                if (err)
                                    return res.json(err);
                                
                                return res.json(discImage);
                            })
                          });
                        file.pipe(ws);
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
        .get(hasAccess, function(req, res) {
            DiscImageController.getDiscImage(req.user._id, req.params.imageId, function(err, discImage) {
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