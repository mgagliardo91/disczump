var ZumpValidate = function(opt) { 
    var zumpValidate = this;
    var items = [];
    var clientCb;
    var feedbackOnInit = false;
    var emailRegex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    var usernameRegex = /^[a-zA-Z0-9_]*$/;
    var numberRegex = /^-*[0-9]+$/;
    
    this.init = function(opt) {
        if (isDef(opt.items)) {
            items = opt.items;
        }
        
        if (isDef(opt.callback)) {
            clientCb = opt.callback;
        }
        
        if (isDef(opt.feedbackOnInit)) {
            feedbackOnInit = opt.feedbackOnInit;
        }
        
        setupListeners();
    }
    
    this.setInitValues = function(initVals) {
        _.each(_.keys(initVals), function(key) {
            var item = _.findWhere(items, {id: key});
            
            if (item) {
                item.initVal = initVals[key];
            }
        });
        
        zumpValidate.doValidate();
    }
    
    this.getValue = function(id) {
        var retVal;
        var item = _.findWhere(items, {id: id});
        
        if (item) {
            if (item.type == 'zipcode') {
                return item.dropdown.GetSelection();
            } else if (item.type == 'checkbox') {
                return $('#' + item.id).attr('checked');
            } else {
                return $('#' + item.id).val().trim();
            }
        }
        
        return retVal
    }
    
    this.triggerResize = function() {
         _.each(items, function(item) {
            if (item.type == 'zipcode') {
                item.dropdown.triggerResize();
            }
        });
    }
    
    this.doValidate = function() {
        _.each(items, function(item) {
            validate(item.id, undefined, 'keyup'); 
        });
        
        return zumpValidate.isAllValid();
    }
    
    this.isAllValid = function() {
        var invalid = _.filter(items, function(item) {
            return item.optional ? (typeof(item.isValid) !== 'undefined' && !item.isValid) 
                : !item.isValid;
        });
        
        return invalid.length == 0;
    }
    
    this.getValidChanges = function() {
        var validChanges = {};
        
        _.each(items, function(item) {
            if (item.isValid) {
                validChanges[item.id] = zumpValidate.getValue(item.id);
            }
        });
        
        return validChanges;
    }
    
    this.getInvalidItems = function() {
        var invalidItems = _.filter(items, function(item) {
            return item.optional ? (typeof(item.isValid) !== 'undefined' && !item.isValid) 
                : !item.isValid;
        });
        
        return invalidItems;
    }
    
    this.updateItem = function(id, field, val) {
        var curItem = _.findWhere(items, {id: id});
        curItem[field] = val;
        
        if (curItem) {
            items = _.reject(items, {id: id});
            items.push(curItem);
            validate(curItem.id, undefined, 'keyup');
        }
    }
    
    var setupListeners = function() {
        _.each(items, function(item) {
           var $input = $('#' + item.id);
           
            if ($input.length) {
               
                if (typeof item.type !== 'undefined' && item.type != 'none') {
                    $input.on('keyup paste change leave', handleEvent);
                    
                    if (item.type == 'zipcode') {
                            item.dropdown = new ZumpDropdown({
                        	minLength: 5,
                    		inputElement: $input,
                    		searchProp: 'zipcode',
                    		getResults: function(val, callback) {
                    		    return getCityState(encodeURI(val), callback);
                    		},
                    		getString: function(item) {
                    			return item.formatted;
                    		},
                            onSelection: function(result, reset) {
                           		validate($input.attr('id'), undefined, 'ZumpDropdown');
                           		$('#' + item.output).text(result.formatted);
                            }
                    	});
                    }
                } else {
                    item.isValid = true;
                }
                
                if (typeof item.hint !== 'undefined') {
                    $input.tooltip(generateTooltipOptions('top', 'focus', item.hint, '200px'));
                }
            } else {
                items = _.without(items, item);
            }
        });
        
        setTimeout(function() {
            _.each(items, function(item) {
                validate(item.id, undefined, 'ZumpInit'); 
            });  
        },500);
    }
    
    function generateTooltipOptions(placement, trigger, title, width) {
    	return {
    		delay: { "show": 200, "hide": 100 },
    		placement: placement,
    		trigger: trigger,
    		title: title,
    		template: '<div class="tooltip" role="tooltip" style="width: ' + width + ';">' +
    					'<div class="tooltip-arrow"></div>' +
    					'<div class="tooltip-inner"></div>' +
    					'</div>'
    	};
    }
    
    var callback = function($item, isValid) {
        var item = _.findWhere(items, {id: $item.attr('id')});
        
        if (item) {
            item.isValid = isValid;
        }
        
        if (_.has(item, 'isInit') || feedbackOnInit) {
            if (clientCb) {
                clientCb($item, isValid, item.required);
            } else {
                defaultFeedback($item, isValid);
            }
        } else {
            item.isInit = true;
        }
        
    }
    
    var handleEvent = function(e) {
        if (e.keyCode == 9 || e.keyCode == 16) return;
        var $this = $(this);
        
        if (e.type == 'keyup') {
            delay(function() {
                validate($this.attr('id'), $this, e.type);
            }, 500 );
        } else {
            validate($this.attr('id'), $this, e.type);
        }
    }
    
    var validate = function(id, $input, eventType) {
        if (typeof $input === 'undefined') {
            $input = $('#' + id);
        }
        
        var val = $input.val();
        
        var isValid = undefined;
        var shouldCb = true;
        var item = _.findWhere(items, {id: id});
        
        if (item) {
            var hasRef = _.findWhere(items, {refId: id});
            if (hasRef) {
                validate(hasRef.id);
            }
            
            if (typeof item.initVal !== 'undefined' && val == item.initVal) {
                
                if (item.type == 'username') {
                    $('#' + item.output).text('Current Username');
                }
                
                return callback($input, undefined);
            }
            
            if (item.min) {
                isValid = val.length == 0 ? undefined : val.length >= item.min;
                if (!(typeof isValid === 'undefined') && !isValid)  {
                    if (item.output) $('#' + item.output).text('');
                    return callback($input, isValid);
                }
            }
            
            if (item.max) {
                isValid = val.length == 0 ? undefined : val.length <= item.max;
                if (!(typeof isValid === 'undefined') && !isValid)  {
                    if (item.output) $('#' + item.output).text('');
                    return callback($input, isValid);
                }
            }
            
            if (item.type == 'checkbox') {
                var testVal = item.value ? item.value : true;
                val = $input.is(':checked');
                
                isValid = val == testVal;
                return callback($input, isValid);
            } else if (item.type == 'email') {
                isValid = (val.length == 0 ? undefined : emailRegex.test(val));
                if (!(typeof isValid === 'undefined') && !isValid) return callback($input, isValid);
                
            } else if (item.type == 'compare') {
                var ref = $('#' + item.refId);
                
                if (ref.length) {
                    isValid = ref.val().length == 0 ? undefined : val === ref.val();
                    if (!(typeof isValid === 'undefined') && !isValid) return callback($input, isValid);
                }
                
            } else if (item.type == 'function') {
                if (item.fn) {
                    isValid = item.fn(val);
                    if (!(typeof isValid === 'undefined') && !isValid) return callback($input, isValid);
                }
                
            } else if (item.type == 'number') {
                isValid = val.length == 0 ? undefined : numberRegex.test(val);
                
            } else if (item.type == 'username') {
                isValid = val.length == 0 ? undefined : usernameRegex.test(val);
                
                if (isValid) {
                    shouldCb = false;
                    queryUser('username', val, function(success, retData) {
                        if (success) {
                            var availableText = (!retData.count ? 'Available' : 'Unavailable');
                            $('#' + item.output).text(availableText);
                            callback($input, !retData.count);
                        } else {
                            handleError(retData);
                        }
                    });
                } else {
                    $('#' + item.output).text('');
                }
                
            } else if (item.type == 'zipcode') {
                
                if (eventType == 'ZumpInit') {
                    return callback($input, undefined);
                }
                
                if (!item.dropdown.SelectionComplete() && val.length >= 5) {
                    $('#' + item.output).text('');
                    return callback($input, false);
                }
                
                isValid = val.length == 0 ? undefined : item.dropdown.SelectionComplete();
                if (!isValid) {
                    $('#' + item.output).text('');
                }
                
            } else if (item.type == 'none') {
                return;
            }
            
            if (shouldCb) callback($input, isValid);
        }
    }
    
    var delay = (function(){
      var timer = 0;
      return function(callback, ms){
        clearTimeout (timer);
        timer = setTimeout(callback, ms);
      };
    })();
    
    var defaultFeedback = function ($input, isValid) {
        if (isValid != undefined) {
            $input.parent().removeClass((isValid ? 'has-error' : 'has-success'))
                .addClass((isValid ? 'has-success' : 'has-error'));
        } else {
            $input.parent().removeClass('has-success').removeClass('has-error');
        }
    }
    
    this.init(opt);
}

