var url = "/api/";

var $searchResults;
var $searchBar;
var $filterResults;
var $inventoryHeader;
var $inventoryContainer;
var $dynamicHeader;

var mySort;
var myFilter;
var searchRequest;

var discList = [];
var discs = [];
var paginateOptions = {displayCount: 20, currentPage: 1, lastPage: 1};
var dropzones = [];

var refPageTop;
var refContBottom;
var isFixed = false, isHidden = false;

$(document).ready(function(){
    $searchResults = $('#search-results');
    $searchBar = $('#search-all');
	$filterResults = $('#filter-results');
	$inventoryHeader = $('#inventory-header');
    $inventoryContainer = $('.disc-inventory-container');
    $dynamicHeader = $('#disc-inventory-header-dynamic');
    
    refPageTop = $('body').outerHeight() - $('body').height() - $('nav').outerHeight();
    refContBottom = refPageTop + $inventoryContainer.outerHeight() - $inventoryHeader.outerHeight();
     
     $(window).on('resize', function(){
        resizeSearch($searchResults, $searchBar, true); 
        resizeResultHeader();
     });
     
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
    });
     
     $(window).click(function(e) {
     	$.each($('.hide-on-close'), function(index) {
     		if ($(this).is(':visible')) {
	     		$(this).hide();
	     	}	
     	});
     });
     
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
     
	 $(document).on('click', '.disc-item', function() {
	 	var disc = getDisc($(this).attr('discid'));
		generateViewDisc(disc);
	 });
	 
	 $(document).on('click', '.page-dynamic', function() {
	 	var page = parseInt($(this).text());
	 	paginateOptions.currentPage = page;
	 	showDiscs(true);
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
	 	generateCreateDiscForm();
	 });
	 
	 $('#btn-delete-disc').click(function(e){
	 	deleteConfirmationModal();
	 });
	
	$(document).on('click', '.image-preview:not(.active)', function(){
		var src = $(this).children('img').attr('src');
		var $blockDisplay = $(this).parents('.image-block-display');
		var $mainImage = $blockDisplay.find('#disc-main-image');
		
		$blockDisplay.find('.image-preview.active').removeClass('active');
		$mainImage.attr('src', src);
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
    
    
    /// Library Objects
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
    
	
     // Start on-load commands
     //loading();
     resizeSearch($searchResults, $searchBar, true, true);
     resizeResultHeader();
     $searchResults.hide();
     getAllDiscs(function(success){
		if (success) {
			initialize();
		} else {
			alert('Unable to intialize');
		}
	 });
});

/*var loading = function() {
        // add the overlay with loading image to the page
        var backgroundOverlay = '<div id="overlay">' +
            '<img id="loading" src="/static/img/loading.GIF">' +
            '</div>';
        $(backgroundOverlay).appendTo('body');

        // click on the overlay to remove it
        $('#overlay').click(function() {
            $(this).remove();
        });

        // hit escape to close the overlay
        $(document).keyup(function(e) {
            if (e.which === 27) {
                $('#overlay').remove();
            }
        });
    };*/

var searchLock = function(e) {
	e.stopPropagation();
	myFilter.clearFilter('name');
	$(this).attr('readonly', false).unbind('click', searchLock);
	$searchBar.trigger('keyup');
};

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

function generateResultItem(item) {
	return '<div class="result-item">' + item +
    		'<span class="glyphicon glyphicon-leaf pull-left" aria-hidden="true"></span>' + 
		'</div>';
}

function generateTagResult(item) {
	return '<li class="tag-list-item" tabindex="0">' +
        '<span><i class="fa fa-tag"></i></span>' +
        item +
    '</li>';
}

function generateTagItem(item) {
	return '<div class="tag-item" tagVal="' + item +  '">' +
		'<p class="tag-item-text">' + item + ' <span class="tag-item-remove"><i class="fa fa-times"></i></span></p>' +
		'</div>';
}

function updateFilter(generateFilters) {
	discList = myFilter.filter(discs, generateFilters);
	showDiscs();
	resizeResultHeader();
}

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

