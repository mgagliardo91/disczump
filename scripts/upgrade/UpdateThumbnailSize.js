var mongoose            = require('mongoose');
var Disc            = require('../../app/models/disc.js');
var ImageCache            = require('../../app/models/imageCache.js');
var FileUtil            = require('../../app/utils/file.js');
var _ = require('underscore');
var config = require('../../config/config.js');
var async = require('async');
var Grid = require('gridfs-stream');
var async = require('async');
var gm = require('gm').subClass({ imageMagick: true });

Grid.mongo = mongoose.mongo;


var createThumbnail = function(gm, gfs, fileId, callback) {
	gfs.files.find({_id: mongoose.Types.ObjectId(fileId)}).toArray(function(err, files) {
        if(err)
            return callback(err);
        
        if(files.length === 0){
          return callback(Error.createError('File metadata does not exist.', Error.invalidDataError));
        }
        
        var file = files[0];
        
        var rs = gfs.createReadStream({
          _id: fileId
        });
        
        FileUtil.saveImage(gm, gfs, rs, {
        	mimetype: file.contentType, 
        	filename: file.filename, 
        	maxSize: config.images.thumbnailSize
        }, function(err, newFile) {
            if (err) return callback(err);
            
        	return callback(null, newFile._id);
        });
    });
}


mongoose.connect('mongodb://' + config.database.host + ':' + 
    config.database.port + '/' + config.database.db);
    
var gfs = Grid(mongoose.connection.db);
   
Disc.find({}, function(err, discs) {
	var discCount = discs.length;
    console.log('Going through [' + discCount + '] discs.');
	var i = 1;
    async.eachSeries(discs, function (disc, callback) {
        var imageArr = [];
		if (i++ % 10 === 0)
			console.log('Working disc ' + i + '/' + discCount);
        async.eachSeries(disc.imageList, function(image, cb) {
            createThumbnail(gm, gfs, image.fileId, function(err, thumbnailId) {
                if (err)
                    return cb('Error creating thumbnail. ' + err);
                
                var oldId = image.thumbnailId;
                image.thumbnailId = thumbnailId;
                
                imageArr.push(image);
                
            	gfs.remove({_id:oldId}, function (err) {
            	 	if (err)
            		  	cb('error removing thumbnail async')
            		  
            		return cb();
            	});
            });
        }, function(err) {
            if (err)
                console.log('Error within disc [' + disc._id + ']: ' + err);
            
            Disc.findOne({'_id':disc._id}, function(err, foundDisc) {
                if (err) {
                    console.log('Error finding disc again.');
                    return callback();
                }
                
                foundDisc.imageList = imageArr;
                foundDisc.save(function(err, upDisc) {
        		    if (err)
                        console.log('Error saving disc: ' + err);
                    
                    return callback();
        		});
            });
        });
    }, function(err) {
        console.log('Finished.');
        mongoose.disconnect();
    });
    
});