var DiscController = require('./controllers/disc');
var passport = require('passport');
var logger = require('../config/logger.js').logger;

// app/api.js
module.exports = function(app, passport) {
    
    app.route('/discs')
    
        .post(hasAccess, function(req, res) {
            DiscController.postDisc(req.user._id, req.body, function(err, disc) {
                if (err)
                  return res.send(err);
                
                logger.info('Successfully posted new disc %s', JSON.stringify(disc));
                return res.json(disc);
              });
        })
    
        .get(hasAccess, function(req, res) {
            DiscController.getDiscs(req.user._id, function(err, discs) {
                if (err)
                  return res.send(err);
            
                logger.info('Successfully retrieved discs for user %s', req.user.local.email);
                return res.json(discs);
              });
        });
        
    app.route('/discs/:discId')
    
        .get(hasAccess, function(req, res) {
            DiscController.getDisc(req.user._id, req.params.discId, function(err, disc) {
                if (err)
                  return res.send(err);
            
                logger.info('Successfully retrieved disc %s', JSON.stringify(disc));
                return res.json(disc);
              });
        })
        
        .put(hasAccess, function(req, res) {
            DiscController.putDisc(req.user._id, req.params.discId, req.body, function(err, disc) {
                if (err)
                  return res.send(err);
            
                logger.info('Successfully updated disc %s', JSON.stringify(disc));
                return res.json(disc);
              });
        })
        
        .delete(hasAccess, function(req, res) {
            DiscController.deleteDisc(req.user._id, req.params.discId, function(err, disc) {
                if (err)
                  return res.send(err);
            
                logger.info('Successfully deleted disc %s', JSON.stringify(disc));
                return res.json(disc);
              });
        });
    
    app.get('*', function(req, res){
       res.send(401, 'Unknown path'); 
    });
}

function hasAccess(req, res, next) {
    
    if (req.isAuthenticated()) return next();
    passport.authenticate('bearer', { session : false }, function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { 
            return res.send(401, 'Unathorized');
        }
        req.user = user;
        next();
    })(req, res, next);
}