function resizeResultHeader() {
	$inventoryHeader.css({
		'width': $inventoryContainer.outerWidth()
	});
}

function initialize() {
	updateFilter(true);
}

function showDiscs(maintainPage) {
	if (!maintainPage) {
		paginateOptions.currentPage = 1;
	}
	
	$filterResults.empty();
	var sorted = mySort.doSort(discList);
	var paged = paginate(sorted);
	_.each(paged, function(disc) {
		getAllDiscImages(disc._id, updateDiscImage);
		$filterResults.append(generateDiscTemplate(disc));
	});
	updateHeader(sorted.length);
	resizeResultHeader();
}

function updateDiscImage(success, discImages) {
	if (success) {
		if (discImages.length > 0) {
			var discImage = discImages[0];
			var $discItem = $('div.disc-item[discId="' + discImage.discId + '"]');
			$discItem.find('.disc-content-image img').attr('src', '/files/' + discImage.fileId);
		}
	}
}

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

function generateDiscTemplate(disc) {
	var tagHTML = '';
	
	_.each(disc.tagList, function(tag) {
		tagHTML = tagHTML + '<span class="disc-info-tag">' + tag + '</span>';
	});
	
	 return '<div class="disc-item-container">' +
                                '<div class="disc-item" discId="' + disc._id + '">' +
                                    '<div class="disc-content-image-container">' +
                                        '<div class="disc-content-image">' +
                                            '<img src="https://placehold.it/150x150" />' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="disc-content-info-container">' +
                                        '<div class="disc-info-main-pane">' +
                                            '<div class="disc-info-left-pane div-inline float-left">' +
                                                '<div class="disc-info-brand">' + (disc.brand ? disc.brand : '') + '</div>' +
                                                '<div class="disc-info-name">' + (disc.name ? disc.name : '') + '</div>' +
                                            '</div>' +
                                            '<div class="disc-info-right-pane div-inline float-left">' +
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
                                                            '<td class="disc-info-value">' + ((typeof disc.weight != 'undefined') ? disc.weight : '') + '</td>' +
                                                        '</tr>' +
                                                    '</table>' +
                                                '</div>' +
                                            '</div>' +
                                        '</div>' +
                                        '<div>' +
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
                                        '</div>' +
                                    '</div>' +
                                    '<div class="clearfix"></div>' +
                                '</div>' +
                            '</div>';
	
}

function generateModalTemplate(disc) {
	return '<p>' + disc.type + '</p>' +
			'<p>' + disc.material + '</p>' +
			'<p>' + disc.color + '</p>' +
			'<p>' + disc.weight + '</p>' +
			'<p>' + disc.speed + '</p>' +
			'<p>' + disc.glide + '</p>' +
			'<p>' + disc.turn + '</p>' +
			'<p>' + disc.fade + '</p>'
}

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

function generateModal($header, $body, $footer, options) {
	// params fns, onCreate, onShow
	
	$('.custom-modal').remove();
	var headerText = '';
	var bodyText = '';
	var footerText = '';
	
	if ($header) {
		headerText = $header.html();
	}
	
	if ($body) {
		bodyText = $('<div></div>').append($body).html();
	}
	
	if ($footer) {
		footerText = $footer.html();
	}
	
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
     
     if (options.fns) {
     	var fns = options.fns;
     	_.each(fns, function(fn) {
     		if (fn.name && fn.function) {
     			$modal.find('[fn-title="' + fn.name +'"]').on('click', function() {
     				fn.function($(this), $modal.find('.modal-body'), function() {
     					$modal.modal('hide');
     				});
     			});
     		}
     	});
     }
     
    $modal.on('hidden.bs.modal', function (e) {
	  $modal.remove();
	});
	
	$modal.on('shown.bs.modal', function (e) {
	  if (options.onShow) {
			options.onShow($modal.find('.modal-body'));
		}
	});
	
	if (options.onCreate) {
		options.onCreate($modal.find('.modal-body'));
	}
	
    $modal.modal({show: true, backdrop: 'static'});
	
}

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

