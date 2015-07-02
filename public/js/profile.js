var $searchResults;
var $searchBar;
var $filterResults;
var $filterContainer;
var $galleryContainer;
var $inventoryHeader;
var $inventoryContainer;
var $dynamicHeader;

var pageSettings = {
	tableMode: true	
}

var mySort;
var myFilter;
var myGallery;
var searchRequest;

var discList = [];
var discs = [];
var paginateOptions = {displayCount: 20, currentPage: 1, lastPage: 1};
var dropzones = [];
var changeObject = {};
var fnLock = false;

var refPageTop;
var refContBottom;
var isFixed = false, isHidden = false;
var imgArray = new Array();

var userPrefs;
var pageEvents = {};

$(document).ready(function(){
   
   /* Variables */
   
    $searchResults = $('#search-results');
    $searchBar = $('#search-all');
	$filterResults = $('#filter-results');
	$filterContainer = $('#filter-container');
	$galleryContainer = $('#gallery-container')
	$inventoryHeader = $('#inventory-header');
    $inventoryContainer = $('.disc-inventory-container');
    $dynamicHeader = $('#disc-inventory-header-dynamic');
   
    /* Initial Commands */
   
   $('.page').hide();
   
   /* Logic */
    refPageTop = $('body').outerHeight() - $('body').height() - $('nav').outerHeight();
    refContBottom = refPageTop + $inventoryContainer.outerHeight() - $inventoryHeader.outerHeight();
     
	$.ajaxSetup({ cache: true });
	$.getScript('//connect.facebook.net/en_UK/all.js', function(){
		FB.init({
		  appId: '1433417853616595',
		});
	}); 
   
   /* Event Listeners */
   
   $('.nav-sidebar > li').click(function(e){
       e.stopPropagation();
       var $this = $(this);
       var nav = $(this).attr('pg-select');
       var $page = $(nav);
       var $curPage = $('.page:visible');
       
       if (!$curPage.length) {
           if (isDef(pageEvents[$curPage.attr('id')])) {
               pageEvents[$curPage.attr('id')](false);
           }
            $page.fadeIn(100, function() {
                $this.addClass('active');
                if (isDef(pageEvents[$page.attr('id')])) {
                   pageEvents[$page.attr('id')](true);
               }
            });
            return;
       }
       
       if ($page.length && !$page.is(':visible')) {
           $curPage.fadeOut(100, function() {
               if (isDef(pageEvents[$curPage.attr('id')])) {
                   pageEvents[$curPage.attr('id')](false);
               }
               $('.nav-sidebar > li').removeClass('active');
                $page.fadeIn(100, function() {
                    $this.addClass('active');
                    if (isDef(pageEvents[$page.attr('id')])) {
                       pageEvents[$page.attr('id')](true);
                   }
                });
           });
       } else {
           $this.addClass('active').siblings().removeClass('active');
       }
       
      return false;
   });
   
   $(window).on('resize', function() {
     	console.log('resizing');
        //resizeSearch($searchResults, $searchBar, true); 
        resizeResultHeader();
    });
     
    $(window).scroll(function(){
    	var curTop = $(window).scrollTop();
    	var heightRemaining = $('body').height() - ($(window).height() - curTop);
    	console.log(heightRemaining);
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
    });
     
    $(window).click(function(e) {
    	$.each($('.hide-on-close'), function(index) {
    		if ($(this).is(':visible')) {
	     		$(this).hide();
	     	}	
     	});
     });
     
     $('#gallery-select').click(function(e) {
     });
     
     $('.nav-view').css('display', 'table');
     
     $searchBar.focusin(function(){
     	$(this).trigger('keyup');
     }).on('keyup', function(){
     	delay(function(){
	     	if ($searchBar.val().length > 0) {
	     		if (!$searchResults.is(':visible')) {
	     			$searchResults.show();
	     		}
	               doSearch();
	          } else {
	               $searchResults.hide();
	          }
		}, 200 );
     }).click(function(e) { e.stopPropagation(); });
     
     $('#search-request').click(function() {
     	$searchBar.focus();
     });
	  
	  $(document).on('click', '.result-item:not(.result-item-empty)', function(e) {
	  		e.stopPropagation();
	  		var $parent = $(this).parents('.result-section');
			var option = $parent.attr('id').match(/-([a-zA-Z]+)/)[1];
			var val = $(this).text();
			
			if (option == 'name') {
	  			$searchBar.val(val).attr('readonly', true);
	  			$searchBar.bind('click', searchLock);
	  			myFilter.filterOnly(option, val);
	  		} else {
	  			$searchBar.val('');
				myFilter.pushFilterItem(option, val, true);
	  		}
			
	  		$searchResults.hide();
	  });
	 
	 $(document).on('click', '.fa-delete-disc-item', function() {
	 	deleteConfirmationModal($(this).parents('.disc-item').attr('discid'));
	 });
	 
	 $(document).on('click', '.fa-edit-disc-item', function() {
	 	var disc = getDisc($(this).parents('.disc-item').attr('discid'));
	 	generateDiscInputForm(disc);
	 });
	 
	 $(document).on('click', '.fa-share-disc-item', function() {
	 	var disc = getDisc($(this).parents('.disc-item').attr('discid'));
	 	var winTop = ($(window).height() / 2) - (300 / 2);
        var winLeft = ($(window).width() / 2) - (600 / 2);
        window.open('http://www.facebook.com/sharer/sharer.php?app_id=1433417853616595&u=disczump.com/disc/' + disc._id + 
        	'&display=popup&ref=plugin&src=share_button', 'sharer', 'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + 600 + ',height=' + 300);
	 });
	 
	 $(document).on('click', '.fa-visible-disc-item', function() {
	 	var disc = getDisc($(this).parents('.disc-item').attr('discid'));
	 	disc.visible = !disc.visible;
	 	putDisc(disc, function(success, retData) {
	 		if (success) {
	 			discs = _.filter(discs, function(disc){
					return disc._id != retData._id;
				});
				discs.push(retData);
				console.log('Saved disc changes.');
	 			updateDiscItem(disc);
	 		} else {
	 			console.log(generateError(retData.message, 'ERROR'));
	 		}
	 	});
	 });
	 
	 $(document).on('click', '.disc-info-tag', function() {
	 	myFilter.pushFilterItem('tagList', $(this).text());
	 });
	 
	 $(document).on('click', '.disc-content-image', function(e) {
	 	var discItem = $(this).parents('.disc-item');
	 	var disc = getDisc(discItem.attr('discid'));
	 	
	 	getAllDiscImages(disc._id, function(success, images) {
	 		if (success && images.length > 0) {
	 			var zumpLightbox = new ZumpLightbox({
			 		content: {
			 			imageArray: images,
			 			defaultImage: disc.primaryImage
			 		},
			 		onCreate: function($lightbox) {
			 			console.log('Created.')
			 		},
			 		onShow: function($lightbox) {
			 			console.log('Showed.')
			 		},
			 		onHide: function() {
			 			console.log('Hidden');
			 		}
			 	});
			 	
			 	zumpLightbox.showLightbox();
	 		}
	 	});
	 });

	 $('#page-back').click(function(){
	 	paginateOptions.currentPage -= 1;	
	 	showDiscs(true);
	 });
	 
	 $('#page-forward').click(function(){
	 	paginateOptions.currentPage += 1;
	 	showDiscs(true);	
	 });
	 
	 $('#paginate-display-count').on('change', function(){
	 	var val = $(this).val();
	 	val = parseInt(val);
	 	if (_.isNaN(val)) {
	 		paginateOptions.displayCount = -1;
	 		paginateOptions.currentPage = 1;
	 	} else {
	 		paginateOptions.displayCount = parseInt(val);
	 	}
	 	
	 	showDiscs();
	 });
	 
	 $('#export-list').click(function(e){
	 	exportList();
	 });
	 
	 $('#create-disc-modal').click(function(e){
	 	generateDiscInputForm();
	 });
	
	$(document).on('click', '.image-preview:not(.active)', function(){
		var src = $(this).children('img').attr('src');
		var $blockDisplay = $(this).parents('.image-block-display');
		var $primAryimage = $blockDisplay.find('#disc-primary-image');
		
		$blockDisplay.find('.image-preview.active').removeClass('active');
		$primAryimage.attr('src', src);
		$(this).addClass('active');
	});
	
	$(document).on('mouseenter', '.image-item', function(){
		var $this = $(this);
		if (!$this.parents('.image-item-container').hasClass('dz-processing')) {
			$(this).find('.image-overlay').show();
		}
	}).on('mouseleave', '.image-item', function(){
		$(this).find('.image-overlay').hide();
	});
     
     $('#search-request').click(function() {
     	$searchBar.focus();
     });
  
    /* Library Objects */
    
    mySort = new ZumpSort({
	    sortToggle: '#results-header-sort',
	    sortContainer: '.current-sort-container',
	    addSortTrigger: '.add-sort-container',
	    sortFields: [
	        {text: 'Brand', property: 'brand', type: 'text'},
	        {text: 'Name', property: 'name', type: 'text'},
	        {text: 'Type', property: 'type', type: 'text'},
	        {text: 'Material', property: 'material', type: 'text'},
	        {text: 'Weight', property: 'weight', type: 'number'},
	        {text: 'Color', property: 'color', type: 'text'},
	        {text: 'Speed', property: 'speed', type: 'number'},
	        {text: 'Glide', property: 'glide', type: 'number'},
	        {text: 'Turn', property: 'turn', type: 'number'},
	        {text: 'Fade', property: 'fade', type: 'number'}
	    ],
	    triggerSort: showDiscs,
	    init: [
	    	{property: 'brand',sortAsc: true},
	    	{property: 'name',sortAsc: true}
    	]
	});
	
	myFilter = new ZumpFilter({
		currentFilterContainer: '#current-filter-container',
	    filterContainer: '#filter-content',
	    items: [
	        {property: 'name', hideContainer: true},
	        {text: 'Brand', property: 'brand'},
	        {text: 'Tags', property: 'tagList'},
	        {text: 'Type', property: 'type'},
	        {text: 'Material', property: 'material'},
	        {text: 'Weight', property: 'weight'},
	        {text: 'Color', property: 'color'},
	        {text: 'Speed', property: 'speed', groupText: 'Flight Numbers', groupProp: 'flightNumbers'},
	        {text: 'Glide', property: 'glide', groupText: 'Flight Numbers', groupProp: 'flightNumbers'},
	        {text: 'Turn', property: 'turn', groupText: 'Flight Numbers', groupProp: 'flightNumbers'},
	        {text: 'Fade', property: 'fade', groupText: 'Flight Numbers', groupProp: 'flightNumbers'}
	    ],
	    onFilterChange: function() {
	        updateFilter();
	    }
	});
	
	myGallery = new ZumpGallery({
		galleryContainer: '#gallery-container'
	});
    
	
     // Start on-load commands
     resizeSearch($searchResults, $searchBar, true, true);
     pageEvents['pg-gallery'] = function(showing) {
         if (showing) {
     		pageSettings.tableMode = false;
            showDiscGallery();
         } else {
     		pageSettings.tableMode = true;
         }
     }
     resizeResultHeader();
     $searchResults.hide();
     getUserPreferences(function(success, prefs) {
     	if (success) {
     		userPrefs = prefs;
     		
     		getAllDiscs(function(success, discsFromServer){
				if (success) {
					discs = discsFromServer;
					createTypePie();
					initialize();
				} else {
					alert('Unable to intialize');
				}
			 });
     	}
     });
    
    $('.page-alert').slideDown(300);
    $('.nav-sidebar > li.active').trigger('click');
    
    setTimeout(function() {
        initializePage();
    }, 200);
 
});


/*
* Initialize based on search params
*/
function initializePage() {
    console.log('initializing');
    var params = getSearchParameters();
    if (params.view) {
        $('.nav-sidebar > li[pg-select="#pg-' + params.view + '"]').trigger('click');
    }
}

/*===================================================================*/
/*                                                                   */
/*                          Dashboard                                */
/*                                                                   */
/*===================================================================*/

/*
* Locks the search bar if user clicked on actual disc item
*/
var searchLock = function(e) {
	e.stopPropagation();
	myFilter.clearFilter('name');
	$(this).attr('readonly', false).unbind('click', searchLock);
	$searchBar.trigger('keyup');
};

/*
* Global search method
*/
function doSearch() {
	var search = $searchBar.val();
	
	containSearch(search, ['name', 'brand', 'type', 'tagList'], function(prop, list) {
		if (prop == 'name') {
			updateSearchResults($('#results-name'), list);
		} else if (prop == 'brand') {
			updateSearchResults($('#results-brand'), list);
		} else if (prop == 'type') {
			updateSearchResults($('#results-type'), list);
		} else if (prop == 'tagList') {
			updateSearchResults($('#results-tagList'), list);
		}
	});
}

/*
* Shows search based on results
*/
function updateSearchResults($section, list) {
	var $output = $section.children('.result-section-output');
	$output.children('.result-item:not(.result-item-empty)').remove();
	if (list.length > 0) {
		$output.children('.result-item-empty').hide();
		_.each(list, function(result) {
			$output.append(generateResultItem(result));
		});
	} else {
		$output.children('.result-item-empty').show();
	}
}   

/*
* Filters the discs and redraws the results table
*/
function updateFilter(generateFilters) {
	discList = myFilter.filter(discs, generateFilters);
	showDiscs();
	resizeResultHeader();
}

/*
* Resizes the search results container
*/
function resizeSearch($element, $relative, relScreen, forceShow) {
	if (forceShow) {
		$element.show();
	}
	
	var leftOff = relScreen ? $relative.offset().left : $relative.position().left;
	var topOff = relScreen ? $relative.offset().top : $relative.position().top;
	
	if ($element.is(':visible')) {
		$element.css({width: $relative.outerWidth() + 'px'});
		$element.css({left: leftOff, 
		top: topOff + $relative.outerHeight()});
	}
}

/*
* Ensures the header width maintains the result view width
*/
function resizeResultHeader() {
	$inventoryHeader.css({
		'width': $inventoryContainer.outerWidth()
	});
}

/*
* Initialize function
*/
function initialize() {
	updateFilter(true);
}

/*
* Shows the gallery view
*/
function showDiscGallery() {
	var sorted = mySort.doSort(discList);
	myGallery.showGallery(sorted);
	_.each(sorted, function(disc) {
		getPrimaryDiscImage(disc.primaryImage, updateDiscImage);
	});
}

/*
* Hides the gallery view
*/
function hideDiscGallery() {
	myGallery.hideGallery();
}

/*
* Reloads a single disc item
*/
function updateDiscItem(disc) {
	$('div.disc-item[discId="' + disc._id + '"]').empty().append(generateDiscData(disc));
	getPrimaryDiscImage(disc.primaryImage, updateDiscImage);
}

/*
* Reloads the results section
*/
function showDiscs(maintainPage) {
	if (!maintainPage) {
		paginateOptions.currentPage = 1;
	}
	
	$filterResults.empty();
	var sorted = mySort.doSort(discList);
	var paged = paginate(sorted);
	_.each(paged, function(disc) {
		getPrimaryDiscImage(disc.primaryImage, updateDiscImage);
		$filterResults.append(generateDiscTemplate(disc));
	});
	updateHeader(sorted.length);
	resizeResultHeader();
}

/*
* Locates the image source and updates with the file name
*/
function updateDiscImage(success, discImage) {
	if (success) {
		var $discItem = $('div.disc-item[discId="' + discImage.discId + '"]');
		$discItem.find('.disc-content-image img').attr('src', '/files/' + discImage.thumbnailId);
		
		if (!pageSettings.tableMode) {
			myGallery.updateObject(discImage.discId, {image: discImage.fileId});
		}
	}
}

/*
* Updates the sort header
*/
function updateHeader(count) {
	$('#results-header-count').text('Results: ' + count);
	
	var $paginate = $('#paginate-nav');
	var $pageInsert = $('#page-back');
	$paginate.find('.page-dynamic').remove();
	
	var start = 1;
	var end = 5;
	
	if (paginateOptions.currentPage < 3) {
		end = Math.min(5, paginateOptions.lastPage);
	} else if (paginateOptions.currentPage > paginateOptions.lastPage - 2) {
		end = paginateOptions.lastPage;
		start = Math.max(1, paginateOptions.lastPage - 4);
	} else {
		start = paginateOptions.currentPage - 2;
		end = paginateOptions.currentPage + 2;
	}
	
	for (var i = end; i >= start; i--) {
		$pageInsert.after('<li class="page-dynamic' + (i == paginateOptions.currentPage ? ' active' : '') + '">' + i + '</li>');
	}
}

/*
* Returns the color based on the user preferences
*/
function getColorize(type) {
	if (!isDef(userPrefs.colorize)) return undefined;
	
	if (type == 'Putt/Approach') {
		return userPrefs.colorize['putter'];
	} else if (type == 'Mid-range') {
		return userPrefs.colorize['mid'];
	} else if (type == 'Fairway Driver') {
		return userPrefs.colorize['fairway'];
	} else if (type == 'Distance Driver') {
		return userPrefs.colorize['distance'];
	} else if (type == 'Mini') {
		return userPrefs.colorize['mini'];
	} else return undefined;
}

/*
* Generaes the container to hold the disc row
*/
function generateDiscTemplate(disc) {
	var discContainer = $('<div class="disc-item-container"></div>');
	var discItem = $('<div class="disc-item" discId="' + disc._id + '"></div>');
	
	discItem.append(generateDiscData(disc));
	discContainer.append(discItem);
	
	 return discContainer;
}

/*
* Creates a standard disc data row
*/
function generateDiscData(disc) {
	var tagHTML = '';
	
	_.each(disc.tagList, function(tag) {
		tagHTML = tagHTML + '<span class="disc-info-tag">' + tag + '</span>';
	});
	
	var color = getColorize(disc.type);
	
	 return '<div class="disc-colorize"' + (isDef(color) ? ' style="background-color: ' + color + '"' : '') + '>' + 
                	'</div>' +
                    '<div class="disc-content-image-container">' +
                        '<div class="disc-content-image">' +
                            '<img src="/static/logo/logo_small_faded.svg" />' +
                        '</div>' +
                    '</div>' +
                    '<div class="disc-content-action-container float-right">' +
                		'<table>' +
                			'<tbody style="text-align: center;">' +
	                            '<tr class="disc-item-actions-top">' +
	                            	'<td></td>' +
	                                '<td>' +
	                                	'<span><i class="fa fa-minus-circle fa-lg fa-dim fa-delete-disc-item"></i></span>' +
	                                '</td>' +
	                            '</tr>' +
	                            '<tr class="disc-item-actions-middle">' +
	                            	'<td></td>' +
	                                '<td>' +
	                                	'<span><i class="fa fa-pencil fa-lg fa-dim fa-edit-disc-item"></i></span>' +
	                                '</td>' +
	                            '</tr>' +
	                            '<tr class="disc-item-actions-bottom">' +
	                            	'<td>' + 
	                            		(disc.visible ?
	                            		'<span><i class="fa fa-facebook-square fa-lg fa-dim fa-share-disc-item"></i></span>' :
	                                	'') +
	                            	'</td>' +
	                                '<td>' +
	                                	(disc.visible ?
	                                	'<span><i class="fa fa-eye fa-lg fa-dim fa-visible-disc-item"></i></span>' :
	                                	'<span><i class="fa fa-eye-slash fa-lg fa-dim fa-visible-disc-item"></i></span>') +
	                                '</td>' +
	                            '</tr>' +
                           	'</tbody>' +
                        '</table>' +
                    '</div>' +
                    '<div class="disc-content-info-container">' +
                        '<div class="disc-info-main-pane">' +
                            '<div class="disc-info-left-pane div-inline float-left">' +
                                '<div class="disc-info-brand">' + (disc.brand ? disc.brand : '') + '</div>' +
                                '<div class="disc-info-name"><a target="_blank" href="/disc/' + disc._id + '">' + (disc.name ? disc.name : '') + '</a></div>' +
                            '</div>' +
                            '<div class="disc-info-right-pane disc-specs div-inline float-left">' +
                                '<div class="div-inline float-left div-split-horiz">' +
                                    '<table>' +
                                        '<tr>' +
                                            '<td class="disc-info-label">Type:</td>' +
                                            '<td class="disc-info-value">' +(disc.type ? disc.type : '') + '</td>' +
                                        '</tr>' +
                                        '<tr>' +
                                            '<td class="disc-info-label">Material:</td>' +
                                            '<td class="disc-info-value">' +(disc.material ? disc.material : '') + '</td>' +
                                        '</tr>' +
                                    '</table>' +
                                '</div>' +
                                '<div class="div-inline float-left div-split-horiz">' +
                                    '<table>' +
                                        '<tr>' +
                                            '<td class="disc-info-label">Color:</td>' +
                                            '<td class="disc-info-value">' +(disc.color ? disc.color : '') + '</td>' +
                                        '</tr>' +
                                        '<tr>' +
                                            '<td class="disc-info-label">Weight:</td>' +
                                            '<td class="disc-info-value">' + ((typeof disc.weight != 'undefined') ? disc.weight + 'g': '') + '</td>' +
                                        '</tr>' +
                                    '</table>' +
                                '</div>' +
                            '</div>' +
                            
                        '</div>' +
                        '<div style="margin-top: 10px">' +
                            '<div class="disc-info-left-pane div-inline float-left">' +
                                '<div class="disc-info-bottom">' +
                                    '<div class="disc-info-numbers">' +
                                    ((typeof disc.speed != 'undefined') ? disc.speed : '??') + ' | ' +
                                    ((typeof disc.glide != 'undefined') ? disc.glide : '??') +' | ' +
                                    ((typeof disc.turn != 'undefined') ? disc.turn : '??') + ' | ' +
                                    ((typeof disc.fade != 'undefined') ? disc.fade : '??') + '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="disc-info-right-pane div-inline float-left">' +
                                '<div class="disc-info-bottom">' +
                                    '<div class="disc-info-tags div-inline float-left">' +
                                        '<span class="disc-info-tag-label">Tags:</span>' +
                                        tagHTML +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="clearfix"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="clearfix"></div>';
}

/*
* Paginates the provided array
*/
function paginate(toPaginate) {
	var lastPage = 1;
	
	if (paginateOptions.displayCount > -1) {
		lastPage = Math.ceil((toPaginate.length / paginateOptions.displayCount));
	}
	
	paginateOptions.lastPage = lastPage;
	if (paginateOptions.currentPage > lastPage) {
		paginateOptions.currentPage = lastPage;
	}
	
	if (paginateOptions.currentPage < 1) paginateOptions.currentPage = 1;
	
	var start = (paginateOptions.currentPage - 1) * paginateOptions.displayCount;
	var end = paginateOptions.displayCount > -1 ? Math.min(toPaginate.length, start + paginateOptions.displayCount) : toPaginate.length;
	return toPaginate.slice(start, end);
}


/*
* Generates a modal popup with the specified parameters
*/
function generateModal(opt) {
	// params fns, onCreate, onShow
	
	// Remove all other modals
	$('.custom-modal').remove();
	
	// private vars
	var headerText = '';
	var bodyText = '';
	var footerText = '';
	
	// Get modal building blocks
	if (isDef(opt.header)) {
		headerText = opt.header;
	}
	
	if (isDef(opt.body)) {
		bodyText = opt.body;
	}
	
	if (isDef(opt.footer)) {
		footerText = opt.footer;
	}
	
	// Create modal
	var $modal = $('<div class="modal custom-modal fade" tabindex="-1" role="dialog" aria-hidden="true"></div>');
	$modal.html('<div class="modal-dialog">' + 
            '<div class="modal-content">' + 
              '<div class="modal-header">' + headerText +
              '</div>' + 
              '<div class="modal-body">' + bodyText + 
              '</div>' + 
              '<div class="modal-footer">' + footerText +
              '</div>' + 
            '</div>' + 
            '</div>');
            
     $('body').append($modal);
     
     // Setup events
     if (isDef(opt.fns)) {
     	_.each(opt.fns, function(fn) {
     		if (fn.name && fn.function) {
     			$modal.find('[fn-title="' + fn.name +'"]').on('click', function() {
     				fn.function($(this), $modal.find('.modal-body'), function() {
     					$modal.modal('hide');
     				});
     			});
     		}
     	});
     }
     
    // On hide event
    $modal.on('hidden.bs.modal', function (e) {
    	if (isDef(opt.onClose)) {
			opt.onClose($modal.find('.modal-body'));
		}
    	
	  	$modal.remove();
	  	$(window).off('resize', resizeModal);
	  
	});
	
	// On shown event
	$modal.on('shown.bs.modal', function (e) {
		
		resizeModal();
		
	  if (isDef(opt.onShow)) {
			opt.onShow($modal.find('.modal-body'));
		}
	});
	
	// On create event
	if (isDef(opt.onCreate)) {
		opt.onCreate($modal.find('.modal-body'));
	}
	
	// Resize based on window size
	$(window).on('resize', resizeModal);
	
	// show modal
	fnLock = false;
    $modal.modal({show: true, backdrop: 'static'});
}

/*
* Resizes the modal based on the window screen size
*/
function resizeModal() {
	var windowHeight = $(window).height();
	var headerHeight = $('.modal-header').outerHeight();
	var footerHeight = $('.modal-footer').outerHeight();
	var height = Math.max((windowHeight - headerHeight - footerHeight - 62), 120);
	
	$('.modal-body').css({
		maxHeight: height + 'px',
		overflow: 'auto'
	});
}

/*
* Exports the inventory to an excel sheet
*/
function exportList() {
	var $header = $('<div></div>').html(
		'<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
          '<h4 class="modal-title">Export List</h4>'
		);
	var $form =  $('<form class="form" role="form" autocomplete="off"></form>');
	$form.html('<div class="form-group">' + 
				'<label for="exportFileName">File Name</label>' +
				'<input type="text" class="form-control" id="exportFileName" placeholder="File Name">' +
	  		'</div>' +
	  		'<div class="radio">' +
				'<label>' +
					'<input type="radio" name="exportOptions" id="exportAll" value="all" checked>' +
					'Export All Discs' +
				'</label>' +
			'</div>' +
			'<div class="radio">' +
				'<label>' +
					'<input type="radio" name="exportOptions" id="exportFiltered" value="filtered">' +
					'Export Filtered Discs' +
				'</label>' +
			'</div>');
			
	var $footer = $('<div></div>').html(
		'<button type="button" class="btn btn-default" fn-title="close">Close</button>' + 
          '<button type="button" class="btn btn-primary" fn-title="export"><span><i class="fa fa-external-link fa-tools"></i></span>Export</button>'
		);
		
	var fns = [
				{
					name: 'close',
					function: function($btn, $inner, done) {
						done();
						console.log('Closed without exporting.');
					}
				},
				{
					name: 'export',
					function: function($btn, $inner, done) {
						var fileName = $inner.find('#exportFileName').val();
						var type = $inner.find('input:radio:checked').val();
						
						if (fileName == '') {
							var dt = new Date();
							var time = dt.getHours() + '_' + dt.getMinutes() + '_' + dt.getSeconds();
							fileName = 'DiscZump_' + time;
						}
						
						var csvContent = "data:text/csv;charset=utf-8,";
						var writeHeaders = true;
						var list = discs;
						if (type == 'filtered') {
							list = discList;
						}
						
						_.each(list, function(disc) {
							if (writeHeaders) {
								csvContent += _.map(_.keys(disc), function(key) {return key.toUpperCase();}).join(',') + '\n';
								writeHeaders = false;
							}
							
							csvContent += _.values(disc).join(',') + '\n';	
						});
						
						var encodedUri = encodeURI(csvContent);
						var link = document.createElement("a");
						link.setAttribute('href', encodedUri);
						link.setAttribute('download', fileName + '.csv');
						link.click();
						done();
					}
				}
		];
		
	generateModal($header, $form, $footer, {fns: fns});
}

/*
* Alerts the user that a disc will be deleted
*/
function deleteConfirmationModal(discId) {
	var header = '<h4 class="modal-title">WARNING!</h4>';
          
	var body =  '<p>Are you sure you want to delete this disc and all of its data?</p>';
			
	var footer = '<button type="button" class="btn btn-default" fn-title="cancel">Cancel</button>' +
		'<button type="button" id="btn-confirm-delete-disc" class="btn btn-danger" fn-title="confirm-delete" discId=' + discId + '><span><i class="fa fa-minus-circle fa-tools"></i></span>Delete Disc</button>';
		
	var fns = [
				{
					name: 'cancel',
					function: function($btn, $inner, done) {
						done();
						console.log('Canceled disc deletion.');
					}
				},
				{
					name: 'confirm-delete',
					function: function($btn, $inner, done) {
						var discId = $btn.attr('discId');
						deleteDisc(discId, function(success, data) {
							if (success) {
								discs = _.filter(discs, function(disc){
									return disc._id != data._id;
								});
								console.log('Deleted disc.');
								updateFilter(true);
							} else {
								// error logic
							}
							done();
						});
					}
				}
		];
		
	generateModal({
		header: header, 
		body: body, 
		footer: footer, 
		fns: fns
	});
}

/*
* Generates the modal containing the form to either edit/create a disc
*/
function generateDiscInputForm(disc) {
	var isEdit = isDef(disc);
	var discId = isEdit ? disc._id : '';
	
	var header = '<h4 class="modal-title">' + (isEdit ? 'Edit' : 'Create') + ' Disc</h4>';
          
    var footer = '<button type="button" class="btn btn-default" fn-title="close">Close</button>' +
		'<button type="button" class="btn btn-primary" fn-title="save" discId=' + discId + '><span><i class="fa fa-save fa-tools"></i></span>Save</button>';
		
	var form = '<form class="form-horizontal" role="form" discId="' + discId + '" autocomplete="off">' +
				'<div class="form-group">' +
	                '<label class="col-sm-2 control-label"><span class="required-field">* </span>Brand</label>' +
	                '<div class="col-sm-4">' +
	                    '<input type="text" id="disc-brand" class="form-control text-assist" param="brand">' +
	                '</div>' +
	                '<label class="col-sm-2 control-label"><span class="required-field">* </span>Name</label>' +
	                '<div class="col-sm-4">' +
	                    '<input type="text" id="disc-name" class="form-control text-assist" param="name">' +
	                '</div>' +
	            '</div>' +
	            '<div class="form-group">' +
	                '<label class="col-sm-2 control-label">Type</label>' +
	                '<div class="col-sm-4">' +
	                    '<select id="disc-type" class="form-control" param="type">' +
	                        '<option value=""' + (isEdit ? '' : 'selected') + '></option>' +
	                        '<option value="Putt/Approach">Putt/Approach</option>' +
	                        '<option value="Mid-range">Mid-range</option>' +
	                        '<option value="Fairway Driver">Fairway Driver</option>' +
	                        '<option value="Distance Driver">Distance Driver</option>' +
	                        '<option value="Mini">Mini</option>' +
	                     '</select>' +
	                '</div>' +
	                '<label class="col-sm-2 control-label">Material</label>' +
	                '<div class="col-sm-4">' +
	                    '<input type="text" id="disc-material" class="form-control text-assist" param="material">' +
	                '</div>' +
	            '</div>' +
	            '<div class="form-group">' +
	                '<label class="col-sm-2 control-label">Weight</label>' +
	                '<div class="col-sm-4">' +
	                    '<input type="number" id="disc-weight" class="form-control text-assist" param="weight">' +
	                '</div>' +
	                '<label class="col-sm-2 control-label">Color</label>' +
	                '<div class="col-sm-4">' +
	                    '<input type="text" id="disc-color" class="form-control text-assist" param="color">' +
	                '</div>' +
	            '</div>' +
	            '<div class="form-group">' +
	                '<label class="col-sm-2 control-label">Speed</label>' +
	                '<div class="col-sm-4">' +
	                    '<input type="number" id="disc-speed" class="form-control text-assist" param="speed">' +
	                '</div>' +
	                '<label class="col-sm-2 control-label">Glide</label>' +
	                '<div class="col-sm-4">' +
	                    '<input type="number" id="disc-glide" class="form-control text-assist" param="glide">' +
	                '</div>' +
	            '</div>' +
	            '<div class="form-group">' +
	                '<label class="col-sm-2 control-label">Turn</label>' +
	                '<div class="col-sm-4">' +
	                    '<input type="number" id="disc-turn" class="form-control text-assist" param="turn">' +
	                '</div>' +
	                '<label class="col-sm-2 control-label">Fade</label>' +
	                '<div class="col-sm-4">' +
	                    '<input type="number" id="disc-fade" class="form-control text-assist" param="fade">' +
	                '</div>' +
	            '</div>' +
	            '<div class="form-group tag-input-group">' +
	                '<label class="col-sm-2 control-label">Tags</label>' +
	                '<div class="col-sm-10">' +
	                    '<div style="position:relative">' +
	                        '<div class="input-group add-disc-tag-container">' +
	                            '<input type="text" class="form-control add-disc-tag">' +
	                            '<span class="input-group-btn">' +
	                                '<button class="btn btn-default add-custom-tag" type="button"><span><i class="fa fa-angle-double-down"></i></span></button>' +
	                            '</span>' +
	                        '</div>' +
	                    '</div>' +
	                '</div>' +
	                '<div class="col-sm-10 col-sm-offset-2">' +
	                    '<div class="tag-list-container">' +
	                    '</div>' +
	                '</div>' +
	            '</div>' +
	            '<div class="form-group">' +
	                '<label class="col-sm-2 control-label">Notes</label>' +
	                '<div class="col-sm-10">' +
	                    '<textarea id="disc-notes" class="form-control create-disc-textarea" rows="3" param="notes"></textarea>' +
	                '</div>' +
	            '</div>' +
	            '<div class="form-group">' +
	                '<label class="col-sm-2 control-label">Public</label>' +
	                '<div class="col-sm-10">' +
	                    '<input type="checkbox" name="visible" param="visible" id="disc-visibility">' +
	                '</div>' +
	            '</div>' +
	            '<div class="image-accordian-area">' +
	            	(isEdit ? 
		            '<div class="current-images-accordion-container">' +
		                '<div class="current-images-accordion-header">' +
		                    '<label class="current-images-label no-select" aria-expanded="true" aria-controls="collapseCurrentImages"><span><i class="fa fa-chevron-right fa-tools"></i></span>Current Pictures</label>' +
		            	'</div>' +
		            	'<div class="current-images-panel-collapse collapse" id="collapseCurrentImages">' +
				            '<div class="image-list">' +
				                '<div class="image-list-container image-list-container-simple">' +
				                    '<div class="image-list-table" id="existing-image-list">' +
				                    '</div>' +
				                '</div>' +
				            '</div>' +
				        '</div>' +
			        '</div>' : '') +
		            '<div class="add-images-accordion-container">' +
		                '<div class="add-images-accordion-header">' +
		                    '<label class="add-images-label no-select" aria-controls="collapseDropzone"><span><i class="fa fa-chevron-right fa-tools"></i></span>Add Pictures</label>' +
		                '</div>' +
		                '<div class="dropzone-panel-collapse collapse" id="collapseDropzone">' +
		                    '<div class="image-list dropzone-area">' +
		                        '<div class="image-list-container" id="dropzone-container">' +
		                            '<div class="image-list-table" id="dropzone-previews">' +
		                                '<div class="image-item-container image-add" id="dropzone-trigger">' +
		                                    '<div class="image-item">' +
		                                        '<div class="image-entity">' +
		                                            '<span class="image-default"><i class="fa fa-camera-retro fa-5x"></i></span>' +
		                                        '</div>' +
		                                    '</div>' +
		                                '</div>' +
		                            '</div>' +
		                        '</div>' +
		                    '</div>' +
		                '</div>' +
		            '</div>' +
	            '</div>' +
			'</form>';
	
	var modalParams = (isEdit ? getEditParams() : getCreateParams());
	
	generateModal({
		header: header,
		body: form,
		footer: footer,
		fns: modalParams.fns,
		onCreate: function($inner) {
		    createDropZone($inner.find('.dropzone-area'));
		    
			$inner.find('.add-images-label').click(function(e) {
		        var $chevron = $(this).find('.fa');
		        if ($chevron.hasClass('fa-chevron-right')) {
		            $chevron.removeClass('fa-chevron-right').addClass('fa-chevron-down');
		        } else {
		            $chevron.removeClass('fa-chevron-down').addClass('fa-chevron-right');
		        }
		        $('#collapseDropzone').collapse('toggle');
		    });
			
			modalParams.onCreate($inner);
		},
		onShow: function($inner) {
			var $tagInput = $inner.find('.add-disc-tag');
			var $addCustomTag = $inner.find('.add-custom-tag');
			var $tagContainer = $inner.find('.tag-list-container');
			var tagTextAssist;
			
		    $addCustomTag.click(function(){
		    	if ($tagInput.val().length > 0) {
					$tagContainer.append(generateTagItem($tagInput.val()));
		    		$tagInput.val('');
		    	}
		    });
			
			$inner.on('click', '.tag-item-remove', function(){
				var $parent = $(this).parents('.tag-item');
				$parent.remove();
				
				if ($tagContainer.is(':empty')){
					$tagContainer.empty();
				}
			});
			
			/*
			* Setup Autocomplete Handlers
			*/
			
			$inner.find('.text-assist').each(function(index) {
				new ZumpTextAssist({
			        inputElement: $(this),
			        searchProp: $(this).attr('param'),
			        items: function() { return discs; }, 
			        onSelection: function(item) {
			        	console.log('Selected: ' + item);
			        }
			    });
			});
			
			tagTextAssist = new ZumpTextAssist({
				inputElement: $tagInput,
				searchProp: 'tagList',
				items: function() { return discs; }, 
		        onSelection: function(item, reset) {
		        	if (item.length > 0) {
		        		$tagContainer.append(generateTagItem(item));
		    			reset();
		        	}
		        }
			});
			
			modalParams.onShow($inner);
		},
		onClose: function($inner) {
			
			var $dropzone = $inner.find('.dropzone-area');
			var id = $dropzone.attr('dropzoneid');
			var dropzone = dropzones.splice(id, 1)[0];
			
			modalParams.onClose($inner);
		}
	});
}

/*
* Generates the object needed to issue a edit disc modal
*/
function getEditParams() {
	return {
		fns: [
				{
					name: 'close',
					function: function($btn, $inner, done) {
						if (fnLock) return;
						
						done();
					}
				},
				{
					name: 'save',
					function: function($btn, $inner, done) {
						if (fnLock) return;
						
						fnLock = true;
						$inner.find('div.alert').remove();
						
						var disc = createDisc($inner, changeObject.curDisc);
						
						console.log(JSON.stringify(disc));
						
						putDisc(disc, function(success, retData) {
							if (success) {
								discs = _.filter(discs, function(disc){
									return disc._id != retData._id;
								});
								discs.push(retData);
								console.log('Saved disc changes.');
								
								if (isDef(changeObject.imageRemovals)) {
									_.each(changeObject.imageRemovals, function(imageId) {
										deleteImage(imageId, function(success, data) {
											if (success) {
												console.log('Deleted image with id [' + data._id + '].');
											}
										});
									});
								}
								
								var $dropzone = $inner.find('.dropzone-area');
								var id = $dropzone.attr('dropzoneid');
								var dropzone = dropzones[id];
								if (dropzone && dropzone.getAcceptedFiles().length > 0) {
									dropzone.options.url = '/api/discs/' + retData._id + '/images';
									dropzone.on('queuecomplete', function() {
										getDiscById(retData._id, function(err, disc) {
											discs = _.filter(discs, function(curDisc){
												return curDisc._id != disc._id;
											});
											discs.push(disc);
											updateFilter(true);
										});
										
										done();
									})
									
									dropzone.processQueue();
								} else {
									done();
									updateFilter(true);
								}
							} else {
								$inner.prepend(generateError(retData.message, 'ERROR'));
							}
						});
					}
				}
		],
		onCreate : function($inner) {
			changeObject = {};
			
			var discId = $inner.find('form').attr('discId');
			changeObject.curDisc = copyDisc(discId);
			
			var disc = changeObject.curDisc;
			var tagList = disc['tagList'];
			var $tagContainer = $inner.find('.tag-list-container');
			var $imageContainer = $inner.find('#existing-image-list');
			
	
			$('#disc-brand').val(getSafe(disc.brand, ''));
			$('#disc-name').val(getSafe(disc.name, ''));
			$('#disc-material').val(getSafe(disc.material, ''));
			$('#disc-type').val(getSafe(disc.type, ''));
			$('#disc-weight').val(getSafe(disc.weight, ''));
			$('#disc-color').val(getSafe(disc.color, ''));
			$('#disc-speed').val(getSafe(disc.speed, ''));
			$('#disc-glide').val(getSafe(disc.glide, ''));
			$('#disc-turn').val(getSafe(disc.turn, ''));
			$('#disc-fade').val(getSafe(disc.fade, ''));
			$('#disc-notes').val(getSafe(disc.notes, ''));
			
			$('#disc-visibility').bootstrapSwitch('state', getSafe(disc.visible, false));
			
			$inner.find('.current-images-label').click(function(e) {
		        var $chevron = $(this).find('.fa');
		        if ($chevron.hasClass('fa-chevron-right')) {
		        	if ($('#collapseCurrentImages').find('.image-item-container').length > 0) {
			            $chevron.removeClass('fa-chevron-right').addClass('fa-chevron-down');
			        	$('#collapseCurrentImages').collapse('show');
		        	}
		        } else {
		            $chevron.removeClass('fa-chevron-down').addClass('fa-chevron-right');
		        	$('#collapseCurrentImages').collapse('hide');
		        }
		    });
		    
		    $imageContainer.on('click', '.image-remove', function() {
				var $imageContainer = $inner.find('#existing-image-list');
		    	var $parent = $(this).parents('.image-item-container');
		    	var imageId = $parent.attr('imageid');
		    	var disc = changeObject.curDisc;
		    	
		    	$parent.remove();
		    	
		    	if (!isDef(changeObject.imageRemovals)) {
		    		changeObject.imageRemovals = [];
		    	}
		    	
		    	if (disc.primaryImage == imageId) {
		    		var $images = $imageContainer.find('.image-item-container');
		    		if ($images.length) {
		    			var $newPrimary = $images.first();
		    			disc.primaryImage = $newPrimary.attr('imageid');
		    			updateExistingImage(disc.primaryImage);
		    		} else {
		    			disc.primaryImage = '';
		    		}
		    	}
		    	
		    	changeObject.imageRemovals.push(imageId);
		    	
		    	console.log(disc);
		    	console.log(changeObject);
		    });
		    
		    $imageContainer.on('click', '.image-make-primary', function() {
		    	var $parent = $(this).parents('.image-item-container');
		    	var imageId = $parent.attr('imageid');
		    	var disc = changeObject.curDisc;
		    	
		    	disc.primaryImage = imageId;
		    	updateExistingImage(imageId);
		    });
			
		    _.each(tagList, function(tag) {
		    	$tagContainer.append(generateTagItem(tag));
		    });
			
			getAllDiscImages(discId, function(success, images) { 
				if (success) {
					var primaryImage = disc.primaryImage;
					_.each(images, function(image) {
						$imageContainer.append(generateImageItem(primaryImage, image, true));
					})
				}	
			});
		},
		onShow : function() {
			
		},
		onClose: function($inner) {
			fnLock = false;
		}
	}
}

/*
* Locates an image source and updates with correct file path
*/
function updateExistingImage(imageId) {
	var $curPrimary = $('.primary-image-banner-static');
	
	if ($curPrimary.length) {
		var $parent = $curPrimary.parents('.image-overlay-static');
		
		$parent.siblings('.image-overlay').find('.image-remove').after(
			'<div class="image-make-primary" title="Make Primary">' +
			'<i class="fa fa-star-o fa-lg"></i>' +
			'</div>'
			);
		
		$parent.remove();
	}
	
	var $image = $('.image-item-container[imageid="' + imageId + '"]');
	if ($image.length) {
		var $overlay = $image.find('.image-overlay');
			
		$overlay.find('.image-make-primary').remove();
		$overlay.after('<div class="image-overlay-static">' +
												'<div class="primary-image-banner-static">' +
													'<i class="fa fa-star fa-lg"></i>' +
												'</div>' +
											'</div>');
	}
}

/*
* Generates the object needed to issue a create disc modal
*/
function getCreateParams() {
	return {
		fns: [
				{
					name: 'close',
					function: function($btn, $inner, done) {
						done();
					}
				},
				{
					name: 'save',
					function: function($btn, $inner, done) {
						$inner.find('div.alert').remove();
						var disc = createDisc($inner);
						postDisc(disc, function(success, retData) {
							if (success) {
								discs.push(retData);
								var $dropzone = $inner.find('.dropzone-area');
								var id = $dropzone.attr('dropzoneid');
								var dropzone = dropzones[0];
								if (dropzone && dropzone.getAcceptedFiles().length > 0) {
									dropzone.options.url = '/api/discs/' + retData._id + '/images';
									dropzone.on('queuecomplete', function() {
										$inner.prepend(generateSuccess(retData.brand + ' ' + retData.name + ' was successfully added.'));
										getDiscById(retData._id, function(err, disc) {
											discs = _.filter(discs, function(curDisc){
												return curDisc._id != disc._id;
											});
											discs.push(disc);
											updateFilter(true);
										});
										$inner.find('form').trigger("reset");
										
										$('#dropzone-trigger').siblings().remove();
										dropzone.disable();
										dropzone.enable();
									})
									
									dropzone.processQueue();
								} else {
									$inner.prepend(generateSuccess(retData.brand + ' ' + retData.name + ' was successfully added.'));
									updateFilter(true);
									$('#createDiscForm').trigger("reset");
								}
							} else {
								$inner.prepend(generateError(retData.message, 'ERROR'));
							}
						});
					}
				}
		],
		onCreate : function($inner) {
			$('#disc-visibility').bootstrapSwitch('state', false);
		},
		onShow : function($inner) {
			
		},
		onClose: function($inner) {
		
		}
	}
}

/*
* Creates a disc based on a HTML form
*/
function createDisc($form, disc) {
	if (!isDef(disc)) {
		disc = {};
	}
	
	var $fields = $form.find('input');
	$.each($fields, function(index) {
		var $field = $(this);
		if (hasAttr($field, 'param')) {
			if ($field.is(':checkbox')) {
				disc[$field.attr('param')] = $field.prop('checked');
			} else {
				disc[$field.attr('param')] = $field.val();
			}
		}
	});
	
	$fields = $form.find('select');
	$.each($fields, function(index) {
		var $field = $(this);
		disc[$field.attr('param')] = $field.val();	
	});
	
	$fields = $form.find('textarea');
	$.each($fields, function(index) {
		var $field = $(this);
		disc[$field.attr('param')] = $field.val();	
	});
	
	var tags = [];
	$fields = $form.find('.tag-item');
	$.each($fields, function(index) {
		var $field = $(this);
		tags.push($field.text().trim());
	});
	disc['tagList'] = _.unique(tags);
	
	return disc;
	
}

/*
* Generates the HTML for a search result item
*/
function generateResultItem(item) {
	return '<div class="result-item">' + item +
    		'<span class="glyphicon glyphicon-leaf pull-left" aria-hidden="true"></span>' + 
		'</div>';
}

/*
* Generates the HTML for a tag result
*/
function generateTagResult(item) {
	return '<li class="tag-list-item" tabindex="0">' +
        '<span><i class="fa fa-tag"></i></span>' +
        item +
    '</li>';
}

/*
* Generates the HTML for a tag
*/
function generateTagItem(item) {
	return '<div class="tag-item" tagVal="' + item +  '">' +
		'<p class="tag-item-text">' + item + ' <span class="tag-item-remove"><i class="fa fa-times"></i></span></p>' +
		'</div>';
}

/*
* Generates an image item for a 
*/
function generateImageItem(primaryImage, image) {
	return '<div class="image-item-container" imageid="' + image._id + '">' +
					'<div class="image-item">' +
						'<div class="image-entity">' +
							'<img src="/files/' + image.thumbnailId +'" class="fit-parent">' +
						'</div>' +
						(primaryImage == image._id ? 
						'<div class="image-overlay">' +
							'<span class="image-remove"><i class="fa fa-times fa-lg"></i></span>' +
                        '</div>' +
                        '<div class="image-overlay-static">' +
							'<div class="primary-image-banner-static"><i class="fa fa-star fa-lg"></i></div>' +
                        '</div>' :
						'<div class="image-overlay">' +
							'<span class="image-remove"><i class="fa fa-times fa-lg"></i></span>' +
							'<div class="image-make-primary" title="Make Primary"><i class="fa fa-star-o fa-lg"></i></div>' +
						'</div>') +
					'</div>' +
				'</div>'; 
}

/*
* Creates a dropzone area for image upload
*/
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
	var myDropzone = new Dropzone('#' + $container.attr('id'), {
				  url: "/api/discs",
				  method: "POST",
				  thumbnailWidth: 100,
				  thumbnailHeight: 100,
				  parallelUploads: 10,
				  maxFiles: 10,
				  paramName: 'discImage',
				  previewTemplate: template,
        	      acceptedFiles: "image/*",
				  autoProcessQueue: false,
				  previewsContainer: '#' + $table.attr('id'),
				  clickable: '#' + $imageAdd.attr('id'),
				  accept: function(file, done) {
				  	console.log(file.type);
	               done();
	             },
	             init: function() {
	               this.on("addedfile", function() {
	                 if (this.files[10] != null){
	                   this.removeFile(this.files[10]);
	                 } else {
	                 	$imageAdd.insertAfter('#dropzone-previews > .image-item-container:last-child');
	                 	$container.animate({scrollLeft: $table.innerWidth()}, 2000);
	                 }
	               }).on('success', function(file, response){
			            console.log(response);
			        });
	             }
	});
	
	dropzones.push(myDropzone);
	$div.attr('dropzoneId', dropzones.length - 1);
}


