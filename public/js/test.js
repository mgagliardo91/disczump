$(document).ready(function(){
    
    resizeLightbox();
    
    $(window).on('resize', resizeLightbox);
    
    $(document).on('click', '.image-view-thumbnail', function() {
	 	var src = $(this).attr('src');
		$('.image-view-main').attr('src', src);
	});

});

/*
* Resizes the lightbox based on the window screen size.
*/
function resizeLightbox() {
	var windowHeight = $(window).height();
	// Lightbox max height = 855 = 750(main image) + 100(image list height) + 5(padding)
	var lbHeight = Math.min(Math.max(windowHeight - 160, 255), 855);
	var lbWidth = lbHeight - 105; // 105 = 100(image list height) + 5(padding)
	
	$('.image-view-container').css({
		height: lbHeight + 'px',
		width: lbWidth + 'px',
		maxWidth: lbWidth + 'px'
	});
	
	$('.image-view-large').css({
		maxHeight: lbWidth,
	   	maxWidth: lbWidth,
	   	height: lbWidth,
	   	width: lbWidth
	});
	
	$('.image-main').css({
		maxHeight: lbWidth,
		maxWidth: lbWidth
	});
	
	$('.image-view-list-container').css({
	   	width: lbWidth
	});
	
	$('.image-view-list-item-container').css({
		width: lbWidth,
		maxWidth: lbWidth
	});
}
