var $navFilter;
var $sidePanel;
var $discInventory;
var $discInventoryList;

var zumpColorize;
var zumpInventory;
var zumpFilter;
var zumpPaginate;
var zumpAPI;

var userPrefs;

$(document).on("pagecreate", "#disc-inventory", function () { 
    
    $discInventory = $('#disc-inventory');
    $discInventoryList = $('#disc-inventory-container');
    $navFilter = $('#nav-filter');
    $sidePanel = $('#side-panel');
    
    
    $navFilter.on('vclick', function(e){
        e.stopPropagation();
        $sidePanel.panel('toggle');
        return false;
    });
    
    $sidePanel.on("panelopen", function (event, ui) { 
        $discInventoryList.css('overflow', 'hidden');
        $navFilter.addClass('active');
        $sidePanel.on("touchmove", function() {
            return false;
        });
    }).on("panelclose", function (event, ui) {
        $discInventoryList.css('overflow', 'auto');
        $navFilter.removeClass('active');
        $sidePanel.off("touchmove");
        $('.panel').hide();
        $('.panel-main').show();
    });
    
    $(document).on('swiperight', '#disc-inventory > .ui-panel-wrapper', function(e) {
        if (e.target != this) return;
        $sidePanel.panel('open');
    });
    
    $(document).on('vclick', '.panel-link-item', function(e){
        e.stopPropagation();
        navPanel($(this), true);
        return false;
    });
    
    $(document).on('vclick', '.btn-back', function(e) {
        e.stopPropagation();
        navPanel($(this), false);
        return false;
    });
    
    $(document).on('vmousedown', '.clickable', function(){
        $(this).addClass('item-active'); 
    }).on('vmouseup', '.clickable', function() {
        $(this).removeClass('item-active');
    });
    

    $('body').show();
    resizeInventory();
    $sidePanel.panel();
    $('.panel').not(':first-child').hide();
    
    zumpAPI = new ZumpAPI({
       onDataReady: function(success) {
           if (success) {
               updateInventory(true);
           } else {
               console.log('Unable to get disc list from sever.');
           }
       }
    });
    
    zumpColorize = new ZumpColorize({
       colorizeContainer: '#colorize-list',
       onUpdate: function(colorizePref) {
           userPrefs.colorize = colorizePref;
           updatePreferences();
           updateDiscs();
       }
    });
    
    zumpInventory = new ZumpInventory({
       inventoryList: '#disc-inventory-container',
       getColor: zumpColorize.getColor,
       getDisc: zumpAPI.getLocalDisc
    });
    
    zumpFilter = new ZumpFilter({
       filterContainer: '#filter-list',
       indicator: '#settings-filter>i',
       items: [
	        {property: 'name', hideContainer: true},
	        {text: 'Brand', property: 'brand'},
	        {text: 'Tags', property: 'tagList'},
	        {text: 'Type', property: 'type'},
	        {text: 'Material', property: 'material'},
	        {text: 'Weight', property: 'weight'},
	        {text: 'Color', property: 'color'},
	        {text: 'Speed', property: 'speed'},
	        {text: 'Glide', property: 'glide'},
	        {text: 'Turn', property: 'turn'},
	        {text: 'Fade', property: 'fade'}
	    ],
	    onFilterChange: function() {
	        zumpFilter.updateFilterState();
	        updateInventory();
	    }
    });
    
    zumpPaginate = new ZumpPaginate({
       list: '#disc-inventory-container',
       interval: 10,
       onListChange: function(items, done) {
           showDiscs(items);
           done();
       }
    });
    
    zumpAPI.getPreferences(function(success, prefs) {
       if (success) {
           userPrefs = prefs;
           userPrefs.colorize = zumpColorize.updateScheme(userPrefs.colorize);
           updatePreferences();
       } else {
           console.log('Unable to load user preferences.');
       }
    });
    zumpAPI.start();
    
});

function updatePreferences() {
    zumpAPI.updatePreferences(userPrefs, function(success, prefs) {
        if (success) {
           userPrefs = prefs;
       } else {
           console.log('Unable to update user preferences.');
       }
    })
}

