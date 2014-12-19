var url = "https://disczumpserver-mgagliardo.c9.io/api/";

var $searchResults;
var $searchBar;
var $filterResults;
var $footerSort;
var $modalDetails;

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
	$modalDetails = $('#modal-details');
     
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
	 
	 $('#export-list').click(function(e){
	 	exportList();
	 });
	 
	 $('#create-disc-modal').click(function(e){
	 	generateCreateDiscForm();
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
     	var glyph = $(this).children('.glyphicon');
     	trySort($(this), function(sorter) {
     		if (!sorter.sortOn) {
     			glyph.removeClass('glyphicon-sort-by-alphabet-alt');
     		} else {
     			if (sorter.sortAsc) {
     				glyph.removeClass('glyphicon-sort-by-alphabet-alt');
     				glyph.addClass('glyphicon-sort-by-alphabet');
     			} else {
     				glyph.removeClass('glyphicon-sort-by-alphabet');
     				glyph.addClass('glyphicon-sort-by-alphabet-alt');
     			}
     			glyph.show();
     		}
     	});
     });
     
	 $(document).on('click', '.disc-item', function() {
	 	var disc = getDisc($(this).attr('discid'));
	 	$modalDetails.empty();
		$modalDetails.append(generateModalTemplate(disc));
	 	$('#viewDiscModal').modal('show');
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
	 
	$('#createDiscForm').submit(function(e){
		e.preventDefault();
		var disc = createDisc($(this));
		postDisc(disc, function(success) {
			if (success) {
				updateFilter();
			} else {
				// error logic
			}
			
			$('#createDiscModal').modal('hide');
		});
	});
	
	
     // Start on-load commands
     
     resizeSearch();
     $searchResults.hide();
     getAllDiscs(function(success){
		if (success) {
			initialize();
		} else {
			alert('Unable to intialize');
		}
	 });
});

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

function resizeSearch() {
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
		  	'<td class="disc-brand">' + disc.brand + '</td>' +
		  	'<td class="disc-name">' + disc.name + '</td>' +
		  	'<td class="disc-material">' + disc.material + '</td>' +
		  	'<td class="disc-type">' + disc.type + '</td>' +
		  	'<td class="disc-speed">' + disc.speed + '</td>' +
		  	'<td class="disc-glide">' + disc.glide + '</td>' +
		  	'<td class="disc-turn">' + disc.turn + '</td>' +
		  	'<td class="disc-fade">' + disc.fade + '</td>' +
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
		glyph = $('#sort-' + sorter.sortProp).find('.glyphicon');
		if (!sorter.sortOn) {
			glyph.removeClass('glyphicon-sort-by-alphabet-alt');
		} else {
			if (sorter.sortAsc) {
				glyph.removeClass('glyphicon-sort-by-alphabet-alt');
				glyph.addClass('glyphicon-sort-by-alphabet');
			} else {
				glyph.removeClass('glyphicon-sort-by-alphabet');
				glyph.addClass('glyphicon-sort-by-alphabet-alt');
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

function exportList() {
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
          '<button type="button" class="btn btn-primary" fn-title="export">Export</button>'
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
					function: function($inner) {
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
		
	generateModal('Export List', $form, $footer, fns);
}

function generateModal(title, $body, $footer, fns) {
	$('.custom-modal').remove();
	var bodyText = '';
	var footerText = '';
	
	if ($body) {
		bodyText = $('<div></div>').append($body).html();
	}
	
	if ($footer) {
		footerText = $footer.html();
	}
	
	var $modal = $('<div class="modal custom-modal fade" tabindex="-1" role="dialog" aria-hidden="true"></div>');
	$modal.html('<div class="modal-dialog">' + 
            '<div class="modal-content">' + 
              '<div class="modal-header">' + 
              '<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
              '<h4 class="modal-title">' + (title ? title : '') + '</h4>' + 
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
     				fn.function($modal.find('.modal-body'));
     				$modal.modal('hide');
     			});
     		}
     	});
     }
     $modal.on('hidden.bs.modal', function (e) {
	  $modal.remove();
	});
     $modal.modal({show: true, backdrop: 'static'});
}

function generateCreateDiscForm() {
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
	                      '<textarea class="form-control" id="create-discnotes" rows="3" param="notes"></textarea>' +
	                  '</div>' +
	              '</div>' +
	              '<div class="form-group">' +
	                  '<label class="col-sm-2 control-label">Select Images</label>' +
	                  '<div class="col-sm-5">' +
	                      '<a href="#" class="thumbnail">' +
	                          '<img id="img-front" data-src="holder.js/100%x180" alt="Front">' +
	                      '</a>' +
	                  '</div>' +
	                  '<div class="col-sm-5">' +
	                      '<a href="#" class="thumbnail">' +
	                          '<img id="img-back" data-src="holder.js/100%x180" alt="Back">' +
	                      '</a>' +
	                  '</div>' +
	              '</div>');
               
     var $footer = $('<div></div>').html(
		'<button type="button" id="btn-add-disc" class="btn btn-primary" fn-title="create"><span><i class="fa fa-plus-circle fa-tools"></i></span>Add Disc</button>' +
		'<button type="button" class="btn btn-default" fn-title="close">Close</button>'
	);
	
	var fns = [
				{
					name: 'close',
					function: function() {
						console.log('Closed without exporting.');
					}
				},
				{
					name: 'create',
					function: function($inner) {
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
     generateModal('Add Disc', $form, $footer, fns);
}
	
function createDisc($form) {
	var disc = {};
	
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


/*-------------------------------------------------------------------------------------------*/
/*                                      CONTROLLER JQUERY                                    */
/*-------------------------------------------------------------------------------------------*/
/*
					                      /´¯/) 
					                    ,/¯../ 
					                   /..../ 
					              /´¯/'...'/´¯¯`·¸ 
					          /'/.../..../......./¨¯\ 
					        ('(...´...´.... ¯~/'...') 
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
               discs.push(data);
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
