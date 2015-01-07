/*
* Name: ZumpSort
* Date: 01/07/2015
*/
var ZumpSort = function(opt) {
    
    //----------------------\
    // Javascript Objects
    //----------------------/
    
    var sort = [];
    
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
        if (!opt.isDef()) return;
        
        // Set sort toggle
        if (opt.sortToggle.isDef()) {
            $sortToggle = $(opt.sortToggle);
        }
        
        // Set sort container
        if (opt.sortContainer.isDef()) {
            $sortContainer = $(opt.sortContainer);
            
            $sortContainer.sortable({
                placeholder: 'sort-field-placeholder',
                handle: '.sort-field-arrange'
            });
        }
        
        // Set sort trigger
        if (opt.addSortTrigger.isDef()) {
            $addSortTrigger = $(opt.addSortTrigger);
        }
        
        // Set sort fields
        if (opt.sortFields.isDef()) {
            sort = [];
            _.each(opt.sortFields, function(sortField) {
                if (sortField.property.isDef()) {
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
        
        // Add Sort Field
        $addSortTrigger.mousedown(function(){
            $(this).addClass('mdown');
        }).mouseup(function(){
            $(this).removeClass('mdown');
        }).click(function(){
           addSortField();
        });
        
        // Remove Sort Field
        $(document).on('click', '.sort-field-remove', function() {
            if ($('.sort-field-container').length > 1) {
                $(this).parents('.sort-field-container').remove();
                updateSortFields();
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
        	updateSortFields();
        });
        
        // Change for Direction Select
        $(document).on('change', '.sort-option-direction', function(){
        	updateSortFields();
        });
    }
    
    /*
    * Sorts an array based on a sorter object
    */
    this.genericSort = function(sorter, array) {
    	if (sorter.sortType == 'number') {
    		array = _.sortBy(array, function(obj) { return parseInt(obj[sorter.sortProp])});
    	} else {
    		array = _.sortBy(array, sorter.sortProp);
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
    	var sorted = arr;
    	
    	var lastSort;
    	_.each(toSort, function(sorter) {
    		if (typeof lastSort === 'undefined') {
    			sorted = this.genericSort(sorter, sorted);
    		} else {
    			var parentVals = _.groupBy(sorted, function(obj) { return obj[lastSort.sortProp]; });
    			var newArray = [];
    			_.each(parentVals, function(valArray) {
    				valArray = this.genericSort(sorter, valArray);
    				newArray = newArray.concat(valArray);
    			});
    			sorted = newArray;
    		}
    		lastSort = sorter;
    	});
    	 
    	return sorted;
    }
    
    //----------------------\
    // Private Functions
    //----------------------/
    
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
    var addSortField = function() {
        $sortContainer.append(createSortField());
        $sortContainer.find('.sort-field-container:last-child .sort-option-select').trigger('change');
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
    	$('.sort-field-container').each(function(i) {\
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
    	var sorter = _.first(_.where(sort, {'sortProp': option}));
    	if (sorter !== undefined) {
    		if (enable.isDef()) sorter.sortOn = enable;
    		if (isAsc.isDef()) sorter.sortAsc = isAsc;
    		if (index.isDef()) {
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

function getSafe(obj, backup) {
    return obj.isDef() ? obj : backup;
}

Function.prototype.isDef = function() {
    return typeof this !== 'undefined';
}






// Usage
var MySort = new ZumpSort({
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
    ]
});