/* Global Methods */

/*
* Returns the current search params
*/
function getSearchParameters() {
      var prmstr = window.location.search.substr(1);
      return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
}

/*
* Transforms a string to an object
*/
function transformToAssocArray( prmstr ) {
    var params = {};
    var prmarr = prmstr.split("&");
    for ( var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split("=");
        params[tmparr[0]] = tmparr[1];
    }
    return params;
}

/*
* Excutes a function after a specified period of time
*/
var delay = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();

/*
* Checks to see if an element has an attribute
*/
function hasAttr($elem, attribute) {
	var attr = $elem.attr(attribute);
	return (typeof attr !== typeof undefined && attr !== false);
}

/*
* Returns a list of properties for the given disc list
*/
function getProperties(prop) {
	var list = [];
	if (discs.length && _.isArray(discs[0][prop])) {
		var arrList = _.pluck(discs, prop);
		_.each(arrList, function(arr) { 
			list = list.concat(arr);	
		});
	} else {
		list = _.pluck(discs,  prop);
	}
	
	return _.uniq(list);
}

/*
* Checks to see if an object contains a property
*/
function containSearch(val, properties, callback) {
	_.each(properties, function(prop) {
		callback(prop, checkContains(val, prop));
	});
}

/*
* Checks to see if a property contains the value
*/
function checkContains(val, prop){
	if (!val || !prop) return [];
	var filtered = _.filter(getProperties(prop), function(item) {
		return item.toLowerCase().indexOf(val.toLowerCase()) >= 0;	
	});
	return filtered;
}

