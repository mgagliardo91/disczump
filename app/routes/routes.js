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
           reqScroll: req.device.isMobile,
		   headers: FacebookHeaders.getStandardHeaders(req.url)
       });
    });
    
    app.all('/*', function(req, res) {
       res.render('portal', {
           layout: 'desktop',
           isRelease: localConfig.release,
           serverURL : localConfig.serverURL,
           reqScroll: req.device.isMobile,
		   headers: FacebookHeaders.getStandardHeaders(req.url)
       });
    });
    
//     app.get('/unsubscribe', function(req, res) {
//         UserController.getUserFromHash(req.query.hashId, function(err, user) {
//             if (err) {
//                  return res.render('notification', {
//                     isRelease: localConfig.release,
//                     isMobile: req.device.isMobile,
//                     notify : {
//                         pageHeader: err.error.type,
//                         header: err.error.type,
//                         strong: err.error.message,
//                         text: 'Please try again.',
//                         buttonIcon: 'fa-home',
//                         buttonText: 'Return Home',
//                         buttonLink: '/dashboard'
//                    }
//                 });
//             }
            
//             user.preferences.notifications.newMessage = false;
//             user.save();
            
//             return res.render('notification', {
//                 isRelease: localConfig.release,
//                 isMobile: req.device.isMobile,
//                 notify : {
//                    pageHeader: 'Preferences Updated',
//                    header: 'Preferences Updated',
//                    strong: 'You have been successfully unsubscribed from new message notifications!',
//                    text: 'You can change this preference at any time under the preferences area of your dashboard.',
//                    buttonIcon: 'fa-home',
//                    buttonText: 'Return Home',
//                    buttonLink: '/dashboard'
//                }
//             });
//         });
//     });
    
};