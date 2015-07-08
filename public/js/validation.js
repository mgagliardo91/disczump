var ZumpValidate = function(opt) {
    var items = [];
    var clientCb;
    var feedbackOnInit = false;
    var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    
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
    
    this.isAllValid = function() {
        var invalid = _.filter(items, function(item) {
            return (item.isValid == undefined || !item.isValid);
        });
        
        return invalid.length == 0;
    }
    
    var setupListeners = function() {
        _.each(items, function(item) {
           var $input = $('#' + item.id);
           
            if ($input.length) {
               
                if (typeof item.type !== 'undefined' && item.type != 'none') {
                    $input.on('keyup paste change', handleEvent);
                } else {
                    item.isValid = true;
                }
                
                if (typeof item.hint !== 'undefined') {
                    $input.tooltip(generateTooltipOptions('left auto', 'focus', item.hint, '200px'));
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
                clientCb($item, isValid);
            } else {
                defaultFeedback($item, isValid);
            }
        } else {
            item.isInit = true;
        }
        
    }
    
    var handleEvent = function(e) {
        if (e.keyCode == 9 || e.keyCode == 16) return;
        
        validate($(this).attr('id'), $(this), e.type);
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
                if (!(typeof isValid === 'undefined') && !isValid) return callback($input, isValid);
            }
            
            if (item.max) {
                isValid = val.length == 0 ? undefined : val.length <= item.max;
                if (!(typeof isValid === 'undefined') && !isValid) return callback($input, isValid);
            }
            
            if (item.type == 'email') {
                isValid = (val.length == 0 ? undefined : regex.test(val));
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
            } else if (item.type == 'zipcode') {
                isValid = val.length == 0 ? undefined : /^\d{5}$/.test(val);
                
                if (isValid) {
                    if (eventType == 'keyup') {
                        shouldCb = false;
                        getCityState(val, function(success, cityState) {
                            $('#' + item.output).text(cityState);
                            callback($input, success);
                        });
                    }
                } else $('#' + item.output).text('');
            } else if (item.type == 'none') {
                return;
            }
            
            if (shouldCb) callback($input, isValid);
        }
    }
    
    var defaultFeedback = function ($input, isValid) {
        if (isValid != undefined) {
            $input.parent().removeClass((isValid ? 'has-error' : 'has-success'))
                .addClass((isValid ? 'has-success' : 'has-error'));
        } else {
            $input.parent().removeClass('has-success').addClass('has-error');
        }
    }
    
    this.init(opt);
}