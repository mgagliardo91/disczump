var url = "https://disczumpserver-mgagliardo.c9.io/api/";

var $searchResults;
var $searchBar;
var $filterResults;
var $footerSort;

var searchRequest;

var discList = [];
var discs = [];
var filters = {name: [], brand: [], type: [], material: [], weight: [], color: [], speed: [], glide: [], turn: [], fade: []};
var sort = [{sortProp: 'name', sortType: 'text', sortOn: true, sortAsc: true, sortOrder: 1},
		  {sortProp: 'brand', sortType: 'text', sortOn: true, sortAsc: true, sortOrder: 0},
		  {sortProp: 'type', sortType: 'text', sortOn: false, sortAsc: true, sortOrder: -1},
		  {sortProp: 'material', sortType: 'text', sortOn: false, sortAsc: true, sortOrder: -1},
		  {sortProp: 'weight', sortType: 'text', sortOn: false, sortAsc: true, sortOrder: -1},
		  {sortProp: 'color', sortType: 'text', sortOn: false, sortAsc: true, sortOrder: -1},
		  {sortProp: 'speed', sortType: 'number', sortOn: false, sortAsc: false, sortOrder: -1},
		  {sortProp: 'glide', sortType: 'number', sortOn: false, sortAsc: true, sortOrder: -1},
		  {sortProp: 'turn', sortType: 'number', sortOn: false, sortAsc: true, sortOrder: -1},
		  {sortProp: 'fade', sortType: 'number', sortOn: false, sortAsc: true, sortOrder: -1}];
var paginateOptions = {displayCount: 20, currentPage: 1, lastPage: 1};

