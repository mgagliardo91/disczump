var $tagInput;
var $tagListDisplay;

var tagList = ['January', 'February', 'March'];
var discList = [];
var discs = [];

var $inventoryHeader;
var $inventoryContainer;
var refPageTop;
var refContBottom;
var isFixed = false, isHidden = false;

$(document).ready(function(){
    
    console.log('started');
    
    $inventoryHeader = $('#inventory-header');
    $inventoryContainer = $('.disc-inventory-container');
    refPageTop = $('body').outerHeight() - $('body').height() - $('nav').outerHeight();
    refContBottom = refPageTop + $inventoryContainer.outerHeight() - $inventoryHeader.outerHeight();
    
    $(window).scroll(function(){
    	var curTop = $(window).scrollTop();
    	if (!isFixed && curTop >= refPageTop) {
    		var headerTop = $inventoryHeader.offset().top;
    		$inventoryHeader.addClass('header-fixed');
    		$inventoryHeader.css({
				top: $('nav').outerHeight()
			});
			isFixed = true;
    	}
    	
    	if (isFixed &&  curTop < refPageTop) {
    		$inventoryHeader.removeClass('header-fixed');
			isFixed = false;
    	}
    	
    	if (!isHidden && curTop > refContBottom) {
    		$inventoryHeader.hide();
    		isHidden = true;
    	}
    	
    	if (isHidden && curTop < refContBottom) {
    		$inventoryHeader.show();
    		isHidden = false;
    	}
    });
    
    $('#results-header-sort').click(function(){
       var dynamicHeader = $('#disc-inventory-header-dynamic');
       if (dynamicHeader.is(':visible')) { 
            dynamicHeader.slideUp(300);   
       } else {
           dynamicHeader.slideDown(300); 
       }
    });
    
    $(window).on('resize', function(){
        resizeHeader();  
     });
    
    resizeHeader();
    
    
    
    // Sort Shit
    $('.current-sort-container').sortable({
        placeholder: 'sort-field-placeholder',
        handle: '.sort-field-arrange'
    });
    
    $(document).on('click', '.sort-field-remove', function() {
        if ($('.sort-field-container').length > 1) {
            $(this).parents('.sort-field-container').remove();
        }
    });
    
    $('.add-sort-container').mousedown(function(){
        $(this).addClass('mdown');
    }).mouseup(function(){
        $(this).removeClass('mdown');
    }).click(function(){
       $('.current-sort-container').append(createSortField()); 
    });
    
    
    $('.current-sort-container').append(createSortField()); 
});

function resizeHeader() {
	$inventoryHeader.css({
		'width': $inventoryContainer.outerWidth()
		
	});
}

function createSortField() {
    return '<div class="sort-field-container">' +
                '<div class="sort-field-arrange div-inline float-left text-center no-select"> <!-- Arrange Icon -->' +
                    '<span><i class="fa fa-bars"></i></span>' +
                '</div>' +
                '<div class="sort-field-remove div-inline float-right text-center no-select"> <!-- Remove Icon -->' +
                    '<span><i class="fa fa-times"></i></span>' +
                '</div>' +
                '<div class="sort-field-form"> <!-- Form -->' +
                    '<div class="row">' +
                        '<div>' +
                            '<form class="form-inline" role="form">' +
                                '<div class="form-group" style="margin-right: 30px">' +
                                    '<p class="form-control-static header-text">Field:</p>' +
                                    '<select class="form-control input-sm">' +
                                        '<option>Brand</option>' +
                                        '<option disabled>Loooooooooonnnggg</option>' +
                                    '</select>' +
                                '</div>' +
                                '<div class="form-group">' +
                                    '<p class="form-control-static header-text">Direction:</p>' +
                                    '<select class="form-control input-sm">' +
                                        '<option value="Ascending">Ascending</option>' +
                                        '<option value="Descending">Descending</option>' +
                                    '</select>' +
                                '</div>' +
                            '</form>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
}