/*
* Generates a information message
*/
function generateInfo(message, title) {
	
	return generateMessage('info', message, title);
}

/*
* Generates an error message
*/
function generateError(message, title) {
	
	return generateMessage('danger', message, title);
}

/*
* Generates a success message
*/
function generateSuccess(message, title) {
	
	return generateMessage('success', message, title);
}

/*
* Generates a standard message based on arguments
*/
function generateMessage(type, message, title) {
	
	return '<div class="alert alert-' + type + '" role="alert">' +
		        		'<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
		        		'<strong>' + (title ? title + ': ' : '') + '</strong>' + message +
		    		'</div>';
}

/*
* Returns a disc based on the id
*/
function getDisc(id) {
	return _.first(_.where(discs, {'_id' : id}));
}

/*
* Creates a copy of a disc item
*/
function copyDisc(id) {
	var disc = getDisc(id);
	var newDisc = undefined;
	
	if (disc) {
		newDisc = {};
		
		for (var param in disc) {
			newDisc[param] = disc[param];
		}
	}
	
	return newDisc;
}

/*===================================================================*/
/*                                                                   */
/*                          Statistics                               */
/*                                                                   */
/*===================================================================*/
function createTypePie() {
    var discList = _.groupBy(discs, 'type');
    var data = [];
    
    for(var group in discList) {
        data.push({
           label: group,
           y: discList[group].length,
           legendText: group
        });
    }
    
    $("#discByType").CanvasJSChart({ 
		title: { 
			text: "Discs by Type",
			fontSize: 24
		},
		width: 600,
		axisY: { 
			title: "Products in %" 
		}, 
		legend :{ 
			verticalAlign: "center", 
			horizontalAlign: "right" 
		}, 
		data: [ 
		{ 
			type: "pie", 
			showInLegend: true, 
			toolTipContent: "{label} <br/> {y} discs", 
			indexLabel: "#percent%", 
			dataPoints: data
		} 
		] 
	});
}

