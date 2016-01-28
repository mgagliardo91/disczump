var DiscController = require('./controllers/disc');
var passport = require('passport');
var logger = require('../config/logger.js').logger;
var mongoose = require('mongoose');
var Error = require('./utils/error');
var gfs;
var gm = require('gm').subClass({ imageMagick: true });
var async = require('async');

module.exports = function(app, gridFs) {
    
    gfs = gridFs;
    
    // app.route('/stitch')
    //     .get(function(req, res) {
    //         var imageList = [];
    //         var index = 0;
    //         var rsList = [];
    //         var length = 0;
            
    //         while(typeof(req.query['img' + index]) !== 'undefined') {
    //             imageList.push(req.query['img' + index++]);
    //         }
            
    //         if (!imageList.length) {
    //             return res.status(404).send(Error.createError('Unknown file identifier.', Error.objectNotFoundError));
    //         }
            
    //         async.eachSeries(imageList, function(imageItem, cb) {
    //             getFile(imageItem, function(err, file) {
    //                 if (err)
    //                     return cb();
                        
    //                 console.log(file.contentType);
    //                 console.log(file.length);
    //                 var rs = gfs.createReadStream({
    //                   _id: imageItem
    //                 });
    //                 rsList.push(rs);
    //                 cb();
    //             });
    //         }, function(err, results) {
    //             if (!rsList.length) {
    //                 return res.status(404).send(Error.createError('Unknown file identifier.', Error.objectNotFoundError));
    //             }
                
    //             var main = rsList.shift();
                
    //             gm(main).append(rsList[0]).filesize({bufferStream: true}, function(err, filesize) {
    //                 console.log(filesize);
    //                 if(err)
    //                     return res.status(404).send(Error.createError(err, Error.internalError));
                        
    //                 this.stream('jpg', function (err, stdout, stderr) {
    //                     res.writeHead(200, {
    //                       'Content-Type' : 'image/jpg',
    //                       'Content-Length' : parseInt(filesize)
    //                     });
                        
    //                     stdout.pipe(res);
    //                 });
    //             });
    //         });
    //     });
        
    app.route('/:fileId')
        .get(function(req, res) {
            
            try {
                gfs.files.find({_id:mongoose.Types.ObjectId(req.params.fileId)}).toArray(function(err, files) {
                if(err)
                    return res.status(404).send(Error.createError(err, Error.internalError));
                
                if(files.length === 0){
                    return res.status(404).send(Error.createError('Unknown file identifier.', Error.objectNotFoundError));
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
            } catch (err) {
                console.log('Error obtaining file: ' + err);
                return res.status(404).send(Error.createError(err, Error.internalError));
            }
            
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
                    return res.send(Error.createError(err, Error.internalError));
                
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

function getFile(id, callback) {
    gfs.files.find({_id:mongoose.Types.ObjectId(id)}).toArray(function(err, files) {
        if(err)
            return callback(Error.createError(err, Error.internalError));
        
        if(files.length === 0){
          return callback(Error.createError('File metadata does not exist', Error.invalidDataError));
        }
        
        callback(null, files[0]);
    });
}