function generateViewDisc(disc) {
	var color = typeof disc.color == 'undefined' ? "" : disc.color;
	var type = typeof disc.type == 'undefined' ? "" : disc.type;
	var material = typeof disc.material == 'undefined' ? "" : disc.material;
	var notes = typeof disc.notes == 'undefined' ? "" : disc.notes;
	var weight = typeof disc.weight == 'undefined' ? "" : disc.weight;
	var speed = typeof disc.speed == 'undefined' ? "" : disc.speed;
	var glide = typeof disc.glide == 'undefined' ? "" : disc.glide;
	var turn = typeof disc.turn == 'undefined' ? "" : disc.turn;
	var fade = typeof disc.fade == 'undefined' ? "" : disc.fade;
	
	var $header = $('<div></div>').html(
			'<div class="row">' +
	              '<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
	              '<h4 class="modal-title">' + disc.brand + ' ' + disc.name + '</h4>' +
	          '</div>' +
	          '<div class="row">' +
	              '<p class="modal-title-disc-type">' + type + '</p>' +
	          '</div>'
		);
	var $body =  $('<div id="viewDiscModal" discId="' + disc._id + '"></div>');
	$body.html('<div class="image-block-display">' +
		                '<div class="image-block">' +
		                    '<div class="image-block-frame">' +
		                        '<img src="https://placehold.it/250x250" class="fit-parent" id="disc-main-image">' +
		                    '</div>' +
		                '</div>' +
		                '<div class="image-list">' +
		                    '<div class="image-list-container image-list-container-simple">' +
		                        '<div class="image-list-table" id="disc-image-table">' +
			                        '<div class="image-item-container">' +
			                                '<div class="image-item">' +
			                                    '<div class="image-preview active">' +
			                                        '<img src="https://placehold.it/250x250" class="fit-parent">' +
			                                    '</div>' +
			                                '</div>' +
		                            '</div>' +
		                        '</div>' +
		                    '</div>' +
		                '</div>' +
		            '</div>' +
                    '<div class="row">' +
                        '<div class="col-sm-2">' +
                            '<p class="view-disc-label">Material:</p>' +
                        '</div>' +
                        '<div class="col-sm-7">' +
                            '<p>' + material + '</p>' +
                        '</div>' +
                        '<div class="col-sm-2">' +
                            '<p class="view-disc-label">Speed:</p>' +
                        '</div>' +
                        '<div class="col-sm-1">' +
                            '<p>' + speed + '</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="row">' +
                        '<div class="col-sm-2">' +
                            '<p class="view-disc-label">Color:</p>' +
                        '</div>' +
                        '<div class="col-sm-7">' +
                            '<p>' + color + '</p>' +
                        '</div>' +
                        '<div class="col-sm-2">' +
                            '<p class="view-disc-label">Glide:</p>' +
                        '</div>' +
                        '<div class="col-sm-1">' +
                            '<p>' + glide + '</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="row">' +
                        '<div class="col-sm-2">' +
                            '<p class="view-disc-label">Weight:</p>' +
                        '</div>' +
                        '<div class="col-sm-7">' +
                            '<p>' + weight + '</p>' +
                        '</div>' +
                        '<div class="col-sm-2">' +
                            '<p class="view-disc-label">Turn:</p>' +
                        '</div>' +
                        '<div class="col-sm-1">' +
                            '<p>' + turn + '</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="row">' +
                        '<div class="col-sm-2">' +
                            '<p class="view-disc-label">Notes:</p>' +
                        '</div>' +
                        '<div class="col-sm-7">' +
                            '<p>' + notes + '</p>' +
                        '</div>' +
                        '<div class="col-sm-2">' +
                            '<p class="view-disc-label">Fade:</p>' +
                        '</div>' +
                        '<div class="col-sm-1">' +
                            '<p>' + fade + '</p>' +
                        '</div>' +
                    '</div>');
               
     var $footer = $('<div></div>').html(
     	'<div class="row">' +
              '<div class="col-sm-2">' +
                  '<button type="button" id="btn-delete-disc" class="btn btn-danger" fn-title="delete" discId=' + disc._id + '><span><i class="fa fa-minus-circle fa-tools"></i></span>Delete</button>' +
              '</div>' +
              '<div class="col-sm-2">' +
                  '<button type="button" id="btn-edit-disc" class="btn btn-warning" fn-title="edit"><span><i class="fa fa-pencil fa-tools"></i></span>Edit</button>' +
              '</div>' +
              '<div class="col-sm-2 col-sm-offset-6">' +
                  '<button type="button" class="btn btn-default" fn-title="close">Close</button>' +
              '</div>' +
          '</div>'
     );
 
	var fns = [
				{
					name: 'close',
					function: function($btn, $inner, done) {
						done();
						console.log('Closed disc view.');
					}
				},
				{
					name: 'edit',
					function: function($btn, $inner, done) {
						generateEditDiscForm(disc);
						done();
					}
				},
				{
					name: 'delete',
					function: function($btn, $inner, done) {
						deleteConfirmationModal($btn.attr('discId'));
						done();
					}
				}
	];
	
	var onCreate = function($inner){
		var discId = $('#viewDiscModal').attr('discId');
		
		getAllDiscImages(discId, function(success, images) { 
			if (success) {
				populateDiscImages(images, $inner);
			}	
		});
	}
	
     generateModal($header, $body, $footer, {fns:fns, onCreate:onCreate});
     
     
}

