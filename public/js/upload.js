$(document).ready(function(){
    var template = '<div id="template" class="file-row">' +
                        '<div>' +
                            '<span class="preview text-center"><img data-dz-thumbnail /></span>' +
                        '</div>' +
                        '<div>' +
                            '<p class="name" data-dz-name></p>' +
                            '<strong class="error text-danger" data-dz-errormessage></strong>' +
                        '</div>' +
                    '</div>';
    var myDropzone = new Dropzone('#disc-img-front', { // Make the whole body a dropzone
				  url: "/target-url", // Set the url
				  thumbnailWidth: 150,
				  thumbnailHeight: 150,
				  parallelUploads: 1,
				  previewTemplate: template,
				  maxFiles: 1,
				  autoQueue: false, // Make sure the files aren't queued until manually added
				  previewsContainer: "#disc-img-front", // Define the container to display the previews
				  clickable: "#disc-img-front", // Define the element that should be used as click trigger to select files.
				  accept: function(file, done) {
                    console.log("uploaded");
                    done();
                  },
                  init: function() {
                    this.on("addedfile", function() {
                      if (this.files[1]!=null){
                        this.removeFile(this.files[0]);
                      }
                    });
                  }
    });
});