var ZumpDropdown = function(opt) {

    //----------------------\
    // Javascript Objects
    //----------------------/
	var zumpDropdown = this;
	var resultList = [];
	var property = undefined;
	var getResults = undefined;
	var getString = undefined;
	var curSelection = undefined;
    var currentSearch = '';
    var onSelection;
    var minLength = -1;
    var tabTrigger = false;
    var cityReq = undefined;
	
	//----------------------\
    //JQuery Objects
    //----------------------/
    var $input;
    var $dropdown;
    var $dropdownList;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    
    this.GetSelection = function() {
        return curSelection;
    }
    
    this.SelectionComplete = function() {
        return typeof curSelection !== 'undefined';
    }
    
    this.triggerInput = function() {
        setInput($input.val(), true, function() {
            if (resultList.length) {
                curSelection = resultList[0];
            
                if (onSelection) {
    	        	onSelection(curSelection, zumpDropdown.resetInput);
    	        }
            }
        });
    }
    
    this.init = function(opt) {
    	
		/*
        * Grab input element from options
        */
        if (isDef(opt.inputElement)) {
        	if (opt.inputElement instanceof jQuery) {
        		$input = opt.inputElement
        	} else if (_.isString(opt.inputElement)) {
            	$input = $(opt.inputElement);
        	}
            createDropdown();
        }
        
        if (isDef(opt.minLength)) {
        	minLength = opt.minLength;
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
        if (isDef(opt.getResults)) {
            if (_.isFunction(opt.getResults)) {
                getResults = opt.getResults;
            }
        }
        
        /*
        * Grab current set of items
        */
        if (isDef(opt.getString)) {
            if (_.isFunction(opt.getString)) {
                getString = opt.getString;
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
        $(window).on('resize', function(){
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
	    	
	    	else if (code == 9 && $dropdownList.is(':visible') && !curSelection) {
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
		        } else { 
		            updateInput($dropdownList.find('.dropdown-list-item').first().attr('result'), true);
		        }
		        
		        if (onSelection) {
	        		onSelection(curSelection, zumpDropdown.resetInput);
		        }
		        
		        $curActive.removeClass('active');
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
			 	
			 	if ($('.dropdown-list-item').length) {
			 	    setResultsVisibility(true);
			 	}
			 	
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
			    	
			    	var result = getResult($nextActive.attr('result'));
			    	if (result) {
			    		$input.val(getString(result));
			    	}
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
			     setInput($input.val());
			 }
			 
	    })
	    
	    /*
	    * Show results on click
	    */
	    .on('click', function(e){
	    	e.preventDefault();
	    	setInput($input.val());
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
	        	onSelection(curSelection, zumpDropdown.resetInput);
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
    
    this.triggerResize = function() {
    	resizeResultContainer();
    }
    
    //----------------------\
    // Private Functions
    //----------------------/
    
    /*
    * Update Results Container Scroll Position
    */
    var updateScroll = function($activeResult) {    	
        var curTop = $dropdown.scrollTop();
    	var curBottom = curTop + $dropdown.height();
    	var resultTop = $activeResult.position().top;
    	var resultBottom = resultTop  + $activeResult.outerHeight(true);
    	
    	if (resultTop < curTop) { 
    		$dropdown.scrollTop(resultTop);	
    	} else if (resultBottom > curBottom) {
    		$dropdown.scrollTop(resultBottom - $dropdown.height());
    	}
    }
    
    /*
    * Update Input
    */
    var updateInput = function(resultId, hideAlways) {
    	var result = getResult(resultId);
    	
    	if (result) {
    		curSelection = result;
    		$input.val(result[property]);
    	} else {
    		curSelection = undefined;
    		$input.val('');
    	}
    	
    	currentSearch = result[property];
    	setInput(result[property], hideAlways);
    }
    
    var getResult = function(resultId) {
    	return _.findWhere(resultList, {resultId: resultId});
    }
    
    /*
    * Set Input
    */
    var setInput = function(newVal, hideAlways, callback) {
    	if (newVal.length < minLength) {
			curSelection = undefined;
    		setResultsVisibility(false);
    		return;
    	}
    	
    	if (isDef(newVal)) {
    		if (currentSearch == newVal) {
    			setResultsVisibility(!hideAlways && resultList.length);
    			return;
    		}
    		
			currentSearch = newVal;
			curSelection = undefined;
    	}
    	
    	updateResults(function(vis) {
    	    setResultsVisibility(vis && !hideAlways);
    	    if (callback) {
    	        callback(); 
    	    }
    	});
    }
    
    /*
    * Update Results
    */
    var updateResults = function(callback) {
    	$dropdownList.empty();
    	
    	if (cityReq) {
    	    cityReq.abort();
    	}
    	
		cityReq = getResults(currentSearch, function(success, results) {
		    if (success) {
		        resultList = [];
		        _.each(results, function(result) {
    				result.resultId = '' + ( _.random(10000, 99999));
    				resultList.push(result);
    				var resultHtml = generateResult(result);
    				$dropdownList.append(resultHtml);
    			});
		    }
			
			return callback(resultList.length > 0);
		});
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
	    	
	    	$dropdown.css({
	    		width: $input.outerWidth() + 'px',
	    		left: leftOff, 
	    		top: topOff + $input.outerHeight()
	    	});
        }
    }
    
    /*
    * Creates the dropdown div/list to hold result items
    */
    var createDropdown = function() {
        $dropdown = $('<div class="dropdown-list-display" tabindex="-1">' +
                        '<ul class="list-unstyled dropdown-search-list">' +
                        '</ul>' +
                    '</div>');
        $dropdownList = $dropdown.find('.dropdown-search-list');
        $input.after($dropdown);
    }
    
    /*
    * Creates the result items for dropdowns
    */
    var generateResult = function(result) {
    	
        return '<li class="dropdown-list-item" tabindex="0" result="' + result.resultId + '">' +
                    getString(result) +
                '</li>';
    }
    
    this.init(opt);
}