function updateDiscs() {
    zumpInventory.updateAllDiscs();
}

function navPanel($this, moveForward) {
     var href = $this.attr('panel-href');

    var $nextPanel = $(href);
    
    if ($nextPanel.length) {
        var $parentPanel = $this.parents('.panel');
        var sidePanelWidth = $('#side-panel').outerWidth();
        var parentPanelWidth = $parentPanel.width();
        
        var distance = Math.ceil(((sidePanelWidth - parentPanelWidth)/2)) + parentPanelWidth;
        $parentPanel.width(parentPanelWidth);
        $parentPanel.animate({marginLeft : (moveForward ? '-' : '') + distance + 'px'}, 'fast', 'linear', function(){
            $parentPanel.hide().css({marginLeft: '0px'});
            $nextPanel.css({marginLeft : (!moveForward ? '-' : '') + distance + 'px', width: parentPanelWidth + 'px'});
            $nextPanel.show().animate({marginLeft: '0px'}, 'fast', 'linear');
        });
    }
    
}

function resizeInventory() {
    var height = $(window).height() - $('nav.navbar').height();
    $discInventoryList.css('maxHeight', height + 'px');
}

function updateInventory(generateFilters) {
	var discList = zumpFilter.filter(zumpAPI.discList(), generateFilters);
	zumpInventory.clearList();
	discList = zumpPaginate.refresh(discList);
}

function showDiscs(discList) {
	_.each(discList, function(disc) {
		zumpInventory.appendItem(disc);
		zumpAPI.getDiscImageById(disc._id, disc.primaryImage, zumpInventory.updateDiscImage);
	});
}

