module.exports = {
    saveImage: function(gm, gfs, readStream, fileParams, callback) {
    	var ws = gfs.createWriteStream({
                      mode: 'w',
                      content_type: fileParams.mimetype,
                      filename: fileParams.filename
                  });
    
        ws.on('close', function (file) {
        	callback(file);
          });
          
        gm(readStream).autoOrient().quality(90).size({bufferStream: true}, function(err, size) {
        	if (err)
        		console.log(err);
        	
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
        });
    },
    deleteImage: function(fileId, gfs, callback) {
        gfs.remove({_id:fileId}, function (err) {
		 	if (err)
			  	console.log(err);
			  	
			callback();
		});
    }
}