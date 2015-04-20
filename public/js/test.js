$(document).ready(function(){
    
	var zumpGallery = new ZumpGallery({
		galleryContainer: '.gallery-container',
		gallerySlider: '#gallery-slider',
		galleryMenu: '.gallery-menu'
	});
	
	zumpGallery.showGallery(40);

});

/*
* ZumpGallery
*/
var ZumpGallery = function(opt) {
	
	var zumpGallery = this;
	var $galleryContainer;
	var $galleryTable;
	var $gallerySlider;
	var $galleryMenu;
	var objCount = 0;
	var itemsPerRow = 6;
	
	this.init = function(opt) {
		
		if (isDef(opt.galleryContainer)) {
			$galleryContainer = $(opt.galleryContainer);
			createGallery();
		}
	}
	
	this.showGallery = function(count) {
		
		if (count < 12) {
			$gallerySlider.slider('setAttribute', 'max', Math.max(2, count));
			if (count < 6) {
				$gallerySlider.slider('setValue', Math.max(2, count));
			}
		}
		
		
		objCount = count;
		setupListeners();
		gallerySetup();
		$galleryContainer.show();
	}
	
	this.hideGallery = function() {
		$galleryContainer.hide();
		removeListeners();
	}
	
	var createGallery = function() {
		$galleryContainer.append(
			'<div class="gallery-menu">' +
	            '<span class="gallery-zoom-icon"><i class="fa fa-search-plus fa-lg"></i></span>' +
	            '<input class="gallery-slider" type="text">' +
	            '<span class="gallery-zoom-text">Items Per Row: </span><span class="gallery-row-count">10</span>' +
	        '</div>' +
	        '<table class="gallery-table">' +
	        '</table>'
		);
		
		$galleryTable = $galleryContainer.find('.gallery-table');
		$galleryMenu = $galleryContainer.find('.gallery-menu');
		$gallerySlider = $galleryContainer.find('.gallery-slider');
		$gallerySlider.slider({
			min: 2,
			max: 12,
			step: 1,
			value: 6,
			tooltip: 'hide',
			selection: 'none'
		}).on('change', function(slider) {
			itemsPerRow = slider.value.newValue;
			gallerySetup();
		});
	}
	
	var gallerySetup = function() {
		var total = 0;
		$galleryTable.empty();
		$galleryMenu.find('.gallery-row-count').text(itemsPerRow);
		
		var width = $(window).width();
		var rowCount = Math.ceil(objCount/itemsPerRow);
		var colCount = itemsPerRow;
		
		for (var i = 0; i < rowCount; i++) {
			var $row = $(createGalleryRow());
			for (var j = 0; j < colCount; j++) {
				if (total == objCount) break;
				total++;
				var $item = $(createGalleryItem());
				$row.append($item);
			}
			$galleryTable.append($row);
		}
		resizeGallery();
	}
	
	var setupListeners = function() {
		$(window).on('resize', resizeGallery);
		$(document).on('mouseenter', '.disc-gallery-item', showOverlay);
		$(document).on('mouseleave', '.disc-gallery-item', hideOverlay);
	}
	
	var removeListeners = function() {
		$(window).off('resize', resizeGallery);
		$(document).off('mouseenter', '.disc-gallery-item', showOverlay);
		$(document).off('mouseleave', '.disc-gallery-item', hideOverlay);
		
	}
	
	var showOverlay = function(e) {
		$(this).find('.disc-gallery-overlay').show();
	}
	
	var hideOverlay = function(e) {
		$(this).find('.disc-gallery-overlay').hide();
	}
	
	var resizeGallery = function() {
		var width = $(window).width();
		var rowCount = Math.ceil(objCount/itemsPerRow);
		var colCount = itemsPerRow;
		
		var itemWidth = Math.min(500, Math.floor(width / colCount * 0.99));
		
		$('.disc-gallery-item').css({
			width: itemWidth + 'px',
			height: itemWidth + 'px'
		});
	}
	
	var createGalleryRow = function() {
		return '<tr class="disc-gallery-row"></tr>';
	}
	
	var createGalleryItem = function() {
		return '<td class="disc-gallery-item">' + 
					'<div class="disc-gallery-overlay">' +
						'<div class="disc-gallery-text-container">' + 
							'<div class="disc-gallery-text-wrapper">' + 
								'<div class="disc-gallery-overlay-text no-select">Innova</div>' + 
								'<div class="disc-gallery-overlay-text no-select">Destroyer</div>' + 
							'</div>' +
						'</div>' +
					'</div>' + 
					'<div class="disc-gallery-image-container">' + 
						'<div class="disc-gallery-image">' + 
							'<img src="https://placehold.it/100x100" />' + 
						'</div>' + 
					'</div>' + 
				'</td>';
	}
	
	this.init(opt);
}