function createBrandPie() {
    var discs = _.groupBy(discList, 'brand');
    var data = [];
    console.log(discs);
    
    for(var group in discs) {
        data.push({
           label: group,
           y: discs[group].length,
           legendText: group
        });
    }
    
    $("#discByBrand").CanvasJSChart({ 
		title: { 
			text: "Discs by Brand",
			fontSize: 24
		},
		width: 600,
		axisY: { 
			title: "Products in %" 
		}, 
		legend :{ 
			verticalAlign: "center", 
			horizontalAlign: "right" 
		}, 
		data: [ 
		{ 
			type: "pie", 
			showInLegend: true, 
			toolTipContent: "{label} <br/> {y} discs", 
			indexLabel: "#percent%", 
			dataPoints: data
		} 
		] 
	});
}

/*===================================================================*/
/*                                                                   */
/*                     Library Objects                               */
/*                                                                   */
/*===================================================================*/

/*
* Name: ZumpGallery
* Date: 04/07/2015
*/
var ZumpGallery = function(opt) {
	
    //----------------------\
    // Javascript Objects
    //----------------------/
    
	var zumpGallery = this;
	var objCount = 0;
	var itemsPerRow = 6;
	var objList = [];
	
    //----------------------\
    // JQuery Objects
    //----------------------/
    
	var $galleryContainer;
	var $galleryTable;
	var $gallerySlider;
	var $galleryMenu;
	
	//----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialize with options
    */
	this.init = function(opt) {
		
		if (isDef(opt.galleryContainer)) {
			$galleryContainer = $(opt.galleryContainer);
			createGallery();
		}
	}
	
	/*
	* Shows the gallery
	*/
	this.showGallery = function(objects) {
	    removeListeners();
	    
		var count = objects.length;
		objList = objects;
		
		// Setup slider based on element count
		if (count < 12) {
			$gallerySlider.slider('setAttribute', 'max', Math.max(2, count));
		} else {
			$gallerySlider.slider('setAttribute', 'max', 12);
		}
		
		if (count < 6) {
			$gallerySlider.slider('setValue', Math.max(2, count));
			itemsPerRow = Math.max(2, count);
		} else {
			$gallerySlider.slider('setValue', 6);
			itemsPerRow = 6;
		}
		
		
		objCount = count;
		setupListeners();
		$galleryContainer.show();
		gallerySetup();
	}
	
	/*
	* Hides the gallery
	*/
	this.hideGallery = function() {
		$galleryContainer.hide();
		removeListeners();
	}
	
	/*
	* Updates an item
	*/
	this.updateObject = function(objId, params) {
		var $galleryItem = $('.disc-gallery-item[objId="' + objId + '"]');
		
		if (params.image) {
			$galleryItem.find('.disc-gallery-image > img').attr('src', '/files/' + params.image);
			var galItem = _.first(_.where(objList, {'_id' : objId}));
			galItem.galImage = '/files/' + params.image;
		}
	}
	
	//----------------------\
    // Private Functions
    //----------------------/
    
    /*
    * Generates the required fields for the gallery
    */
	var createGallery = function() {
		$galleryContainer.append(
			'<div class="gallery-menu">' +
	            '<span class="gallery-zoom-icon"><i class="fa fa-search-plus fa-lg"></i></span>' +
	            '<input class="gallery-slider" type="text">' +
	            '<span class="gallery-zoom-text">Items Per Row: </span><span class="gallery-row-count"></span>' +
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
	
	/*
	* Generates the items within the gallery
	*/
	var gallerySetup = function() {
		var total = 0;
		$galleryTable.empty();
		$galleryMenu.find('.gallery-row-count').text(itemsPerRow);
		
		console.log($galleryContainer.width());
		var width = $galleryContainer.width();
		var rowCount = Math.ceil(objCount/itemsPerRow);
		var colCount = itemsPerRow;
		
		for (var i = 0; i < rowCount; i++) {
			var $row = $(createGalleryRow());
			for (var j = 0; j < colCount; j++) {
				if (total == objCount) break;
				
				var $item = $(createGalleryItem(objList[total]));
				$row.append($item);
				
				total++;
			}
			$galleryTable.append($row);
		}
		resizeGallery();
	}
	
	/*
	* Generates a gallery row
	*/
	var createGalleryRow = function() {
		return '<tr class="disc-gallery-row"></tr>';
	}
	
	/*
	* Generates a gallery item
	*/
	var createGalleryItem = function(obj) {
		return '<td class="disc-gallery-item" objId="' + obj._id +'">' + 
					'<div class="disc-gallery-overlay">' +
						'<div class="disc-gallery-text-container">' + 
							'<div class="disc-gallery-text-wrapper">' + 
								'<div class="disc-gallery-overlay-text no-select">' + getSafe(obj.brand, '') + '</div>' + 
								'<div class="disc-gallery-overlay-text no-select">' + getSafe(obj.name, '') + '</div>' + 
							'</div>' +
						'</div>' +
					'</div>' + 
					'<div class="disc-gallery-image-container">' + 
						'<div class="disc-gallery-image">' + 
							'<img src="' + getSafe(obj.galImage, '/static/logo/logo_small_faded.svg') + '" />' + 
						'</div>' + 
					'</div>' + 
				'</td>';
	}
	
	/*
	* Adds the required event listeners
	*/
	var setupListeners = function() {
		$(window).on('resize', resizeGallery);
		$(document).on('mouseenter', '.disc-gallery-item', showOverlay);
		$(document).on('mouseleave', '.disc-gallery-item', hideOverlay);
		$(document).on('click', '.disc-gallery-item', showPublicView);
	}
	
	/*
	* Destroys the event listeners
	*/
	var removeListeners = function() {
		$(window).off('resize', resizeGallery);
		$(document).off('mouseenter', '.disc-gallery-item', showOverlay);
		$(document).off('mouseleave', '.disc-gallery-item', hideOverlay);
		$(document).off('click', '.disc-gallery-item', showPublicView);
		
	}
	
	var showPublicView = function(e) {
		var id = $(this).attr('objid');
		var win = window.open('/disc/' + id, '_blank');
  		win.focus();
	}
	
	/*
	* Function to show the hover overlay
	*/
	var showOverlay = function(e) {
		$(this).find('.disc-gallery-overlay').show();
	}
	
	/*
	* Function to hide the hover overlay
	*/
	var hideOverlay = function(e) {
		$(this).find('.disc-gallery-overlay').hide();
	}
	
	/*
	* Function to resize gallery based on screen size
	*/
	var resizeGallery = function() {
	    console.log('resizing');
		var width = $galleryContainer.width();
		var rowCount = Math.ceil(objCount/itemsPerRow);
		var colCount = itemsPerRow;
		
		var itemWidth = Math.min(500, Math.floor(width / colCount * 0.99));
		
		$('.disc-gallery-item').css({
			width: itemWidth + 'px',
			height: itemWidth + 'px',
			maxWidth: itemWidth + 'px',
			maxHeight: itemWidth + 'px'
		});
		
		$('.disc-gallery-item').find('img').css({
			maxWidth: itemWidth + 'px',
			maxHeight: itemWidth + 'px'
		})
	}
	
	this.init(opt);
}

/*
* Name: ZumpLightbox
* Date: 03/02/2015
*/
var ZumpLightbox = function(opt) {
	// params fns, onCreate, onShow
	
	
    //----------------------\
    // Javascript Objects
    //----------------------/
	var lightboxContent = {
		imageArray : [],
		defaultImage : ''
	};
	
	var onHideEvent;
	var onShowEvent;
	var onCreateEvent;
	
	//----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialize with options
    */
    this.init = function(opt) {
    	
    	// Get lightbox building blocks
		if (isDef(opt.content)) {
			lightboxContent = opt.content;
		}
		
		// On hide event
	    if (isDef(opt.onHide)) {
	    	onHideEvent = opt.onHide;
	    }
	    
	    // On show event
	    if (isDef(opt.onShow)) {
	    	onShowEvent = opt.onShow;
	    }
	    
	    // On create event
	    if (isDef(opt.onCreate)) {
	    	onCreateEvent = opt.onCreate;
	    }
    }
	
	this.showLightbox = function() {
		$('.lightbox').remove();
		var $lightbox = $('<div class="lightbox backdrop click-to-close no-select"></div>');
		$lightbox.html(generateLightboxHtml());
		$lightbox.hide();
    	$('body').append($lightbox);
    	
		startListeners();
    	
    	if (isDef(onCreateEvent)) {
    		onCreateEvent($lightbox);
    	}
    	
    	resizeLightbox();
    	
    	$('body').css('overflow', 'hidden');
    	
    	$lightbox.fadeIn(200, function() {
    		onShowEvent($lightbox);
    	});
    	
    	resizeLightbox();
    	
		$(window).on('resize', resizeLightbox);
		$(document).on('keyup', closeLightbox);
	} 
	
	/*
	* Generates global lightbox html
	*/
	function generateLightboxHtml() {
		var imageList = '';
		var defaultFileId = '';
		var isSelected = false;
		
		imgArray = [];
		
		_.each(lightboxContent.imageArray, function(img) {
			if(img._id == lightboxContent.defaultImage) { 
				defaultFileId = img.fileId;
				isSelected = true;
		    }
			
			imageList = imageList + 
				'<div class="image-view-list-item" lbid="' + img._id + '">' +
					(isSelected ? '<div class="image-view-thumbnail-selected"></div>' : '') +
		        	'<img class="image-view-thumbnail" src="/files/' + img.thumbnailId + '" />' +
		        '</div>';
		    
		    isSelected = false;
		    
		    var preImage = new Image();
		    preImage.src = '/files/' + img.fileId;
		    imgArray.push(preImage);
		});
		
		if (defaultFileId == "") {
			defaultFileId = lightboxContent.imageArray.first().fileId;
		}
		
		return  '<div class="x-container absolute-right">' +
					'<p class="lightbox-close click-to-close">&times</p>' +
				'</div>' +
				'<div class="image-view-container">' +
		            '<div class="image-view-large">' +
		                '<img class="image-view-main" src="/files/' + defaultFileId + '" />' +
		            '</div>' +
		            '<div class="image-view-list-container">' +
		                '<div class="image-view-list-scroll scroll-left absolute-left" style="display: none;">' +
		                    '<i class="fa fa-3x fa-chevron-left"></i>' +
		                '</div>' +
		                '<div class="image-view-list-scroll scroll-right absolute-right" style="display: none;">' +
		                    '<i class="fa fa-3x fa-chevron-right"></i>' +
		                '</div>' +
		                '<div class="image-view-list-item-container">' +
		                    '<div class="image-view-list">' +
		                        imageList +
		                    '</div>' +
		                '</div>' +
		            '</div>' +
		        '</div>';
	}
	
	function startListeners() {
		
		$(document).on('click', '.lightbox.backdrop', backdropCloseEvent);
		$(document).on('click', '.image-view-list-item', changeMainImageEvent);
		$(document).on('click', '.image-view-list-scroll', scrollImageListEvent);
		$(document).on('keydown', arrowKeyScrollEvent);
		$(document).on('click', '.lightbox-close', backdropCloseEvent);
		
		$('.image-view-list-container, .image-view-list-scroll').mouseover(function() {
			if ($('.image-view-list').width() > $('.image-view-list-item-container').width()) {
				$('.image-view-list-scroll').show();
			}	
		});
		
		$('.image-view-list-container').mouseout(function() {
			$('.image-view-list-scroll').hide();
		});
	}
	
	function stopListeners() {
		$(document).off('click', backdropCloseEvent);
		$(document).off('click', changeMainImageEvent);
		$(document).off('click', scrollImageListEvent);
		$(document).off('keydown', arrowKeyScrollEvent);
		$(document).off('click', backdropCloseEvent);
	}
	
	var backdropCloseEvent = function(e) {
		var $element = $(e.target);
		if ($element.hasClass('click-to-close')) {
    		$('body').css('overflow', 'auto');
			$(this).fadeOut(200, function() {
				if (isDef(onHideEvent)) {
					hideLightbox();
				}
				$(this).remove();
			});
		}
	}
	
	var changeMainImageEvent = function(e) {
		e.stopImmediatePropagation();
		var $this = $(this);
		var id = $this.attr('lbid');
		var img = _.findWhere(lightboxContent.imageArray, {_id: id});
		if (img) {
			changeMainImage(img, $this);
		}
		return false;
	};
	
	var scrollImageListEvent = function(e) {
	    var $scrollButton = $(this);
	    var $imageViewList = $('.image-view-list');
	    if ($scrollButton.hasClass('scroll-left')) {
	    	scrollLeft($imageViewList);
	    }
	    if ($scrollButton.hasClass('scroll-right')) {
	    	scrollRight($imageViewList);
	    }
	};
	
	var arrowKeyScrollEvent = function(e) {
			var $imageViewList = $('.image-view-list');
			var $selectedImage = $('.image-view-thumbnail-selected').first().parent();
			var $nextImage = $selectedImage.next();
			var $prevImage = $selectedImage.prev();
			var rightMin = $('.image-view-list-container').width() - 100;
			
			if (e.which == 37) { // left arrow key
				if ($prevImage.length) {
					var id = $prevImage.attr('lbid');
					var img = getNewImage(id);
					changeMainImage(img, $prevImage);
					if (($prevImage.position().left + $imageViewList.position().left) < 0) {
						scrollLeft($imageViewList);
					}
				}
			}
			if (e.which == 39) { // right arrow key
				if ($nextImage.length) {
					var id = $nextImage.attr('lbid');
					var img = getNewImage(id);
					changeMainImage(img, $nextImage);
					if ($nextImage.position().left > rightMin) {
						scrollRight($imageViewList);
					}
				}
			}
		};
	
	function scrollLeft($imageViewList) {
		var leftPos = Math.min($imageViewList.position().left + 103, 0);
		$imageViewList.css('left', leftPos);
	}
	
	function scrollRight($imageViewList) {
		var rightDelta = $imageViewList.width() - $('.image-view-list-item-container').width();
    	var newPos = Math.max(-1 * rightDelta, $imageViewList.position().left - 103);
    	$imageViewList.css('left', newPos);
	}
	
	function getNewImage(id) {
		return _.findWhere(lightboxContent.imageArray, {_id: id});
	}
	
	function changeMainImage(img, $selectedItem) {
		$('.image-view-large > img').attr('src', '/files/' + img.fileId);
		$('.image-view-thumbnail-selected').remove();
		$selectedItem.prepend('<div class="image-view-thumbnail-selected"></div>');
	}
	
	function hideLightbox() {
		stopListeners();
		onHideEvent();
	}
	
	function closeLightbox(e) {
		if (e.keyCode == 27)  { // ESC
			var $lightbox = $('.lightbox');
		
			$lightbox.fadeOut(200, function() {
				if (isDef(onHideEvent)) {
					hideLightbox();
				}
				
				$lightbox.remove();
			});
		}
	}
	
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
		
		$('.image-view-main').css({
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
		
		$('.lightbox').css('top', $(document).scrollTop());
	}
	
	//----------------------\
    // Start
    //----------------------/
    this.init(opt);
}



/*
* Name: ZumpSort
* Date: 01/07/2015
*/
var ZumpSort = function(opt) {
    
    //----------------------\
    // Javascript Objects
    //----------------------/
    var zumpSort = this;
    var sort = [];
    var triggerSort;
    
    //----------------------\
    //JQuery Objects
    //----------------------/
    var $sortToggle;
    var $sortContainer;
    var $addSortTrigger;
    
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialization based on options
    */
    this.init = function(opt) {
        
        /*
        * Option configuration
        */
        
        // No options passed
        if (!isDef(opt)) return;
        
        // Set sort toggle
        if (isDef(opt.sortToggle)) {
            $sortToggle = $(opt.sortToggle);
        }
        
        // Set sort container
        if (isDef(opt.sortContainer)) {
            $sortContainer = $(opt.sortContainer);
            
            $sortContainer.sortable({
                placeholder: 'sort-field-placeholder',
                handle: '.sort-field-arrange',
                update: function(event, ui) {
                	updateSortFields();
                	triggerSort();
                }
            });
        }
        
        // Set add sort trigger
        if (isDef(opt.addSortTrigger)) {
            $addSortTrigger = $(opt.addSortTrigger);
        }
        
        // Set sort trigger
        if (isDef(opt.triggerSort)) {
            triggerSort = opt.triggerSort;
        }
        
        // Set sort fields
        if (isDef(opt.sortFields)) {
            sort = [];
            _.each(opt.sortFields, function(sortField) {
                if (isDef(sortField.property)) {
                    var field = {sortProp: sortField.property, sortOn: false, sortAsc: true, sortOrder: -1};
                    field.sortText = getSafe(sortField.text, sortField.property);
                    field.sortType = getSafe(sortField.type, 'text');
                    sort.push(field);
                }
            });
        }
        
        /*
        * Listeners/Events
        */
        
        // Toggle Sort Container
        $sortToggle.click(function(){
	       if ($dynamicHeader.is(':visible')) { 
	            $dynamicHeader.slideUp(300);   
	       } else {
	           $dynamicHeader.slideDown(300); 
	       }
	    });
        
        // Add Sort Field
        $addSortTrigger.mousedown(function(){
            $(this).addClass('mdown');
        }).mouseup(function(){
            $(this).removeClass('mdown');
        }).click(function(){
           addSortField();
           triggerSort();
        });
        
        // Remove Sort Field
        $(document).on('click', '.sort-field-remove', function() {
            if ($('.sort-field-container').length > 1) {
                $(this).parents('.sort-field-container').remove();
        		updateSortFields();
                triggerSort();
            }
        });
        
        // Arrange Sort Field Styling
        $(document).on('mousedown', '.sort-field-arrange', function(){
            $(this).addClass('mdown');
        }).on('mouseup', '.sort-field-arrange', function(){
            $(this).removeClass('mdown');
        });
        
        // Change for Option Select
        $(document).on('change', '.sort-option-select', function(){
        	var val = $(this).val();
        	var sorter = getSorter(val);
        	if (sorter.sortOn) {
        		sorter = getSorterByIndex($(this).parents('.sort-field-container').index());
        		$(this).val(sorter.sortProp);
        		return;
        	}
        	
        	updateSortFields();
        	triggerSort();
        });
        
        // Change for Direction Select
        $(document).on('change', '.sort-option-direction', function(){
        	updateSortFields();
        	triggerSort();
        });
        
        if (opt.init) {
        	_.each(opt.init, function(initField) {
        		addSortField(true, initField.property, initField.sortAsc);
        	})
        }
    }
    
    /*
    * Sorts an array based on a sorter object
    */
    this.genericSort = function(sorter, array) {
    	if (sorter.sortType == 'number') {
    		array = _.sortBy(array, function(obj) { return parseInt(obj[sorter.sortProp])});
    	} else {
    		array = _.sortBy(array, function(obj) {
    			return obj[sorter.sortProp].toLowerCase();
    		});
    	}
    	
    	if (!sorter.sortAsc) {
    		array = array.reverse();
    	}
    	
    	return array;
    }
    
    /*
    * Sorts a provided array using the current sort configuration
    */
    this.doSort = function(arr) {
    	var toSort = _.sortBy(_.where(sort, {sortOn : true}), 'sortOrder');
    	return groupAndSort(arr, toSort, 0);
    }
    
    //----------------------\
    // Private Functions
    //----------------------/
    
    
    var simpleSort = function(sorter, arr) {
    	return zumpSort.genericSort(sorter, arr);
    }
    
    /*
    * Recursive Sort Routine
    */
    var groupAndSort = function(sorted, toSort, i) {
    	if (i == toSort.length) {
    		sorted = zumpSort.genericSort(toSort[i-1], sorted);
    		return sorted;
    	}
    	
    	var sorter = toSort[i];
    	
    	if (i == 0) {
    		sorted = zumpSort.genericSort(sorter, groupAndSort(sorted, toSort, i + 1));
    		return sorted;
    	} else {
    		var grouper = toSort[i-1];
    		var grouped = _.groupBy(sorted, function(obj) { return obj[grouper.sortProp]; });
    		var newArray = [];
    		_.each(grouped, function(valArray) {
    			valArray = zumpSort.genericSort(sorter, groupAndSort(valArray, toSort, i + 1));
    			newArray = newArray.concat(valArray);
    		});
    		sorted = newArray;
    		return sorted;
    	}
    }
    
    /*
    * Get Sorter By Sort Order
    */
    var getSorterByIndex = function(index) {
    	return _.first(_.where(sort, {'sortOrder': index}));
    }
    
    /*
    * Get Sorter By Property
    */
    var getSorter = function(property) {
    	return _.first(_.where(sort, {'sortProp': property}));
    }
    
    
    /*
    * Get Sorts that are not turned on
    */
    var getAvailableSorts = function() {
    	return _.filter(sort, function(sorter) {
    		return !sorter.sortOn;
    	})
    }
    
    /*
    * Generates the HTML to add a new sort field
    */
    var createSortField = function() {
    	var optionHTML = '';
    	
    	_.each(sort, function(sortOption) {
    		optionHTML = optionHTML + '<option value="' + sortOption.sortProp + '">' + sortOption.sortText + '</option>';
    	});
    	
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
                                        '<select class="form-control input-sm sort-option-select">' +
                                            optionHTML +
                                        '</select>' +
                                    '</div>' +
                                    '<div class="form-group">' +
                                        '<p class="form-control-static header-text">Direction:</p>' +
                                        '<select class="form-control input-sm sort-option-direction">' +
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
    
    /*
    * Adds a new sort field to the sort container
    */
    var addSortField = function(quiet, property, isAsc) {
        var availableSorts = getAvailableSorts();
        
        if (availableSorts.length == 0) {
        	return;
        }
        
        $sortContainer.append(createSortField());
        var $sortField = $sortContainer.find('.sort-field-container:last-child');
        
        var sorter = availableSorts[0];
        
        if (isDef(property)) {
        	reqSorter = getSorter(property);
        	if (!reqSorter.sortOn) sorter = reqSorter;
        }
        
        
        $sortField.find('.sort-option-select').val(sorter.sortProp);
        
        if (isDef(isAsc)) {
        	$sortField.find('.sort-option-direction').val(isAsc ? 'Ascending' : 'Descending');
        }
        
        updateSortFields();
        
        if (!isDef(quiet) || !quiet) $sortField.find('.sort-option-select').trigger('change');
    }
    
    /*
    * Updates the sort array using the current sort fields
    */
    var updateSortFields = function() {
        
        // Reset sort
        _.each(sort, function(sortOption) {
    		sortOption.sortOn = false;
    		sortOption.sortOrder = -1;
    	})
    	
    	// Update Sort
    	$('.sort-field-container').each(function(i) {
    		sortFieldChange($(this), i);
    	});
    }
    
    /*
    * Uses the sort field values to update the sort object
    */
    var sortFieldChange = function($sortField, i) {
    	var option = $sortField.find('select.sort-option-select').val();
    	var order = $sortField.find('select.sort-option-direction').val() == 'Ascending';
    	
    	updateSort(option, true, order, i);
    }
    
    /*
    * Updatse a sort object with provided params
    */
    var updateSort = function(option, enable, isAsc, index) {
    	var sorter = getSorter(option);
    	if (sorter !== undefined) {
    		if (isDef(enable)) sorter.sortOn = enable;
    		if (isDef(isAsc)) sorter.sortAsc = isAsc;
    		if (isDef(index)) {
    			sorter.sortOrder = index;
    		} else {
    			sorter.sortOrder = -1;
    		}
    	}
    }
    
    //----------------------\
    // Construction
    //----------------------/
    this.init(opt);
}

/*
* Name: ZumpFilter
* Date: 01/07/2015
*/
var ZumpFilter = function(opt) {
    
    //----------------------\
    // Javascript Objects
    //----------------------/
    var filters = {};
    var filterItems = [];
    var filterChangeEvent;
    
    //----------------------\
    //JQuery Objects
    //----------------------/
    var $filterContainer;
    var $currentFilterContainer;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialization based on options
    */
    this.init = function(opt) {
        
        /*
        * Option configuration
        */
        
        // No options passed
        if (!isDef(opt)) return;
        
        if (isDef(opt.currentFilterContainer)) {
        	$currentFilterContainer = $(opt.currentFilterContainer);
        	$currentFilterContainer.append('<div class="clear-all-filters text-center"><u>Clear All</u></div>' +
                        						'<div class="current-filter-item-container"></div>');
            $currentFilterContainer.hide();
        }
        
        if (isDef(opt.filterContainer)) {
            $filterContainer = $(opt.filterContainer);
        }
        
        // Set filter array
        if (isDef(opt.items)) {
        	filterItems = opt.items;
        	console.log(filterItems);
            _.each(opt.items, function(item) {
                if (isDef(item.property)) {
                    // Create your div to add to screen using data
                    if (!item.hideContainer) createFilterItem(item);
                    
                    // Create your array based on data
                    filters[item.property] = [];
                }
            });
        }
        
        // Set filter change event
        if (isDef(opt.onFilterChange)) {
            filterChangeEvent = opt.onFilterChange;
        }
        
        /*
        * Listeners/Events
        */
        $(document).on('click', '.filter-option:not(.filter-option-static)', function(e){
			e.stopPropagation();
			
			var $parent = $(this).parents('.filter-item-parent');
			var option = $parent.attr('id').match(/-([a-zA-Z]+)/)[1];
			var val = $(this).attr('filterOn');
			var filterHeading = _.findWhere(filterItems, {property: option}).text;
			
			if (!_.contains(filters[option], val)) {
				$(this).append('<span class="glyphicon glyphicon-ok pull-right" aria-hidden="true"></span>');
				filters[option].push(val);
				updateCurrentFilters({
					option: option,
					val: val,
					fn: 'add',
					filterHeading: filterHeading
				});
			} else {
				$(this).children('.glyphicon').remove();
				filters[option] = _.without(filters[option], val);
				updateCurrentFilters({
					option: option,
					val: val,
					fn: 'remove'
				});
			}
			
			if (isDef(filterChangeEvent)) filterChangeEvent();
	    });
	    
	    $(document).on('click', '.clear-all-filters', function(e){
	    	$currentFilterContainer.slideUp(300, function() {
	    		$('.current-filter-item-container').children('.current-filter-item').each(function() {
	    			triggerClick($(this).attr('curFilterId')); 
	    		});
	    		$currentFilterContainer.find('.current-filter-item-container').empty();
	    		$('.filter-title').removeClass('current-filter-shown').addClass('current-filter-hidden');
	    	});
	    });
	    
	    $(document).on('click', '.current-filter-item-remove', function(e){
	    	var $currentFilterItem = $(this).closest('.current-filter-item');
	    	if ($currentFilterItem.siblings().length == 0) { 
	    		$currentFilterContainer.slideUp(300, function() {
	    			triggerClick($currentFilterItem.attr('curFilterId'));
	    			$currentFilterItem.remove();
	    			$('.filter-title').removeClass('current-filter-shown').addClass('current-filter-hidden');
	    		});
	    	} else {
	    		$currentFilterItem.slideUp(300, function() {
	    			triggerClick($currentFilterItem.attr('curFilterId'));
		    		$currentFilterItem.remove();
	    		});
	    	}
	    }); 
	  
	  	$(document).on('click', '.filter-option-multi', function(e){
			if ($(e.target).attr('class') == 'filter-option') {
			return;
			}
			
			var $this = $(this);
			var $itemGroup = $this.children('.filter-option-group');
			   
			if ($this.hasClass('filter-option-multi-closed')) {
			   $itemGroup.slideDown(300, function(){
			        $this.addClass(('filter-option-multi-open'));
			   });
			   $this.removeClass('filter-option-multi-closed');
			} else {
			   $itemGroup.slideUp(300, function(){
			        $this.addClass('filter-option-multi-closed');
			   });
			   $this.removeClass('filter-option-multi-open');
			}
		});
     
    	 $(document).on('click', '.panel-heading', function(){
			var $this = $(this);
			var $panelBody = $this.siblings('.panel-body');
			var $glyph = $this.children('.glyphicon');
			
			if ($this.hasClass('panel-open')) {
			   $panelBody.slideUp(300, function(){
			        $glyph.removeClass('glyphicon-minus');
			        $glyph.addClass('glyphicon-plus');
			        $this.addClass('panel-closed');
			   });
			   $this.removeClass('panel-open');
			} else if ($this.hasClass('panel-closed')) {
			   $panelBody.slideDown(300, function(){
			         $glyph.removeClass('glyphicon-plus');
			        $glyph.addClass('glyphicon-minus');
			        $this.addClass('panel-open');
			   });
			   $this.removeClass('panel-closed');
			}
		});
		
		/*
		* Start Events
		*/
		$('.filter-option-multi').trigger('click');
		$('.panel-heading').trigger('click');
        
    }
    
    /*
    * Trigger update of the filter
    */
    this.filter = function(arr, generateFilters) {
    	if (generateFilters) generateAllFilters(arr);
    	return filterList(arr);
    }
    
    /*
    * Add item to filter on
    */
    this.filterOnly = function(property, value) {
    	if (isDef(filters[property])) {
    		for (var filterProp in filters) {
	    		clearFilterItems(filterProp);
	    	}
	    	
	    	this.pushFilterItem(property, value);
    	}
    }
    
    
    /*
    * Add item to filter on
    */
    this.pushFilterItem = function(property, value, clearFirst) {
    	if (isDef(filters[property])) {
    		
    		if (clearFirst) {
    			clearFilterItems(property);
    		}
    		
	    	var $filterItem = $('#filter-' + property);
	    	
	    	if ($filterItem.length) {
	    		if (!_.contains(filters[property], value)) {
	    			var $filterOption = $filterItem.find('div.filter-option[filteron="' + value + '"]');
	    		
		    		if ($filterOption.length) {
		    			$filterOption.trigger('click');
		    		}
	    		}
	    	} else {
	    		if (!_.contains(filters[property], value)) {
		    		filters[property].push(value);
		    		if (isDef(filterChangeEvent)) filterChangeEvent();
	    		}
	    	}
    	}
    }
    
    /*
    * Remove item from the filter
    */
    this.removeFilterItem = function(property, value) {
    	if (isDef(filters[property]) && _.contains(filters[property], value)) {
    		filters[property] = _.without(filters[property], value);
	    	if (isDef(filterChangeEvent)) filterChangeEvent();
    	}
    }
    
    /*
    * Clear filter
    */
    this.clearFilter = function(property) {
    	if (isDef(filters[property])) {
    		filters[property] = [];
    		if (isDef(filterChangeEvent)) filterChangeEvent();
    	}
    }
    
    /*
    * Clear all filters
    */
    this.clearFilters = function() {
    	for (var filterProp in filters) {
    		filters[filterProp] = [];
    	}
    	if (isDef(filterChangeEvent)) filterChangeEvent();
    }
    
    
    //----------------------\
    // Private Functions
    //----------------------/
    
    var updateCurrentFilters = function(args) {
    	if (!args.val.length || args.val === 'undefined') args.val = "- None -";
    	var $currentFilterItemContainer = $('.current-filter-item-container');
    	var $currentFilterOptionVal = $('.current-filter-item[curFilterId="current-filter-' + args.option + '-' + args.val + '"]');
    	if (args.fn === 'add') {
    		if ($currentFilterContainer.is(':hidden')) {
    			var $addFilterItemHtml = $('<div class="current-filter-item" curFilterId="current-filter-' + args.option + '-' + args.val + '">' +
					                                '<span class="current-filter-item-text pull-left"><b>' + args.filterHeading + ':</b> ' + args.val + '</span>' +
					                                '<span class="pull-right"><i class="fa fa-times current-filter-item-remove"></i></span>' +
					                                '<div class="clearfix"></div>' +
				                            	'</div>');
				$currentFilterItemContainer.append($addFilterItemHtml);
				$('.filter-title').removeClass('current-filter-hidden').addClass('current-filter-shown');
				$currentFilterContainer.slideDown(300);
			} else {
				var $addFilterItemHtml = $('<div class="current-filter-item" curFilterId="current-filter-' + args.option + '-' + args.val + '">' +
					                                '<span class="current-filter-item-text pull-left"><b>' + args.filterHeading + ':</b> ' + args.val + '</span>' +
					                                '<span class="pull-right"><i class="fa fa-times current-filter-item-remove"></i></span>' +
					                                '<div class="clearfix"></div>' +
				                            	'</div>').hide();
    			$currentFilterItemContainer.append($addFilterItemHtml);
    			$addFilterItemHtml.slideDown(300);
			}
    	} else if (args.fn === 'remove') {
    		if (($currentFilterOptionVal.length == 1) && ($currentFilterOptionVal.siblings('.current-filter-item').length == 0)) {
    			$currentFilterContainer.slideUp(300, function() {
    				$('.filter-title').removeClass('current-filter-shown').addClass('current-filter-hidden');
    				$currentFilterOptionVal.remove();
    			});
    		} else {
    			$currentFilterOptionVal.slideUp(300, function() {
    				$currentFilterOptionVal.remove();
    			});
    		}
    	}
    }
    
    var triggerClick = function(curFilterId) {
    	var optionVal = curFilterId.substring(15);
    	var option = optionVal.match(/([a-zA-z])+/)[0];
    	var val = optionVal.match(/-(.+)/)[1];
    	if (val === "- None -") val = "";
    	$('#filter-content').find('#filter-' + option).find('.filter-option[filteron="' + val + '"]').trigger('click');
    }
    
    var clearFilterItems = function(property) {
    	var $filterItem = $('#filter-' + property);
    	if ($filterItem.length) {
    		$filterItem.find('div.filter-option .glyphicon').remove();
    	}
    	
    	filters[property] = [];
    }
    
    
    /*
    * Create Filter Panel
    */
    var createFilterPanel = function(property, text, isGroup) {
        var emptyItem = '<div class="filter-option filter-option-static">' +
                                'No Items' +
                            '</div>';
        var $filterPanel  = $('<div class="panel panel-default filter-item"></div>');
        
        $filterPanel.attr('id', 'filter-container-' + property);
        $filterPanel.html('<div class="panel-heading panel-open">' + text + 
                            '<span class="glyphicon glyphicon-minus pull-right" aria-hidden="true"></span>' +
                        '</div>' +
                        '<div class="panel-body' + (!isGroup ? ' filter-item-parent" id="filter-' + property + '"' : '"' ) + '>' +
                            (!isGroup ? emptyItem : '') + 
                        '</div>');
                        
        return $filterPanel;
    }
    
    /*
    * Generates and adds the HTML for a new filter item
    */
    var createFilterItem = function(item) {
        var $filterPanel = undefined;
        var exists = false;
        var isGroup = isDef(item.groupProp);
        
        // Check if group already exists
        if (isGroup) {
            var $groupDiv = $('#filter-container-' + item.groupProp);
            if ($groupDiv.length) {
                $filterPanel = $groupDiv;
                exists = true;
            }
        }
        
        if (!isDef($filterPanel)) {
            $filterPanel = createFilterPanel(isGroup ? item.groupProp : item.property, 
                isGroup ? getSafe(item.groupText, item.groupProp) : getSafe(item.text, item.property), 
                isGroup);
        }
        
        var $panelBody = $($filterPanel).find('.panel-body');
        
        if (isGroup) {
            $panelBody.append('<div class="filter-option-multi filter-option-multi-open">' +
                                    getSafe(item.text, item.property) +
                                    '<span class="glyphicon glyphicon-screenshot pull-right" aria-hidden="true"></span>' +
                                    '<div class="filter-option-group filter-item-parent" style="display: block;" id="filter-' + item.property + '">' +
                                        '<div class="filter-option filter-option-static" style="display: none;">' +
                                            'No Items' +
                                        '</div>' +
                                '</div>');
        }
        
        if (!exists) $filterContainer.append($filterPanel);
    }
    
    /*
    * Generates the filter items within each filter
    */
    var generateAllFilters = function(arr) {
        for (var filterProp in filters) {
            generateFilters(filterProp, arr);
        }
    }
    
    /*
    * Generates the filter items within a filter
    */
    var generateFilters = function(property, arr) {
        var items = getProperties(property, arr);
        var $filterBody = $('#filter-' + property);
        
        // Get unique filter items based on property
    	items = _.sortBy(items, function(i) {
    		if (_.isNumber(i)) {
    			return parseInt(i);
    		}
    		if (_.isString(i)) {
    			if (i == '') {
    				return undefined;
    			} else {
    			    return i.toLowerCase();
    			}
    		}
    		return i;
    	});
    	
    	$filterBody.find('div.filter-option:not(".filter-option-static")').remove();
    	if (items.length > 0) {
    		$filterBody.find('div.filter-option-static').hide();
    		_.each(items, function(item) {
    			$filterBody.append(generateFilterOption(item));
    		});
    	} else {
    		$filterBody.find('div.filter-option-static').show();
    	}
    	
    	var toRemove = [];
    	_.each(filters[property], function(item) {
    		var $filter = $filterBody.find('div.filter-option[filterOn="' + item + '"]');
    		if ($filter.length > 0) {
    			$filter.append('<span class="glyphicon glyphicon-ok pull-right" aria-hidden="true"></span>');
    		} else {
    			toRemove.push(item);
    		}
    	});
    	
    	filters[property] = _.reject(filters[property], function(item) {
    			return _.contains(toRemove, item);
    	});
    	
    }
    
    /*
    * Returns a div containing the filter option item
    */
    var generateFilterOption = function(option) {
    	var optionText = option;
    	
    	if(option === '' || typeof option === 'undefined') {
    		optionText = '- None -';
    	}
    	
    	return '<div class="filter-option" filterOn="' + option + '">' + optionText + '</div>';
    }
    
    /*
    * Filters the provided array based on the defined filters
    */
    var filterList = function(arr) {
    	return _.filter(arr, function(obj) {
    		for (var property in filters) {
    			if (filters[property].length > 0) {
    				if (_.has(obj, property)) {
    					if (_.isArray(obj[property])) {
    						var hasProp = false;
    						_.each(obj[property], function(propVal) {
    							if (_.contains(filters[property], String(propVal))) {
    								hasProp = true;
    							}	
    						});
    						if (!hasProp) {
    							return false;
    						}
    					} else {
    						if (!(_.contains(filters[property], String(obj[property])))) {
    							return false;
    						}
    					}
    				} else {
    					if (!_.contains(filters[property], 'undefined')) {
    						return false;
    					}
    				}
    			}
    		}
    		return true;
    	});
    }
    
    /*
    * Returns a unique list of values for an array at a specific property
    */
    var getProperties = function(prop, arr) {
    	var list = [];
    	if (arr.length && _.isArray(arr[0][prop])) {
    		var arrList = _.pluck(arr, prop);
    		_.each(arrList, function(arr) { 
    			list = list.concat(arr);	
    		});
    	} else {
    		list = _.pluck(arr,  prop);
    	}
    	
    	return _.uniq(list);
    }
    
    
    //----------------------\
    // Construction
    //----------------------/
    
    this.init(opt);
}


/*
* Name: ZumpTextAssist
* Date: 01/07/2015
*/
var ZumpTextAssist = function(opt) {
    
    //----------------------\
    // Javascript Objects
    //----------------------/
    var zumpTextAssist = this;
    var resultList;
    var property = '';
    var currentSearch = '';
    var onSelection;
    var tabTrigger = false;
    
    
    //----------------------\
    //JQuery Objects
    //----------------------/
    var $input;
    var $dropdown;
    var $dropdownList;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialization based on options
    */
    this.init = function(opt) {
        
        /*
        * Grab input element from options
        */
        if (isDef(opt.inputElement)) {
        	if (opt.inputElement instanceof jQuery) {
        		$input = opt.inputElement
        	} else if (_.isString(opt.intputElement)) {
            	$input = $(opt.inputElement);
        	}
            createDropdown();
        }
        
        /*
        * Grab search property from options
        */
        if (isDef(opt.searchProp)) {
            property = opt.searchProp;
        }
        
        /*
        * Grab current set of items
        */
        if (isDef(opt.items)) {
            if (_.isFunction(opt.items)) {
                resultList = opt.items;
            }
        }
        
        /*
        * Grab on enter event callback
        */
        if (isDef(opt.onSelection)) {
        	if (_.isFunction(opt.onSelection)) {
        		onSelection = opt.onSelection;
        	}
        }
        
        /*
        * Resize result container dropdown on resize of page
        */
        $(document).on('resize', function(){
           resizeResultContainer(); 
        });
        
        /*
        * Stop normal propagation on Up, Down, and Enter
        */
        $input.on('keydown', function(e) {
	    	var code = e.keyCode || e.which;
	    	var $curActive = $dropdownList.find('.dropdown-list-item.active');
	    	
	    	if (code == 13 || code == 38 || code == 40) {
		    	e.stopImmediatePropagation();
		    	return false;
	    	}
	    	
	    	else if (code == 9 && $curActive.length) {
	    		tabTrigger = true;
		    	e.stopImmediatePropagation();
		    	return false;
	    	}
	    	
	    	else if (code == 9) {
	    		setResultsVisibility(false);
	    	}
	    })
	    
	    /*
	    * Key Events within input box
	    */
	    .on('keyup', function(e){
	    	var code = e.keyCode || e.which;
	    	
	    	/*
	    	* Enter key - select active result item
	    	*/
	    	if (code == 13 || (code == 9 && tabTrigger)) {
	    		var $curActive = $dropdownList.find('.dropdown-list-item.active');
		        if ($curActive.length) {
		        	updateInput($curActive.attr('result'), true);
		        }
		        
		        if (onSelection) {
	        		onSelection($input.val(), zumpTextAssist.resetInput);
		        }
		        
		        tabTrigger = false;
			 	e.preventDefault();
      			return false;
	    	}
	    	
	    	/*
	    	* Up/Down keys - select prev/next result item
	    	*/
	    	else if (code == 38 || code == 40) {
			 	var $curActive = $dropdownList.find('.dropdown-list-item.active');
			 	var $nextActive;
			 	
			 	if ($curActive.length == 0) {
			 	    $nextActive = code == 38 ? 
			 	    	$dropdownList.find('.dropdown-list-item').last() : 
			 	    	$dropdownList.find('.dropdown-list-item').first();
			 	} else {
			 	    $curActive.removeClass('active');
			 	    $nextActive = code == 38 ? $curActive.prev() : $curActive.next();
			 	}
			 	
			 	if ($nextActive.length > 0) {
			    	$nextActive.addClass('active');
			    	updateScroll($nextActive);
			    	$input.val($nextActive.attr('result'))
			 	} else {
			 		$input.val(currentSearch);
			 	}
			 	
			 	e.preventDefault();
			 	return false;
			 }
			 
			 /*
			 * All other keys
			 */
			 else {
			     updateInput($input.val());
			 }
			 
	    })
	    
	    /*
	    * Show results on click
	    */
	    .on('click', function(e){
	    	e.preventDefault();
	    	updateInput($input.val());
	    	return false;
	    })
	    
	    /*
	    * Hide results on leave
	    */
        .on('focusout', function(e){
        	if ($(e.relatedTarget)[0] != $dropdown[0] && !$dropdownList.has(e.relatedTarget).length > 0) {
        		setResultsVisibility(false);
        	}
        	
        	e.preventDefault();
        	e.stopPropagation();
	    	return false;
        });
        
        /*
        * Click event on a result item
        */
        $dropdownList.on('click', '.dropdown-list-item', function(){
            updateInput($(this).attr('result'), true);
            
            if (onSelection) {
	        	onSelection($input.val(), zumpTextAssist.resetInput);
	        }
	        
        	$input.focus();
        });
        
        /*
	    * Hide results on leave
	    */
        $dropdown.on('focusout', function(e){
        	if ($(e.relatedTarget)[0] != $input[0] && !$dropdownList.has(e.relatedTarget).length > 0) {
        		setResultsVisibility(false);
        	}
        	
        	e.preventDefault();
        	e.stopPropagation();
	    	return false;
        });
        
	    /*
	    * Start up events
	    */
        resizeResultContainer();
    }
    
    this.resetInput = function() {
    	updateInput('', true);
    }
    
    
    //----------------------\
    // Private Functions
    //----------------------/
    
    /*
    * Update Results Container Scroll Position
    */
    var updateScroll = function($activeResult) {
    	var curTop = $dropdown.scrollTop();
    	var curBottom = $dropdown.height();
    	var resultTop = $activeResult.position().top;
    	var resultBottom = resultTop  + $activeResult.outerHeight();
    	
    	if (resultTop < curTop) { 
    		$dropdown.scrollTop(resultTop);	
    	} else if (resultBottom > curBottom) {
    		$dropdown.scrollTop(curTop + (resultBottom - curBottom));
    	}
    }
    
    /*
    * Update Input
    */
    var updateInput = function(newVal, hideAlways) {
    	if (isDef(newVal)) {
    		$input.val(newVal);
			currentSearch = $input.val();
    	}
    	
    	setResultsVisibility(updateResults() && !hideAlways);
    }
    
    /*
    * Update Results
    */
    var updateResults = function() {
    	$dropdownList.empty();
    	
		var results = getResults(currentSearch);
		
		_.each(results, function(result) {
			var resultHtml = generateResult(result);
			$dropdownList.append(resultHtml);
		});
		
		return results.length > 0;
    }
    
    /*
    * Shows the results list
    */
    var setResultsVisibility = function(shouldShow) {
    	if (shouldShow && !$dropdown.is(':visible')) {
    		$dropdown.show();
    	}
    	
    	if (!shouldShow) {
    		$dropdown.hide();
    	}
    }
    
    /*
    * Resizes the result view to the width of the input
    */
    var resizeResultContainer = function() {
        
        if ($input) {
	        var leftOff = $input.position().left;
	    	var topOff = $input.position().top;
	    	
	    	$dropdown.css({width: $input.outerWidth() + 'px'});
	    	$dropdown.css({left: leftOff, 
	    		top: topOff + $input.outerHeight()});
        }
    }
    
    /*
    * Creates the dropdown div/list to hold result items
    */
    var createDropdown = function() {
        $input.after('<div class="dropdown-list-display" tabindex="-1">' +
                        '<ul class="list-unstyled dropdown-search-list">' +
                        '</ul>' +
                    '</div>');
        
        $dropdown = $input.siblings('div.dropdown-list-display');
        $dropdownList = $dropdown.find('.dropdown-search-list');
    }
    
    /*
    * Creates the dropdown div/list to hold result items
    */
    var generateResult = function(result) {
    	
        return '<li class="dropdown-list-item" tabindex="0" result="' + result + '">' +
                    result +
                '</li>';
    }
    
    /*
    * Returns a set of matched results for the provided input
    */
    var getResults = function(val) {
        if (!val || val == '') return [];
        var curItem;
        var results = getProperties(resultList());
        
    	var filtered = _.filter(results, function(item) {
    		if (_.isNumber(item)) {
    			curItem = String(item);
    		} else {
    			curItem = item;
    		}
    		
    		return curItem.toLowerCase().indexOf(val.toLowerCase()) >= 0;	
    	});
    	
    	return filtered.sort();
    }
    
    /*
    * Returns a unique list of values for an array at a specific property
    */
    var getProperties = function(items) {
    	var list = [];
    	if (items.length && _.isArray(items[0][property])) {
    		var arrList = _.pluck(items, property);
    		_.each(arrList, function(arr) { 
    			list = list.concat(arr);	
    		});
    	} else {
    		list = _.pluck(items, property);
    	}
    	
    	return _.uniq(list);
    }
    
    
    this.init(opt);
}