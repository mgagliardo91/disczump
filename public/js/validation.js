var ZumpValidate = function(opt) { 
    var zumpValidate = this;
    var items = [];
    var clientCb;
    var feedbackOnInit = false;
    var emailRegex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    var usernameRegex = /^[a-zA-Z0-9_]*$/;
    var zipCodeRegex = /^\d{5}$/;
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
                validate(item.id, undefined, 'keyup'); 
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
                            var isCurrent = isDef(item.data) ? item.data && item.data == val : false;
                            var available = !retData.count || isCurrent;
                            var availableText = isCurrent ? 'Current Username' : (available ? 'Available' : 'Unavailable');
                            $('#' + item.output).text(availableText);
                            callback($input, available);
                        } else {
                            handleError(retData);
                        }
                    });
                } else {
                    $('#' + item.output).text('');
                }
                
            } else if (item.type == 'zipcode') {
                isValid = val.length == 0 ? undefined : zipCodeRegex.test(val);
                
                if (isValid) {
                    shouldCb = false;
                    getCityState(val, function(success, cityState) {
                        if (success) {
                            $('#' + item.output).text(cityState);
                        } else {
                            //Ignore error in the case that zip code is not found.
                        }
                    });
                    callback($input, isValid);
                } else {
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