function deleteConfirmationModal(discId) {
	var $header = $('<div></div>').html(
		'<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
          '<h4 class="modal-title">WARNING!</h4>'
		);
	var $body =  $('<div></div>');
	$body.html(
		'<p>Are you sure you want to delete this disc and all of its data?</p>'
		);
			
	var $footer = $('<div></div>').html(
		'<button type="button" class="btn btn-default" fn-title="cancel">Cancel</button>' +
		'<button type="button" id="btn-confirm-delete-disc" class="btn btn-danger" fn-title="confirm-delete" discId=' + discId + '><span><i class="fa fa-minus-circle fa-tools"></i></span>Delete Disc</button>'
		);
		
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
						deleteDisc(discId, function(success) {
							if (success) {
								updateFilter(true);
							} else {
								// error logic
							}
							
							done();
						});
					}
				}
		];
	
	generateModal($header, $body, $footer, {fns: fns});
}

function generateEditDiscForm(disc) {
	var $header = $('<div></div>').html(
		'<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
          '<h4 class="modal-title">Edit Disc</h4>'
		);
	var $form =  $('<form class="form-horizontal" role="form" id="createDiscForm" discId="' + disc._id + '" autocomplete="off"></form>');
	$form.html('<div class="form-group">' +
	                  '<label for="md-add-brand" class="col-sm-2 control-label"><span class="required-field">* </span>Brand</label>' +
	                  '<div class="col-sm-10">' +
	                      '<input type="text" class="form-control" id="create-disc-brand" param="brand" required>' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	                  '<label for="md-add-name" class="col-sm-2 control-label"><span class="required-field">* </span>Name</label>' +
	                  '<div class="col-sm-10">' +
	                      '<input type="text" class="form-control" id="create-disc-name" param="name" required>' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	                  '<label for="md-add-material" class="col-sm-2 control-label">Material</label>' +
	                  '<div class="col-sm-10">' +
	                      '<input type="text" class="form-control" id="create-disc-material" param="material">' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	                  '<label for="md-add-type" class="col-sm-2 control-label">Type</label>' +
	                  '<div class="col-sm-10">' +
	                      '<select class="form-control" id="create-disc-type"  param="type">' +
	                          '<option value="" selected></option>' +
	                          '<option value="Putt/Approach">Putt/Approach</option>' +
	                          '<option value="Mid-range">Mid-range</option>' +
	                          '<option value="Fairway Driver">Fairway Driver</option>' +
	                          '<option value="Distance Driver">Distance Driver</option>' +
	                          '<option value="Mini">Mini</option>' +
	                      '</select>' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	                  '<label for="md-add-weight" class="col-sm-2 control-label">Weight</label>' +
	                  '<div class="col-sm-10">' +
	                      '<input type="number" class="form-control" id="create-disc-weight" param="weight">' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	                  '<label for="md-add-color" class="col-sm-2 control-label">Color</label>' +
	                  '<div class="col-sm-10">' +
	                      '<input type="text" class="form-control" id="create-disc-color" param="color">' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	                  '<label for="md-add-speed" class="col-sm-2 control-label">Speed</label>' +
	                  '<div class="col-sm-4">' +
	                      '<input type="number" class="form-control" id="create-disc-speed" param="speed">' +
	                  '</div>' +
	                  '<label for="md-add-glide" class="col-sm-2 control-label">Glide</label>' +
	                  '<div class="col-sm-4">' +
	                      '<input type="number" class="form-control" id="create-disc-glide" param="glide">' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	                  '<label for="md-add-turn" class="col-sm-2 control-label">Turn</label>' +
	                  '<div class="col-sm-4">' +
	                      '<input type="number" class="form-control" id="create-disc-turn" param="turn">' +
	                  '</div>' +
	                  '<label for="md-add-fade" class="col-sm-2 control-label">Fade</label>' +
	                  '<div class="col-sm-4">' +
	                      '<input type="number" class="form-control" id="create-disc-fade" param="fade">' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	                  '<label for="md-add-notes" class="col-sm-2 control-label">Notes</label>' +
	                  '<div class="col-sm-10">' +
	                      '<textarea class="form-control" id="create-disc-notes" rows="3" param="notes"></textarea>' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	                  '<label class="col-sm-2 control-label">Select Images</label>' +
	                  '<div class="col-sm-5">' +
                            '<div class="upload-img" id="disc-img-front">' +
                            		'<span class="placeholder"><i class="fa fa-camera-retro"></i></span>' +
                            		'<div id="disc-img-front-click" class="upload-img-click"></div>' +
                            '</div>' +
	                  '</div>' +
	                  '<div class="col-sm-5">' +
	                      '<a href="#" class="thumbnail">' +
	                          '<img id="img-back" data-src="holder.js/100%x180" alt="Back">' +
	                      '</a>' +
	                  '</div>' +
	              '</div>');
               
     var $footer = $('<div></div>').html(
     	'<button type="button" class="btn btn-default" fn-title="cancel">Cancel</button>' +
		'<button type="button" id="btn-save-disc" class="btn btn-primary" fn-title="save" discId=' + disc._id + '><span><i class="fa fa-save fa-tools"></i></span>Save</button>'
	);
	
	var fns = [
				{
					name: 'cancel',
					function: function($btn, $inner, done) {
						done();
						console.log('Canceled editing of disc.');
					}
				},
				{
					name: 'save',
					function: function($btn, $inner, done) {
						var discId = $btn.attr('discId');
						var disc = createDisc($inner, discId);
						console.log(JSON.stringify(disc));
						putDisc(disc, function(success) {
							if (success) {
								updateFilter(true);
							} else {
								// error logic
							}
							
							done();
						});
					}
				}
	];
	
	var onCreate = function($inner) {
		
		var discId = $('#createDiscForm').attr('discId');
		var disc = getDisc(discId);

		$('#create-disc-brand').val(disc.brand);
		$('#create-disc-name').val(disc.name);
		$('#create-disc-material').val(disc.material);
		$('#create-disc-type').val(disc.type);
		$('#create-disc-weight').val(disc.weight);
		$('#create-disc-color').val(disc.color);
		$('#create-disc-speed').val(disc.speed);
		$('#create-disc-glide').val(disc.glide);
		$('#create-disc-turn').val(disc.turn);
		$('#create-disc-fade').val(disc.fade);
		$('#create-disc-notes').val(disc.notes);
	}
	
    generateModal($header, $form, $footer, {fns: fns, onCreate: onCreate});
}

