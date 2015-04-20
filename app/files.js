var DiscController = require('./controllers/disc');
var DiscImageController = require('./controllers/discImage');
var passport = require('passport');
var logger = require('../config/logger.js').logger;
var mongoose = require('mongoose');
var gfs;
var gm = require('gm').subClass({ imageMagick: true });

module.exports = function(app, gridFs) {
    
    gfs = gridFs;
    
    app.route('/:fileId')
        .get(function(req, res) {
            
            gfs.files.find({_id:mongoose.Types.ObjectId(req.params.fileId)}).toArray(function(err, files) {
                if(err)
                    return res.send(err);
                
                if(files.length === 0){
                  return res.send(new Error('File metadata does not exist'));
                }
                
                var file = files[0];
                
                var rs = gfs.createReadStream({
                  _id: req.params.fileId
                });
                
                res.writeHead(200, {
                  'Content-Type' : file.contentType,
                  'Content-Length' : file.length
                });
                
                rs.pipe(res);
            });
        });
        
    app.route('/:fileId/:resize')
        .get(function(req, res) {
            var width, height;
            
            if(!/^\d{1,3}([x]\d{1,3}){0,1}$/.test(req.params.resize)) {
                return res.send('Invalid Data');
            }
            
            var params = req.params.resize.match(/(?:\d{1,3})/g);
            width = params[0];
            height = params[1] ? params[1] : null;
            
            gfs.files.find({_id:mongoose.Types.ObjectId(req.params.fileId)}).toArray(function(err, files) {
                if(err)
                    return res.send(err);
                
                if(files.length === 0){
                  return res.send(new Error('File metadata does not exist'));
                }
                
                var file = files[0];
                
                var rs = gfs.createReadStream({
                  _id: req.params.fileId
                });
                
                gm(rs).resize(width, height, height != null ? "!" : null).stream('png', function (err, stdout, stderr) {
                  stdout.pipe(res);
                });
            });
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