var ZumpInventory = function(opt) {
    
    //----------------------\
    // Javascript Objects
    //----------------------/
    var swipeThreshold = 50;
    var xCoord = -1;
    var yCoord;
    var isSwipe = false;
    var getColor = function() { return ''; };
    var getDisc = function() { return {}; };
    
    //----------------------\
    // Jquery Objects
    //----------------------/
    var $inventoryList;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialization based on options
    */
    this.init = function(opt) {
        if (!isDef(opt)) return;
        
        if (isDef(opt.inventoryList)) {
            $inventoryList = $(opt.inventoryList);
        }
        
        if (isDef(opt.getDisc) && _.isFunction(opt.getDisc)) {
            getDisc = opt.getDisc;
        }
        
        if (isDef(opt.getColor) && _.isFunction(opt.getColor)) {
            getColor = opt.getColor;
        }
        
        $.fn.extend({
           swipeDisc: function(open) {
                if (!open) {
                    $(this).removeClass('item-open').css('margin-left', '0px', 'fast').css('width', '100%');
                } else {
                    $(this).addClass('item-open').css('margin-left', '-150px', 'fast');
                }
            }
        });
        
        // Event Handlers
        $(document).on('vmousedown', '.disc-type-wrapper', function(e) {
                xCoord = e.pageX;
                yCoord = e.pageY;
                $(this).css('width', $(this).outerWidth());
                $.each($('.disc-type-wrapper').not(this), function(){
                    $(this).swipeDisc(false);
                });
        }).on('vmousemove', '.disc-type-wrapper', function(e) {
            if ($(this).hasClass('item-open')) return;
            
            var moved = e.pageX - xCoord;
            if (e.pageX <= xCoord) {
                if (isSwipe) {
                    $(this).css('margin-left', Math.max(-150, (e.pageX - xCoord)) + 'px');
                }
            }
            
            isSwipe = ((e.pageY <= yCoord + 5 && e.pageY >= yCoord - 5) && Math.abs(moved) > swipeThreshold) || isSwipe;
        }).on('vmouseup', '.disc-type-wrapper', function(e) {
            e.stopPropagation();
            var moved = e.pageX - xCoord;
            if ($(this).hasClass('item-open')) {
                if (moved >= 0) {
                    $(this).swipeDisc(false);
                }
            } else {
                if (moved < 0 && isSwipe) {
                    if (moved > -125) {
                        $(this).swipeDisc(false);
                    } else {
                        $(this).swipeDisc(true);
                    }
                } else {
                    if (moved > 50 && isSwipe) {
                        $sidePanel.panel('open');
                    }
                }
            }
            
            isSwipe = false;
        });
        
        $(document).on('vmousedown', '.disc-options > div', function() {
           $(this).addClass('vdown');
        }).on('vmouseup', '.disc-options > div', function(){
           $(this).removeClass('vdown'); 
        });
    }
    
    /*
    * Clears the inventory list
    */
    this.clearList = function() {
        $inventoryList.empty();
    }
    
    /*
    * Appends disc items to the inventory list
    */
    this.appendItem = function(disc) {
        var $item = $('<div class="disc-item-container"></div>');
        
        $item.append('<div class="disc-options">' +
                        '<div class="disc-option-edit">' +
                            '<i class="fa fa-pencil fa-lg"></i>' +
                        '</div>' +
                        '<div class="disc-option-delete">' +
                            '<i class="fa fa-minus-circle fa-lg"></i>' +
                        '</div>' +
                    '</div>' +
                    '<div class="disc-type-wrapper">' +
                        '<div class="disc-info-wrapper clickable">' +
                            '<div class="disc-item" discid="' + disc._id + '">' +
                                '<div class="disc-content-image-container">' +
                                    '<div class="disc-content-image">' +
                                        '<img src="https://placehold.it/90x90">' +
                                        '<i class="fa fa-spinner fa-spin"></i>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="disc-content-info-container">' +
                                    '<div>' +
                                        '<div class="disc-info-brand">' + disc.brand + '</div>' +
                                        '<div class="disc-info-name">' + disc.name + '</div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>');
        
        updateDisc($item, disc);
        $inventoryList.append($item);
    }
    
    this.updateAllDiscs = function() {
        
        $('.disc-item-container').each(function(i, val) {
            var id = $(this).find('.disc-item').attr('discid');
            var disc = getDisc(id);
            
            if (disc) {
                updateDisc($(this), disc);
            }
        });
    }
    
    /*
    * Updates the disc with the primary image if available
    */
    this.updateDiscImage = function (success, discImage) {
    	var $discItem = $('div.disc-item[discId="' + discImage.discId + '"]');
    	
    	if (success) {
    		$discItem.find('.disc-content-image img').attr('src', '/files/' + discImage.thumbnailId);
    	}
    	
    	$discItem.find('.disc-content-image').find('i.fa-spinner').remove();
    	$discItem.find('.disc-content-image').find('img').show();
    }
    
    //----------------------\
    // Private Functions
    //----------------------/
    var updateDisc = function($discItem, disc) {
        if (isDef(disc.type)) {
            var color = getColor(disc.type);
            
            if (isDef(color)) {
                $discItem.find('.disc-type-wrapper').css('background-color', color);
            }
        }
    }
    
    
    this.init(opt);
}

var ZumpPaginate = function(opt) {
    
    //----------------------\
    // Javascript Objects
    //----------------------/
    var interval = 5;
    var paginate = {start: 0, end: 0};
    var items;
    var onListChange;
    var fetching = false;
    
    //----------------------\
    // Jquery Objects
    //----------------------/
    var $list;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialization based on options
    */
    this.init = function(opt) {
        if (!isDef(opt)) return;
        
        if (isDef(opt.interval)) {
            interval = opt.interval;
        }
        
        if (isDef(opt.onListChange) && _.isFunction(opt.onListChange)) {
            onListChange = opt.onListChange;
        }
            
        if (isDef(opt.list)) {
            $list = $(opt.list);
        }
        
        $list.scroll(function(e) {
            if ($list[0].scrollHeight - 
            (!fetching && $list.scrollTop() + $list.height()) < 50) {
                fetching = true;
                if (paginate.end < items.length) {
                    paginate.start = paginate.end;
                    paginate.end += interval;
                    loaderDisplay(true);
                    triggerUpdate();
                    
                }
            }
        });
    }
    
    this.refresh = function(arr) {
        paginate = {start: 0, end: interval};
        items = arr;
        return triggerUpdate();
    }
    
    //----------------------\
    // Private Functions
    //----------------------/
    
    /*
    * Triggers a subset of the items to be sent to the list change callback
    */
    var triggerUpdate = function() {
        var subset = items.slice(paginate.start, Math.min(items.length, paginate.end));
        onListChange(subset, function() { fetching = false; loaderDisplay(); });
    }
    
    var loaderDisplay = function(show) {
        if (show) {
            $list.append('<div class="inventory-loader">Loading... <i class="fa fla-spinner fa-spin"></i><div>');
            $list.scrollTop($list[0].scrollHeight - $list.height());
        } else {
            $list.find('.inventory-loader').remove();
        }
    }
    
    
    this.init(opt);
}