function generateCreateDiscForm() {
	var $header = $('<div></div>').html(
		'<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
          '<h4 class="modal-title">Add Disc</h4>'
		);
	var $form =  $('<form class="form-horizontal" role="form" id="createDiscForm" autocomplete="off"></form>');
	$form.html('<div class="form-group">' +
	                  '<label class="col-sm-2 control-label"><span class="required-field">* </span>Brand</label>' +
	                  '<div class="col-sm-4">' +
	                      '<input type="text" class="form-control text-assist" param="brand">' +
	                  '</div>' +
	                  '<label class="col-sm-2 control-label"><span class="required-field">* </span>Name</label>' +
	                  '<div class="col-sm-4">' +
	                      '<input type="text" class="form-control text-assist" param="name">' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	              	  '<label class="col-sm-2 control-label">Type</label>' +
	                  '<div class="col-sm-4">' +
	                      '<select class="form-control" param="type">' +
	                      	  '<option value="" selected></option>' +
	                          '<option value="Putt/Approach">Putt/Approach</option>' +
	                          '<option value="Mid-range">Mid-range</option>' +
	                          '<option value="Fairway Driver">Fairway Driver</option>' +
	                          '<option value="Distance Driver">Distance Driver</option>' +
	                          '<option value="Mini">Mini</option>' +
	                      '</select>' +
	                  '</div>' +
	                  '<label class="col-sm-2 control-label">Material</label>' +
	                  '<div class="col-sm-4">' +
	                      '<input type="text" class="form-control text-assist" param="material">' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	                  '<label class="col-sm-2 control-label">Weight</label>' +
	                  '<div class="col-sm-4">' +
	                      '<input type="number" class="form-control text-assist" param="weight">' +
	                  '</div>' +
	                  '<label class="col-sm-2 control-label">Color</label>' +
	                  '<div class="col-sm-4">' +
	                      '<input type="text" class="form-control text-assist" param="color">' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	                  '<label class="col-sm-2 control-label">Speed</label>' +
	                  '<div class="col-sm-4">' +
	                      '<input type="number" class="form-control text-assist" param="speed">' +
	                  '</div>' +
	                  '<label class="col-sm-2 control-label">Glide</label>' +
	                  '<div class="col-sm-4">' +
	                      '<input type="number" class="form-control text-assist" param="glide">' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	                  '<label class="col-sm-2 control-label">Turn</label>' +
	                  '<div class="col-sm-4">' +
	                      '<input type="number" class="form-control text-assist" param="turn">' +
	                  '</div>' +
	                  '<label class="col-sm-2 control-label">Fade</label>' +
	                  '<div class="col-sm-4">' +
	                      '<input type="number" class="form-control text-assist" param="fade">' +
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
	                      '<textarea class="form-control create-disc-textarea" rows="3" param="notes"></textarea>' +
	                  '</div>' +
		          '</div>' +
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
					'</div>');
               
     var $footer = $('<div></div>').html(
     	'<button type="button" class="btn btn-default" fn-title="close">Close</button>' +
		'<button type="button" id="btn-add-disc" class="btn btn-primary" fn-title="create"><span><i class="fa fa-plus-circle fa-tools"></i></span>Add Disc</button>'
	);
	
	var fns = [
				{
					name: 'close',
					function: function($btn, $inner, done) {
						done();
						console.log('Closed without creating a disc.');
					}
				},
				{
					name: 'create',
					function: function($btn, $inner, done) {
						$inner.find('div.alert').remove();
						var disc = createDisc($inner);
						postDisc(disc, function(success, retData) {
							if (success) {
								var $dropzone = $inner.find('.dropzone-area');
								var id = $dropzone.attr('dropzoneid');
								var dropzone = dropzones.splice(id, 1)[0];
								if (dropzone && dropzone.getAcceptedFiles().length > 0) {
									dropzone.options.url = '/api/discs/' + retData._id + '/images';
									dropzone.on('queuecomplete', function() {
										$inner.prepend(generateSuccess(retData.Brand + ' ' + retData.name + ' was successfully added.'));
										updateFilter(true);
										$('#createDiscForm').trigger("reset");
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
	];
	
	var onCreate = function($inner) {
		createDropZone($inner.find('.dropzone-area'));
	}
	
	var onShow = function($inner) {
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
	}
	
     generateModal($header, $form, $footer, {fns: fns, onCreate: onCreate, onShow: onShow});
}

function createDisc($form, discId) {
	var disc = {};
	
	if(discId) {
		disc._id = discId;
	}
	
	var $fields = $form.find('input');
	$.each($fields, function(index) {
		var $field = $(this);
		if (hasAttr($field, 'param')) {
			disc[$field.attr('param')] = $field.val();	
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

function hasAttr($elem, attribute) {
	var attr = $elem.attr(attribute);
	return (typeof attr !== typeof undefined && attr !== false);
}

var delay = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();

function populateDiscImages(imageArray, $inner) {
		var $mainImage = $inner.find('#disc-main-image');
		var $imageTable = $inner.find('#disc-image-table');
		$imageTable.empty();
		
		for (var i = 0; i < imageArray.length; i++) {
			var image = imageArray[i];
			
			if (i == 0) {
				$mainImage.attr('src', '/files/' + image.fileId);
			}
			
			$imageTable.append('<div class="image-item-container">' +
                                '<div class="image-item">' +
                                    '<div class="image-preview' + (i == 0 ? ' active' : '') + '">' +
                                        '<img src="/files/' + image.fileId +'" class="fit-parent">' +
                                    '</div>' +
                                '</div>' +
                            '</div>');
		}
}

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
                                '<div class="im age-size" data-dz-size></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
    
    var $imageAdd = $div.find('.image-add');
    var $container = $div.find('.image-list-container');
    var $table = $div.find('.image-list-table');
	var myDropzone = new Dropzone('#' + $container.attr('id'), {
				  url: "/api/discs",
				  method: "POST",
				  thumbnailWidth: 150,
				  thumbnailHeight: 150,
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
	                 	$imageAdd.insertAfter('.image-item-container:last-child');
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


/*-------------------------------------------------------------------------------------------*/
/*                                     CONTROLLER JQUERY                                     */
/*-------------------------------------------------------------------------------------------*/
/*
					                      /´¯/) 
					                    ,/¯../ 
					                   /..../ 
					              /´¯/'...'/´¯¯`·¸ 
					          /'/.../..../......./¨¯\ 
					        ('(...´...´.... ¯~/'....') 
					         \.................'...../ 
					          ''...\.......... _.·´ 
					            \..............( 
					              \.............\
*/
/*-------------------------------------------------------------------------------------------*/

function getAllDiscs(callback) {
	var success = false;
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + 'discs/',
		contentType: "application/json",
		success: function (data) {
		   	discs = data;
			success = true;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success);
			}
		}
     });
}

function postDisc(disc, callback) {
	var success = false;
	var retData;
    $.ajax({
		type: "POST",
		dataType: "json",
		url: url + 'discs/',
		contentType: "application/json",
		data: JSON.stringify(disc),
		success: function (data) {
			retData = {'error' : {message : 'Unable to process request.', type : 'Unknown Error'}};
			
			if (!data) {
				success = false;
				return;
			}
			
			if (data.error) {
				retData = data.error;
				success = false;
				return;
			}
			
		   	if (typeof data._id != 'undefined') {
		   		discs.push(data);
		   		success = true;
		   		retData = data;
		   	} else {
				success = false;
		   	}
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
			
			retData = {'error' : {message : request.responseText, type : 'Server Communication Error'}};
		},
		complete: function(){
			if (callback) {
				callback(success, retData);
		   	}
		}
     });
}

function putDisc(disc, callback) {
	var success = false;
	$.ajax({
		type: "PUT",
		dataType: "json",
		url: url + '/discs/' + disc._id,
		contentType: "application/json",
		data: JSON.stringify(disc),
		success: function (data) {
			if(data && typeof data._id != 'undefined') {
				discs = _.filter(discs, function(disc){
					return disc._id != data._id;
				});
				discs.push(data);
				console.log('Saved disc changes.');
				success = true;
			}
		},
		error: function (request, textStatus, errorThrown) {
		   console.log(request.responseText);
		   console.log(textStatus);
		   console.log(errorThrown);
		},
		complete: function(){
		   if (callback) {
			callback(success);
		   }
		}
	});
}

function deleteDisc(discId, callback) {
	var success = false;
	$.ajax({
		type: "DELETE",
		dataType: "json",
		url: url + '/discs/' + discId,
		contentType: "application/json",
		success: function (data) {
			if(data && typeof data._id != 'undefined') {
				discs = _.filter(discs, function(disc){
					return disc._id != data._id;
				});
				console.log('Deleted disc.');
				success = true;
			}
		},
		error: function (request, textStatus, errorThrown) {
		   console.log(request.responseText);
		   console.log(textStatus);
		   console.log(errorThrown);
		},
		complete: function(){
		   if (callback) {
			callback(success);
		   }
		}
	});
}

function getAllDiscImages(discId, callback) {
	var success = false;
	var images = [];
    $.ajax({
		type: "GET",
		dataType: "json",
		url: url + 'discs/' + discId + '/images',
		contentType: "application/json",
		success: function (data) {
		   	images = data;
			success = true;
		},
		error: function (request, textStatus, errorThrown) {
			console.log(request.responseText);
			console.log(textStatus);
			console.log(errorThrown);
		},
		complete: function(){
			if (callback) {
				callback(success, images);
			}
		}
     });
}

// POTENTIALLY REMOVE
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

function containSearch(val, properties, callback) {
	_.each(properties, function(prop) {
		callback(prop, checkContains(val, prop));
	});
}

function checkContains(val, prop){
	if (!val || !prop) return [];
	var filtered = _.filter(getProperties(prop), function(item) {
		return item.toLowerCase().indexOf(val.toLowerCase()) >= 0;	
	});
	return filtered;
}

function generateInfo(message, title) {
	
	return generateMessage('info', message, title);
}

function generateError(message, title) {
	
	return generateMessage('danger', message, title);
}

function generateSuccess(message, title) {
	
	return generateMessage('success', message, title);
}

function generateMessage(type, message, title) {
	
	return '<div class="alert alert-' + type + '" role="alert">' +
		        		'<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
		        		'<strong>' + (title ? title + ': ' : '') + '</strong>' + message +
		    		'</div>';
}

function getDisc(id) {
	return _.first(_.where(discs, {'_id' : id}));
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
    
    var simpleSort = function(sorter, arr) {
    	return zumpSort.genericSort(sorter, arr);
    }
    
    //----------------------\
    // Private Functions
    //----------------------/
    
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
    var filterChangeEvent;
    
    
    //----------------------\
    //JQuery Objects
    //----------------------/
    var $filterContainer;
    
    
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
        
        if (isDef(opt.filterContainer)) {
            $filterContainer = $(opt.filterContainer);
        }
        
        // Set filter array
        if (isDef(opt.items)) {
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
			
			if (!_.contains(filters[option], val)) {
				$(this).append('<span class="glyphicon glyphicon-ok pull-right" aria-hidden="true"></span>');
				filters[option].push(val);
			} else {
				$(this).children('.glyphicon').remove();
				filters[option] = _.without(filters[option], val);
			}
			
			if (isDef(filterChangeEvent)) filterChangeEvent();
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
	    	
	    	if (code == 13 || code == 38 || code == 40) {
		    	e.stopImmediatePropagation();
		    	return false;
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
	    	if (code == 13) {
	    		var $curActive = $dropdownList.find('.dropdown-list-item.active');
		        if ($curActive.length) {
		        	updateInput($curActive.attr('result'), true);
		        }
		        
		        if (onSelection) {
	        		onSelection($input.val(), zumpTextAssist.resetInput);
		        }
		        
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
    	if (newVal) {
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
                    '<span><i class="fa fa-ellipsis-v"></i></span>' +
                    result +
                '</li>';
    }
    
    /*
    * Returns a set of matched results for the provided input
    */
    var getResults = function(val) {
        if (!val) return [];
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