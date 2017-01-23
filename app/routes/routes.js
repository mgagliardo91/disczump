var path = require('path');
var _ = require('underscore');

var localConfig = require('../../config/localConfig.js');
var DiscController = require('../controllers/disc.js');
var UserController = require('../controllers/user.js');
var FacebookHeaders = require('../utils/facebookHeaders.js');

// app/routes.js
module.exports = function(app, passport, gridFs) {

    // Site
    
    // For Headers
    app.get('/d/:discId', function(req, res) {
        DiscController.getDisc(undefined, req.params.discId, function(err, disc) {
			res.render('portal', {
               layout: 'desktop',
               isRelease: localConfig.release,
               serverURL : localConfig.serverURL,
			   fbId: localConfig.facebookAuth.clientID,
               reqScroll: req.device.isMobile,
               headers: FacebookHeaders.getDiscHeaders(disc, req.url)
           });
        });
    });
	
	app.get('/t/:username', function(req, res) {
        UserController.getUserByUsername(req.params.username, function(err, user) {
			res.render('portal', {
               layout: 'desktop',
               isRelease: localConfig.release,
               serverURL : localConfig.serverURL,
			   fbId: localConfig.facebookAuth.clientID,
               reqScroll: req.device.isMobile,
               headers: FacebookHeaders.getTrunkHeaders(user, req.url)
           });
        });
    });
    
    app.get('/sitemap.xml', function(req, res) {
        res.sendfile(path.resolve(__dirname + '/../private/sitemap.xml'));
    });
    
    app.get('/', function(req, res) {
       res.render('portal', {
           layout: 'desktop',
           isRelease: localConfig.release,
           serverURL : localConfig.serverURL,
		   fbId: localConfig.facebookAuth.clientID,
           reqScroll: req.device.isMobile,
		   headers: FacebookHeaders.getStandardHeaders(req.url)
       });
    });
    
    app.all('/*', function(req, res) {
       res.render('portal', {
           layout: 'desktop',
           isRelease: localConfig.release,
           serverURL : localConfig.serverURL,
		   fbId: localConfig.facebookAuth.clientID,
           reqScroll: req.device.isMobile,
		   headers: FacebookHeaders.getStandardHeaders(req.url)
       });
    });
    
};