/*
* Name: ZumpColorize
* Date: 01/30/2015
*/
var ZumpColorize = function(opt) {
    
    //----------------------\
    // Javascript Objects
    //----------------------/
    var onUpdate;
    var colorize = {
        'putter'         : { text : 'Putt/Approach', color: 'rgb(251, 131, 131)'},
        'mid'            : { text : 'Mid-range', color: 'rgb(251, 221, 131)'},
        'fairway'        : { text : 'Fairway Driver', color: 'rgb(139, 251, 131)'},
        'distance'       : { text : 'Distance Driver', color: 'rgb(131, 219, 251)'},
        'mini'           : { text : 'Mini', color: 'rgb(165, 131, 251)'}
    };
    
    var colorOptions = ['rgb(251, 131, 131)', 'rgb(251, 181, 131)', 'rgb(251, 221, 131)',
                        'rgb(215, 251, 131)', 'rgb(139, 251, 131)', 'rgb(131, 251, 239)',
                        'rgb(131, 219, 251)', 'rgb(131, 167, 251)', 'rgb(165, 131, 251)',
                        'rgb(233, 131, 251)', 'rgb(251, 131, 175)', 'rgb(180, 185, 202)'
                        ];
    
    
    //----------------------\
    //JQuery Objects
    //----------------------/
    var $colorizeContainer;
    var $popup;
    
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialization based on options
    */
    this.init = function(opt) {
        // No options passed
        if (!isDef(opt)) return;
        
        if (isDef(opt.colorizeContainer)) {
            $colorizeContainer = $(opt.colorizeContainer);
        }
        
        if (isDef(opt.onUpdate) && _.isFunction(opt.onUpdate)) {
            onUpdate = opt.onUpdate;
        }
        
        $(document).on('vclick', '.colorize-item', function(e) {
            e.stopPropagation();
			var type = $(this).attr('id').match(/item-([a-zA-Z]+)/)[1];
            $popup = createPopup(type);
            $popup.popup('open');
            $('.ui-popup-container').css({'top': $('.settings-panel:visible').offset().top});
            return false;
        });
        
        $(document).on('vclick', '.color-option', function(e) {
            e.stopPropagation();
		    var type = $popup.attr('id').match(/popup-([a-zA-Z]+)/)[1];
            var index = $(this).attr('color');
            
            colorize[type].color = colorOptions[parseInt(index)];
            $popup.popup('close');
            initializeMenu();
            if (onUpdate) onUpdate(getColorizePref());
            return false;
        });
        
        initializeMenu();
    }
    
    /*
    * Update color scheme
    */
    this.updateScheme = function(scheme) {
        for (var i in colorize) {
            var color = scheme[i];
            if (color == '') {
                scheme[i] = colorize[i].color;  
            } else {
                colorize[i].color = color;
            }
        }
        
        initializeMenu();
        if (onUpdate) onUpdate(getColorizePref());
        
        return scheme;
    }
    
    /*
    * Returns color based on disc type
    */
    this.getColor = function(discType) {
        for (var i in colorize) {
            if (colorize[i].text == discType) {
                return colorize[i].color;
            }
        }
    }
    
    //----------------------\
    // Priate Functions
    //----------------------/
    
    /*
    * Return color prefs
    */
    var getColorizePref = function() {
        var colorizePref = {};
        
        for (var i in colorize) {
            colorizePref[i] = colorize[i].color;
        }
        
        return colorizePref;
    }
    
    /*
    * Create menu
    */
    var initializeMenu = function() {
        $colorizeContainer.empty();
        for (var type in colorize) {
            var html = '<a class="list-group-item colorize-item" id="colorize-item-' + type + '">' + 
                            colorize[type].text + '<i class="fa fa-square fa-fw pull-right" style="color: ' + colorize[type].color + '"></i>' +
                        '</a>';
            $colorizeContainer.append(html);
        }
        
    }
    
    /*
    * Create popup menu
    */
    var createPopup = function(type) {
        var $popup = $('<div data-role="popup" class="filter-item-parent" id="colorize-popup-' + type + '"></div>');
        var inner = '';
        
        for (var i in colorOptions) {
            inner += '<div class="color-option clickable" color="' + i + '"><i class="fa fa-square fa-fw" style="color:' + colorOptions[i] + '"></i></div>';
        }
        
        $popup.html(
            '<div class="panel panel-dark">' +
                '<div class="panel-heading">' +
                    colorize[type].text + 
                '</div>' +
                '<div class="colorize-list popup-list">' +
                    '<div class="colorize-list-group">' +
                    inner +
                    '<div class="clearfix"></div>' +
                    '</div>' + 
                '</div>' +
            '</div>'
            );
            
        $('body').append($popup);
        
        $popup.popup({
            overlayTheme: 'b',
            transition: 'pop',
            popsitionTo: 'window',
            icon: 'false',
            create: function(event, ui) {
                var height = $(window).height() -
                    $('.settings-panel:visible').offset().top - 150;
                $(this).find('.popup-list').css({
                    maxHeight: height
                });
            },
            beforeposition: function(event, ui) {
                var $list = $popup.find('.colorize-list-group');
                var widthMult = Math.floor($list.width() / 80);
                $list.width(widthMult * 80);
            },
            afteropen: function(event, ui) {
                $('body').find('.ui-popup-screen').on( "vmousedown", function(e) { 
                    e.stopPropagation();
                    return false;
                });
            },
            afterclose: function(event, ui) {
                $(this).remove();
            }

        });
        
        return $popup;
    }
    
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
    var filterObj = this;
    var filters = {};
    var filterItems = {};
    var filterChangeEvent;
    
    
    //----------------------\
    //JQuery Objects
    //----------------------/
    var $filterContainer;
    var $popup;
    var $indicator;
    
    
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
        
        if (isDef(opt.indicator)) {
            $indicator = $(opt.indicator);
        }
        
        // Set filter array
        if (isDef(opt.items)) {
            _.each(opt.items, function(item) {
                if (isDef(item.property)) {
                    // Create your div to add to screen using data
                    if (!item.hideContainer) createFilterItem(item);
                    
                    // Create your array based on data
                    filters[item.property] = [];
                    filterItems[item.property] = [];
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
        $(document).on('vclick', '.filter-item', function(e) {
            e.stopPropagation();
			var property = $(this).attr('id').match(/container-([a-zA-Z]+)/)[1];
            $popup = generateFilterPopup(property);
            $popup.popup('open');
            $('.ui-popup-container').css({'top': $('.settings-panel:visible').offset().top});
            return false;
        });
        
        $(document).on('vclick', '.filter-option:not(.filter-option-static)', function(e){
			e.stopPropagation();
			
			var glyph = $(this).children('span.glyphicon');
			
			if (glyph.length > 0) {
			    glyph.remove();
			} else {
			    $(this).append('<span class="glyphicon glyphicon-ok pull-right" aria-hidden="true"></span>');
			}
			
            return false;
	    });
	    
	    $(document).on('vclick', '.filter-accept', function(e) {
            e.stopPropagation();
	       
            $('.filter-option:not(.filter-option-static)').each(function() {
                var $parent = $(this).parents('.filter-item-parent');
            	var option = $parent.attr('id').match(/popup-([a-zA-Z]+)/)[1];
            	var val = $(this).attr('filteron');
            	var glyph = $(this).children('span.glyphicon');
            	
            	if (glyph.length > 0 && !_.contains(filters[option], val)) {
            		filters[option].push(val);
            	} else {
            		filters[option] = _.without(filters[option], val);
            	}
            });
	       
			if (isDef(filterChangeEvent)) filterChangeEvent(); 
			
			$popup.popup('close');
			return false;
	    });
	    
	    $(document).on('vclick', '.filter-cancel', function(e) {
            e.stopPropagation();
			$popup.popup('close');
			return false;
	    });
        
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
    
     /*
    * Update filter state
    */
    this.updateFilterState = function() {
        var isActive = false;
        
        for (var property in filters) {
            var $filterItem = $('#filter-container-' + property);
            if (filters[property].length > 0) {
                isActive = true;
                $filterItem.addClass('filter-active');
                $filterItem.find('.fa').removeClass('fa-circle-o').addClass('fa-dot-circle-o');
            } else {
                $filterItem.removeClass('filter-active');
                $filterItem.find('.fa').removeClass('fa-dot-circle-o').addClass('fa-circle-o');
            }
        }
        
        if (isActive) {
            $indicator.addClass('filter-active');
        } else {
            $indicator.removeClass('filter-active');
        }
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
    var createfilterPanel = function(property, text) {
        var $sidePanel = $('<a class="list-group-item filter-item"></a>');
        
        $sidePanel.attr('id', 'filter-container-' + property);
        $sidePanel.html(text + ' <i class="fa fa-circle-o fa-fw pull-right"></i>');
                        
        return $sidePanel;
    }
    
    /*
    * Generates and adds the HTML for a new filter item
    */
    var createFilterItem = function(item) {
        var $filterPanel = createfilterPanel(item.property, getSafe(item.text, item.property));
        $filterContainer.append($filterPanel);
    }
    
    /* Creates a popup of items */
    var generateFilterPopup = function(property) {
        var popupText = $("#filter-container-" + property).text().trim();
        
        var $popup = $('<div data-role="popup" class="filter-item-parent" id="filter-popup-' + property + '"></div>');
        var inner = '';
        
        _.each(filterItems[property], function(item) {
            inner += generateFilterOption(item, _.contains(filters[property], String(item)));
        });
        
        $popup.html(
            '<div class="panel panel-dark">' +
                '<div class="panel-heading">' +
                    popupText + 
                '</div>' +
                '<div class="filter-list popup-list">' +
                    '<ul class="list-group">' +
                    inner +
                    '</ul>' + 
                '</div>' +
                '<div class="panel-footer filter-footer">' +
                    '<div class="footer-item filter-cancel clickable">Cancel</div>' +
                    '<div class="footer-item filter-accept clickable">Accept</div>' +
                    '<div class="clearfix"></div>' +
                '</div>' +
            '</div>'
            );
            
        $('body').append($popup);
        
        $popup.popup({
            overlayTheme: 'b',
            transition: 'pop',
            popsitionTo: 'window',
            icon: 'false',
            dismissible: false,
            create: function(event, ui) {
                var height = $(window).height() -
                    $('.settings-panel:visible').offset().top - 150;
                $(this).find('.popup-list').css({
                    maxHeight: height
                });
            },
            afteropen: function(event, ui) {
                $('body').find('.ui-popup-screen').on( "vmousedown", function(e) { 
                    e.stopPropagation();
                    return false;
                });
            },
            afterclose: function(event, ui) {
                $(this).remove();
            }

        });
        
        return $popup;
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
    	
    	filterItems[property] = items;
    }
    
    /*
    * Returns a div containing the filter option item
    */
    var generateFilterOption = function(option, isChecked) {
    	var optionText = option;
    	
    	if(option === '' || typeof option === 'undefined') {
    		optionText = '- None -';
    	}
    	
    	return '<li class="list-group-item filter-option clickable" filteron="' + option + '">' + optionText + 
    	    (isChecked ? '<span class="glyphicon glyphicon-ok pull-right" aria-hidden="true"></span>' : '' ) + '</li>';
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
* Name: ZumpAPI
* Date: 01/28/2015
*/
var ZumpAPI = function(opt) {
    
    //----------------------\
    // Javascript Objects
    //----------------------/
    var discs = [];
    var url = "/api/";
    var onDataReady;
    
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
        
        if (isDef(opt.onDataReady) && _.isFunction(opt.onDataReady)) {
            onDataReady = opt.onDataReady;
        }
    }
    
    /*
    * Initializes the discs
    */
    this.start = function() {
         getAllDiscs(onDataReady);
    }
    
    /*
    * Returns the cached disc item
    */
    this.getLocalDisc = function(discId) {
        return _.first(_.where(discs, {'_id' : discId}));
    }
    
    /*
    * Returns disc list
    */
    this.discList = function() {
        return discs;
    }
    
    /*
    * Get user preferences
    */
    this.getPreferences = function(callback) {
        var success = false;
    	var prefs = {};
        $.ajax({
    		type: "GET",
    		dataType: "json",
    		url: url + 'account/preferences',
    		contentType: "application/json",
    		success: function (data) {
    		   	if(isDef(data)) {
    				prefs = data;
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
    				callback(success, prefs);
    			}
    		}
         });
    }
    
    /*
    * Update preferences
    */ 
    this.updatePreferences = function(prefs, callback) {
        var success = false;
    	var retData = {};
        $.ajax({
    		type: "PUT",
    		dataType: "json",
    		data: JSON.stringify(prefs),
    		url: url + 'account/preferences',
    		contentType: "application/json",
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
    			
    			retData = data;
    			success = true;
    		},
    		error: function (request, textStatus, errorThrown) {
    			console.log(request.responseText);
    			console.log(textStatus);
    			console.log(errorThrown);
    		},
    		complete: function(){
    			if (callback) {
    				callback(success, retData);
    			}
    		}
         });
    }
    
    /*
    * Get disc by identifier
    */
    this.getDiscById = function(discId, callback) {
    	var success = false;
    	var disc = {};
        $.ajax({
    		type: "GET",
    		dataType: "json",
    		url: url + 'discs/' + discId,
    		contentType: "application/json",
    		success: function (data) {
    		   	if(data && typeof data._id != 'undefined') {
    				discs = _.filter(discs, function(disc){
    					return disc._id != data._id;
    				});
    				discs.push(data);
    				disc = data;
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
    				callback(success, disc);
    			}
    		}
         });
    }
    
    /*
    * Create disc
    */
    this.postDisc = function(disc, callback) {
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
    
    /*
    * Update disc
    */
    this.putDisc = function(disc, callback) {
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
    
    /*
    * Delete disc
    */
    this.deleteDisc = function(discId, callback) {
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
    
    /*
    * Get all images for a single disc
    */
    this.getAllDiscImages = function(discId, callback) {
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
    
    /*
    * Get Disc Image Object based on Id
    */
    this.getDiscImageById = function(discId, imageId, callback) {
    	if (!isDef(imageId)) {
    		return callback(false, {discId: discId});
    	}
    	
    	var success = false;
    	var image = {discId: discId};
        $.ajax({
    		type: "GET",
    		dataType: "json",
    		url: url + 'images/' + imageId,
    		contentType: "application/json",
    		success: function (data) {
    		   	image = data;
    			success = true;
    		},
    		error: function (request, textStatus, errorThrown) {
    			console.log(request.responseText);
    			console.log(textStatus);
    			console.log(errorThrown);
    		},
    		complete: function(){
    			if (callback) {
    				callback(success, image);
    			}
    		}
         });
    }
    
    //----------------------\
    // Private Functions
    //----------------------/
    
    /*
    * Grab All Discs
    */
    var getAllDiscs = function(callback) {
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
    
    this.init(opt);
}

