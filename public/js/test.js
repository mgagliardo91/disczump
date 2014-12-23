$(document).ready(function(){
    
    var $dropArea = $('.dropzone-area');
    createDropZone($dropArea);
});

function createDropZone($div) {
	var template = '<div class="image-item-container">' +
                        '<div class="image-item">' +
                            '<div class="image-entity">' +
                                '<img data-dz-thumbnail />' +
                            '</div>' +
                            '<div class="image-progress" data-dz-uploadprogress></div>' +
                            '<div class="image-overlay">' +
                                '<span class="image-remove" data-dz-remove><i class="fa fa-times fa-lg"></i></span>' +
                                '<div class="image-title"><span data-dz-name></span></div>' +
                                '<div class="image-size" data-dz-size></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
    
    var $imageAdd = $div.find('.image-add');
    var $container = $div.find('.image-list-container');
    var $table = $div.find('.image-list-table');
	var myDropzone = new Dropzone('.image-list-container', {
				  url: "/multi/images",
				  method: "POST",
				  thumbnailWidth: 150,
				  thumbnailHeight: 150,
				  parallelUploads: 10,
				  maxFiles: 10,
				  paramName: 'discImage',
				  previewTemplate: template,
        	      acceptedFiles: "image/*",
				  autoProcessQueue: false,
				  previewsContainer: '.image-list-table',
				  clickable: '.image-add',
				  accept: function(file, done) {
	               done();
	             },
	             init: function() {
	               this.on("addedfile", function() {
	                 if (this.files[10] != null){
	                   this.removeFile(this.files[10]);
	                 } else {
	                 	$imageAdd.insertAfter('.image-item-container:last-child');
	                 	$container.animate({scrollLeft: $table.innerWidth()}, 2000);
	                 }
	               }).on('success', function(file, response){
			            console.log(response);
			        });
	             }
	});
	
	$('#submit').click(function(){
		myDropzone.options.url = '/api/discs/' + '549895dbf1d8a5fe59b69442' + '/images';
		myDropzone.processQueue();	
	});
	
	$(document).on('mouseenter', '.image-item', function(){
		var $this = $(this);
		if (!$this.parents('.image-item-container').hasClass('dz-processing')) {
			$(this).find('.image-overlay').show();
		}
	}).on('mouseleave', '.image-item', function(){
		$(this).find('.image-overlay').hide();
	});
}