var path = require('path');

var localConfig = require('../../config/localConfig.js');

// app/routes.js
module.exports = function(app, passport, gridFs) {

    // Site
    
    app.get('/portal', function(req, res) {
       res.render('portal', {
           layout: 'desktop',
           isRelease: localConfig.release,
           serverURL : localConfig.serverURL,
           reqScroll: req.device.isMobile
       });
    });
    
    app.all('/portal/*', function(req, res) {
       res.render('portal', {
           layout: 'desktop',
           isRelease: localConfig.release,
           serverURL : localConfig.serverURL,
           reqScroll: req.device.isMobile
       });
    });
    
    app.get('/sitemap.xml', function(req, res) {
        res.sendfile(path.resolve(__dirname + '/../private/sitemap.xml'));
    });
    
    
    /*
    * DELETE ALL BELOW THIS LINE WHEN READY
    */
    
    app.get('/', function(req, res) {
       res.render('home', {
           isRelease: localConfig.release,
           isIndex: true,
           serverURL : localConfig.serverURL,
           reqScroll: req.device.isMobile
       });
    });
    
    app.get('/terms', function(req, res) {
       res.render('terms', {
           isRelease: localConfig.release
       });
    });
    
    app.get('/faq', function(req, res) {
       res.render('faq', {
           isRelease: localConfig.release
       });
    });
    
    app.get('/privacy', function(req, res) {
       res.render('privacy', {
           isRelease: localConfig.release
       });
    });
    
    app.get('/unsubscribe', function(req, res) {
        UserController.getUserFromHash(req.query.hashId, function(err, user) {
            if (err) {
                 return res.render('notification', {
                    isRelease: localConfig.release,
                    isMobile: req.device.isMobile,
                    notify : {
                        pageHeader: err.error.type,
                        header: err.error.type,
                        strong: err.error.message,
                        text: 'Please try again.',
                        buttonIcon: 'fa-home',
                        buttonText: 'Return Home',
                        buttonLink: '/dashboard'
                   }
                });
            }
            
            user.preferences.notifications.newMessage = false;
            user.save();
            
            return res.render('notification', {
                isRelease: localConfig.release,
                isMobile: req.device.isMobile,
                notify : {
                   pageHeader: 'Preferences Updated',
                   header: 'Preferences Updated',
                   strong: 'You have been successfully unsubscribed from new message notifications!',
                   text: 'You can change this preference at any time under the preferences area of your dashboard.',
                   buttonIcon: 'fa-home',
                   buttonText: 'Return Home',
                   buttonLink: '/dashboard'
               }
            });
        });
    });
    
};