$(document).ready(function(){
    $searchResults = $('#search-results');
    $searchBar = $('#search-all');
	$filterResults = $('#filter-results');
	$footerSort = $('#results-footer-sort');
     
     $(window).on('resize', function(){
        resizeSearch();  
     });
     
     $(window).click(function(e) {
     	if ($searchResults.is(':visible')) {
     		$searchResults.hide();
     	}	
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
     
     $('.panel-heading').on('click', function(){
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
	 
	 $(document).on('click', '.filter-option:not(.filter-option-static)', function(e){
			e.stopPropagation();
			
			var $parent = $(this).parents('.filter-item-parent');
			var option = $parent.attr('id').match(/-([a-z]+)/)[1];
			
			var child = $(this).children('.glyphicon');
			if (child.length > 0) {
				child.remove();
				filters[option] = _.without(filters[option], $(this).text());
			} else {
				$(this).append('<span class="glyphicon glyphicon-ok pull-right" aria-hidden="true"></span>');
				if (!_.contains(filters[option], $(this).text())) {
					filters[option].push($(this).text());
				}
			}
			updateFilter();
	  });
	  
	  $(document).on('click', '.result-item:not(.result-item-empty)', function(e) {
	  		e.stopPropagation();
	  		var $parent = $(this).parents('.result-section');
			var option = $parent.attr('id').match(/-([a-z]+)/)[1];
			var val = $(this).text();
			
	  		if (option == 'name') {
	  			filters.name.push(val);
	  			$searchBar.val(val).attr('readonly', true);
	  			$searchBar.bind('click', searchLock);
	  			updateFilter();
	  		} else {
	  			$searchBar.val('');
	  			var $filterOption = $('#filter-' + option);
	  			$filterOption.find('.filter-option').find('.glyphicon').remove();
	  			filters[option] = [];
	  			$filterOption.find('.filter-option:contains(' + val + ')').trigger('click');
	  		}
	  		
	  		$searchResults.hide();
	  });
     
     $('.filter-option-multi').on('click', function(e){
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
     
     $('.heading-text').click(function(){
     	var glyph = $(this).find('.sort-icon');//.children('.glyphicon');
     	trySort($(this), function(sorter) {
     		if (!sorter.sortOn) {
     			glyph.find('.fa').remove();
     			//glyph.removeClass('glyphicon-sort-by-alphabet-alt');
     		} else {
     			if (sorter.sortAsc) {
     				glyph.find('.fa').remove();
     				glyph.append("<i class=\"fa fa-sort-asc fa-tools\"></i>");
     				//glyph.removeClass('glyphicon-sort-by-alphabet-alt');
     				//glyph.addClass('glyphicon-sort-by-alphabet');
     			} else {
     				glyph.find('.fa').remove();
     				glyph.append("<i class=\"fa fa-sort-desc fa-tools\"></i>");
     				//glyph.removeClass('glyphicon-sort-by-alphabet');
     				//glyph.addClass('glyphicon-sort-by-alphabet-alt');
     			}
     			glyph.show();
     		}
     	});
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
	
     // Start on-load commands
     loading();
     resizeSearch(true);
     $searchResults.hide();
     getAllDiscs(function(success){
		if (success) {
			initialize();
		} else {
			alert('Unable to intialize');
		}
	 });
});

var loading = function() {
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
    };

var searchLock = function(e) {
	e.stopPropagation();
	filters.name = [];
	$(this).attr('readonly', false).unbind('click', searchLock);
	updateFilter();
	$searchBar.trigger('keyup');
};

function doSearch() {
	var search = $searchBar.val();
	
	containSearch(search, ['name', 'brand', 'type'], function(prop, list) {
		if (prop == 'name') {
			updateSearchResults($('#results-name'), list);
		} else if (prop == 'brand') {
			updateSearchResults($('#results-brand'), list);
		} else if (prop == 'type') {
			updateSearchResults($('#results-type'), list);
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

function updateFilter() {
	discList = filterList(filters);
	showDiscs();
}

function resizeSearch(forceShow) {
	if (forceShow) {
		$searchResults.show();
	}
	
     if ($searchResults.is(':visible')) {
          $searchResults.width($searchBar.outerWidth());
          $searchResults.css({left: $searchBar.offset().left, 
          top: $searchBar.offset().top + $searchBar.outerHeight()});
     }
};

function initialize() {
		discList = discs;
		generateFilters($('#filter-brand'), '.panel-body', getProperties('brand'));
		generateFilters($('#filter-type'), '.panel-body', getProperties('type'));
		generateFilters($('#filter-material'), '.panel-body', getProperties('material'));
		generateFilters($('#filter-weight'), '.panel-body', getProperties('weight'));
		generateFilters($('#filter-color'), '.panel-body', getProperties('color'));
		generateFilters($('#filter-speed'), '.filter-option-group', getProperties('speed'));
		generateFilters($('#filter-glide'), '.filter-option-group', getProperties('glide'));
		generateFilters($('#filter-turn'), '.filter-option-group', getProperties('turn'));
		generateFilters($('#filter-fade'), '.filter-option-group', getProperties('fade'));
		showDiscs();
}

function generateFilters($option, query, items) {
	var filterBody = $option.find(query);
	if (items.length > 0) {
		$option.find('div.filter-option-static').hide();
		_.each(items, function(item) {
			filterBody.append(generateFilterOption(item));
		});
	} else {
		$option.find('div.filter-option-static').show();
	}
}

function generateFilterOption(option) {
	if((option == '') || (typeof option == 'undefined')) {
		option = 'None';
	}
	return '<div class="filter-option">' + option + '</div>';
}

function showDiscs(maintainPage) {
	if (!maintainPage) {
		paginateOptions.currentPage = 1;
	}
	
	$filterResults.empty();
	var sorted = sortDiscs(discList);
	var paged = paginate(sorted);
	_.each(paged, function(disc) {
		$filterResults.append(generateDiscTemplate(disc));
	});
	updateFooter(sorted.length);
}

function updateFooter(count) {
	$('#results-footer-count').text('Results: ' + count);
	$footerSort.text('Sort: ' + (_.where(sort, {sortOn: true}).length > 0 ? 'On' : 'Off'));
	
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
	return '<tr class="disc-item" discId="' + disc._id + '">' +
		  	'<td class="disc-brand">' + (disc.brand ? disc.brand : '') + '</td>' +
		  	'<td class="disc-name">' + (disc.name ? disc.name : '') + '</td>' +
		  	'<td class="disc-material">' + (disc.material ? disc.material : '') + '</td>' +
		  	'<td class="disc-weight">' + ((typeof disc.weight != 'undefined') ? disc.weight : '') + '</td>' +
		  	'<td class="disc-color">' + (disc.color ? disc.color : '') + '</td>' +
		  	'<td class="disc-type">' + (disc.type ? disc.type : '') + '</td>' +
		  	'<td class="disc-speed">' + ((typeof disc.speed != 'undefined') ? disc.speed : '') + '</td>' +
		  	'<td class="disc-glide">' + ((typeof disc.glide != 'undefined') ? disc.glide : '') + '</td>' +
		  	'<td class="disc-turn">' + ((typeof disc.turn != 'undefined') ? disc.turn : '') + '</td>' +
		  	'<td class="disc-fade">' + ((typeof disc.fade != 'undefined') ? disc.fade : '') + '</td>' +
		  '</tr>';
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

function trySort($sortHeader, callback) {
	var sorter = _.first(_.where(sort, {'sortProp': $sortHeader.text().toLowerCase().trim()}));
	if (sorter !== undefined) {
		var isOn = sorter.sortOn;
		sorter.sortAsc = !(isOn && sorter.sortAsc);
		sorter.sortOn = !(isOn && sorter.sortAsc);
		
		var order = _.max(_.pluck(sort, 'sortOrder')) + 1;
		sorter.sortOrder = sorter.sortOn ? (isOn ? sorter.sortOrder : order) : -1;
		showDiscs();
		
		if (callback) {
			callback(sorter);
		}
	}
}

function genericSort(sorter, array) {
	if (sorter.sortType == 'number') {
		array = _.sortBy(array, function(disc) { return parseInt(disc[sorter.sortProp])});
	} else {
		array = _.sortBy(array, sorter.sortProp);
	}
	
	if (!sorter.sortAsc) {
		array = array.reverse();
	}
	
	return array;
}

function sortDiscs() {
	var toSort = _.sortBy(_.where(sort, {sortOn : true}), 'sortOrder');
	var sorted = discList;
	
	var lastSort;
	_.each(toSort, function(sorter) {
		if (typeof lastSort === 'undefined') {
			sorted = genericSort(sorter, sorted);
		} else {
			var parentVals = _.groupBy(sorted, function(disc) { return disc[lastSort.sortProp]; });
			var newArray = [];
			_.each(parentVals, function(valArray) {
				valArray = genericSort(sorter, valArray);
				newArray = newArray.concat(valArray);
			});
			sorted = newArray;
		}
		lastSort = sorter;
	});
	 
	 if (toSort.length) {
	 	$footerSort.popover({
		 	animation: true,
		 	html: true,
		 	content: function(){
		 			var sortMethod = _.pluck(_.where(sort, {sortOn : true}), 'sortProp');
					var sortText = '<ol class="sort-text">'
					_.each(sortMethod, function(method) {
						sortText += '<li>' + method + '</li>';	
					});
					sortText += '</ol>';
					return sortText;
		 	},
		 	placement: 'bottom',
		 	trigger: 'hover'
		 });
	 } else {
	 	$footerSort.popover('destroy');
	 }
	 
	 _.each(sort, function(sorter) {
		var glyph = $('#sort-' + sorter.sortProp).find('.sort-icon');//.find('.glyphicon');
		if (!sorter.sortOn) {
			//glyph.removeClass('glyphicon-sort-by-alphabet-alt');
			glyph.find('.fa').remove();
		} else {
			if (sorter.sortAsc) {
				glyph.find('.fa').remove();
				glyph.append("<i class=\"fa fa-sort-asc fa-tools\"></i>");
				//glyph.removeClass('glyphicon-sort-by-alphabet-alt');
				//glyph.addClass('glyphicon-sort-by-alphabet');
			} else {
				//glyph.removeClass('glyphicon-sort-by-alphabet');
				//glyph.addClass('glyphicon-sort-by-alphabet-alt');
				glyph.find('.fa').remove();
				glyph.append("<i class=\"fa fa-sort-desc fa-tools\"></i>");
			}
			glyph.show();
		}
	 });
	 
	return sorted;
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
	var end = Math.min(toPaginate.length, start + paginateOptions.displayCount);
	return toPaginate.slice(start, end);
}

function generateModal($header, $body, $footer, fns, onCreate) {
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
     
     if (fns) {
     	_.each(fns, function(fn) {
     		if (fn.name && fn.function) {
     			$modal.find('[fn-title="' + fn.name +'"]').on('click', function() {
     				fn.function($(this),$modal.find('.modal-body'));
     				$modal.modal('hide');
     			});
     		}
     	});
     }
     $modal.on('hidden.bs.modal', function (e) {
	  $modal.remove();
	});
	
	if (onCreate) {
		onCreate($modal.find('.modal-body'));
	}
	
     $modal.modal({show: true, backdrop: 'static'});
}

function exportList() {
	var $header = $('<div></div>').html(
		'<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
          '<h4 class="modal-title">Export List</h4>'
		);
	var $form =  $('<form class="form" role="form"></form>');
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
					function: function() {
						console.log('Closed without exporting.');
					}
				},
				{
					name: 'export',
					function: function($btn, $inner) {
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
					}
				}
		];
		
	generateModal($header, $form, $footer, fns);
}

function generateViewDisc(disc) {
	if(typeof disc.weight == 'undefined'){
		var weight = "";
	} else {
		weight = disc.weight;
	}
	if(typeof disc.speed == 'undefined'){
		var speed = "";
	} else {
		speed = disc.speed;
	}
	if(typeof disc.glide == 'undefined'){
		var glide = "";
	} else {
		glide = disc.glide;
	}
	if(typeof disc.turn == 'undefined'){
		var turn = "";
	} else {
		turn = disc.turn;
	}
	if(typeof disc.fade == 'undefined'){
		var fade = "";
	} else {
		fade = disc.fade;
	}
	
	var $header = $('<div></div>').html(
			'<div class="row">' +
	              '<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
	              '<h4 class="modal-title">' + disc.brand + ' ' + disc.name + '</h4>' +
	          '</div>' +
	          '<div class="row">' +
	              '<p class="modal-title-disc-type">' + disc.type + '</p>' +
	          '</div>'
		);
	var $body =  $('<div id="viewDiscModal" discId="' + disc._id + '"></div>');
	$body.html('<div class="row">' +
						'<div id="view-disc-img-carousel" class="carousel slide" data-ride="carousel">' +
						  '<ol class="carousel-indicators">' +
						  '</ol>' +
						  '<div class="carousel-inner" role="listbox">' +
						  '</div>' +
						  '<a class="left carousel-control" href="#view-disc-img-carousel" role="button" data-slide="prev">' +
						    '<span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>' +
						    '<span class="sr-only">Previous</span>' +
						  '</a>' +
						  '<a class="right carousel-control" href="#view-disc-img-carousel" role="button" data-slide="next">' +
						    '<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>' +
						    '<span class="sr-only">Next</span>' +
						  '</a>' +
						'</div>' +
                    '</div>' +
                    '<div class="row">' +
                        '<div class="col-sm-2">' +
                            '<p class="view-disc-label">Material:</p>' +
                        '</div>' +
                        '<div class="col-sm-7">' +
                            '<p>' + disc.material + '</p>' +
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
                            '<p>' + disc.color + '</p>' +
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
                            '<p>' + disc.notes + '</p>' +
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
					function: function() {
						console.log('Closed disc view.');
					}
				},
				{
					name: 'edit',
					function: function($btn, $inner) {
						generateEditDiscForm(disc);
					}
				},
				{
					name: 'delete',
					function: function($btn, $inner) {
						deleteConfirmationModal($btn.attr('discId'));
					}
				}
	];
	
	var onCreate = function($inner){
		var discId = $('#viewDiscModal').attr('discId');
		
		getAllDiscImages(discId, function(success, images) { 
			if (success) {
				populateCarousel(images, $inner);
			}	
		});
	}
	
     generateModal($header, $body, $footer, fns, onCreate);
     
     
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
					function: function() {
						console.log('Canceled disc deletion.');
					}
				},
				{
					name: 'confirm-delete',
					function: function($btn, $inner) {
						var discId = $btn.attr('discId');
						deleteDisc(discId, function(success) {
							if (success) {
								updateFilter();
							} else {
								// error logic
							}
						});
					}
				}
		];
	
	generateModal($header, $body, $footer, fns);
}

function generateEditDiscForm(disc) {
	var $header = $('<div></div>').html(
		'<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
          '<h4 class="modal-title">Edit Disc</h4>'
		);
	var $form =  $('<form class="form-horizontal" role="form" id="createDiscForm" discId="' + disc._id + '"></form>');
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
					function: function() {
						console.log('Canceled editing of disc.');
					}
				},
				{
					name: 'save',
					function: function($btn, $inner) {
						var discId = $btn.attr('discId');
						var disc = createDisc($inner, discId);
						console.log(JSON.stringify(disc));
						putDisc(disc, function(success) {
							if (success) {
								updateFilter();
							} else {
								// error logic
							}
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
	
    generateModal($header, $form, $footer, fns, onCreate);
}

function generateCreateDiscForm() {
	var $header = $('<div></div>').html(
		'<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
          '<h4 class="modal-title">Add Disc</h4>'
		);
	var $form =  $('<form class="form-horizontal" role="form" id="createDiscForm"></form>');
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
	                      '<textarea class="form-control create-disc-textarea" id="create-discnotes" rows="3" param="notes"></textarea>' +
	                  '</div>' +
		          '</div>' +
					'<div class="dropzone-area">' +
					    '<div class="image-list-container">' +
					        '<div class="image-list-table">' +
					            '<div class="image-item-container image-add">' +
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
					function: function() {
						console.log('Closed without creating a disc.');
					}
				},
				{
					name: 'create',
					function: function($btn, $inner) {
						var disc = createDisc($inner);
						postDisc(disc, function(success) {
							if (success) {
								updateFilter();
							} else {
								// error logic
							}
						});
					}
				}
	];
	
	var onCreate = function($inner) {
		createDropZone($inner.find('.dropzone-area'));
	}
	
     generateModal($header, $form, $footer, fns, onCreate);
}
	
function createDisc($form, discId) {
	var disc = {};
	
	if(discId) {
		disc._id = discId;
	}
	
	var $fields = $form.find('input');
	$.each($fields, function(index) {
		var $field = $(this);
		disc[$field.attr('param')] = $field.val();	
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
	
	return disc;
	
}

var delay = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();

function populateCarousel(imageArray, $inner) {
		for (var i = 0; i < imageArray.length; i++) {
			var image = imageArray[i];
			$inner.find(".carousel-indicators").append('<li data-target="#view-disc-img-carousel" data-slide-to="' + i + '" class="' + (i == 0 ? 'active' : '') + '"></li>');
			$inner.find(".carousel-inner").append('<div class="item' + (i == 0 ? ' active' : '') + '">' +
      									  '<img src="/files/' + image.fileId + '" alt="Disc Image" imageId="' + image._id + '">' +
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
		myDropzone.options.url = '/multi/images/' + 123456;
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
    $.ajax({
		type: "POST",
		dataType: "json",
		url: url + 'discs/',
		contentType: "application/json",
		data: JSON.stringify(disc),
		success: function (data) {
		   	if(data && typeof data._id != 'undefined') {
		   		discs.push(data);
		   		success = true;
		   	} else {
		   		console.log(data);
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

function putDisc(disc, callback) {
	var success = false;
	$.ajax({
		type: "PUT",
		dataType: "json",
		url: url + '/discs/' + disc._id,
		contentType: "application/json",
		data: JSON.stringify(disc),
		success: function (data) {
			console.log(data);
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
			console.log(data);
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

function getProperties(prop) {
	return _.uniq(_.pluck(discs,  prop));
}

function filterList(filters) {
	return _.filter(discs, function(disc) {
		for (var property in filters) {
			if (filters[property].length > 0) {
				if (_.has(disc, property)) {
					if (!(_.contains(filters[property], String(disc[property])))) {
						return false;
					}
				} else {
					return false;
				}
			}
		}
		return true;
	});
}

function containSearch(val, properties, callback) {
	_.each(properties, function(prop) {
		var filtered = _.filter(getProperties(prop), function(item) {
			return item.toLowerCase().indexOf(val.toLowerCase()) >= 0;	
		});
		callback(prop, filtered);
	});
}

function sortList(sorts) {
	
}

function getDisc(id) {
	return _.first(_.where(discs, {'_id' : id}));
}
