var Error = require('./error.js');
var logger = require('./logger.js');

module.exports = {
    saveImage: saveImage,
    deleteImage: deleteImage
}

function saveImage(gm, gfs, readStream, fileParams, callback) {
	var ws = gfs.createWriteStream({
                  mode: 'w',
                  content_type: fileParams.mimetype,
                  filename: fileParams.filename
              });

    ws.on('close', function (file) {
    	callback(null, file);
      });
      
    gm(readStream).autoOrient().identify({bufferStream: true}, function(err, identify) {
        try {
            var filesize = identify.Filesize.match(/^([\d.]+)([A-Z]+)$/);
            if (filesize && (filesize.length < 2 || filesize[2] != 'KB' || parseInt(filesize[1]) > 500)) {
                this.quality(90);
            }
            
            var size = identify.size;
            
            if (typeof size !== 'undefined') {
        		if (size.width > size.height) {
    	    		this.resize(size.width > fileParams.maxSize ? fileParams.maxSize : size.width);
    	    	} else {
    	    		this.resize(null, size.height > fileParams.maxSize ? fileParams.maxSize : size.height);
    	    	}
        	}
        	
            this.stream('jpeg', function (err, stdout, stderr) {
              stdout.pipe(ws);
            });
        } catch (e) {
			logger.error(e);
            callback(Error.createError('Error saving thumbnail.', Error.internalError));
        }
        
    });
}

function deleteImage(fileId, gfs, callback) {
    gfs.remove({_id:fileId}, function (err) {
	 	if (err)
		  	console.log(err);
		  	
		callback();
	});
}