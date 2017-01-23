angular.module('disczump.controllers', ['disczump.services'])

.filter('startFrom', [function() {
    return function(input, start) {
        if(input) {
            start = +start;
            return input.slice(start);
        }
        return [];
    }
}])

.filter('cc', function () {
  return function (card) {
	  var ret = '';
	  
	  for (var i = 0; i < card.length; i++) {
		  if (i > 0 && i%4 == 0) {
			  ret += ' ';
		  }
		  ret += card[i];
	  }
    return ret;
  };
})

.filter('exp', function () {
  return function (exp) {
	  if (exp.length == 4) {
		  return exp.substr(0,2) + '/' + exp.substr(2,2);
	  }
	  
	  return exp;
  };
})

.filter('dateLocal', function() {
	return function(date) {
		var localDate = new Date(date);
		var localTime = localDate.getTime();
		var localOffset = localDate.getTimezoneOffset() * 60000;
		return (new Date(localTime + localOffset));
	}
})

.filter('memType', ['MembershipService', function(MembershipService) {
	return function(type) {
		return MembershipService.getAccountName(type);
	}
}])

.filter('memCost', ['MembershipService', function(MembershipService) {
	return function(type) {
		return MembershipService.getAccountCost(type);
	}
}])

.directive('dzMaxLength', function() {
  return {
    require: 'ngModel',
    link: function (scope, element, attrs, ngModelCtrl) {
      var maxlength = parseInt(attrs.dzMaxLength);
      function parseMax(text) {
          if (text.length > maxlength) {
            var transformedInput = text.substring(0, maxlength);
            ngModelCtrl.$setViewValue(transformedInput);
            ngModelCtrl.$render();
            return transformedInput;
          } 
          return text;
      }
      ngModelCtrl.$parsers.push(parseMax);
    }
  }; 
})

.directive('popContainer', ['$timeout', '$window', 'PageUtils', function($timeout, $window, PageUtils) {
	return {
		restrict: 'A',
		scope: true,
		link: function(scope, elem, attrs) {
			var monitor = {origTop: 0};
			
			var setFixed = function(fixed) {
				monitor.origTop = PageUtils.getTop(elem[0]);
				if (fixed) {
					elem.css({'position':'fixed', 'top': '0px'});
				} else {
					elem.css({'position': 'relative', 'top': 'auto'});
				}
				monitor.fixed = fixed;
			}
			
			var popCont = function() {
				var scrollPos = PageUtils.getScrollPos();
				if (!monitor.fixed && scrollPos >= PageUtils.getTop(elem[0])) {
					setFixed(true);
				} else if (monitor.fixed && scrollPos < monitor.origTop) {
					setFixed(false);
				}
			}
			angular.element(document).bind('scroll', popCont);
			
			scope.$on('destroy', function() {
				angular.element(document).unbind('scroll', popCont);
			});
		}
	}
}])

.directive('fadeTime', ['$window', '$timeout', '$parse', 'PageUtils', function($window, $timeout, $parse, PageUtils) {
	return {
		restrict: 'A',
		scope: false,
		link: function(scope, elem, attrs) {
			var delay = Math.max(0, parseInt(attrs.fadeTime));
			var expired = false;
			var transitionEnd = PageUtils.getTransitionEndEventName();
			elem.addClass('fade-time');
			
			if (attrs.fadeReverse) {
				elem.addClass('fade-reverse');
			}
			
			var transitionComplete = function() {
				if (attrs.fadeReverse) {
					elem.css('display', 'none');
				}
				
				if (attrs.fadeComplete) {
					$timeout(function() {
						scope.fadeComplete = true;
					});
				}
			}
			
			var expire = function() {
				if (!expired) {
					expired = true;
					elem.addClass('expired');
					
					if (!transitionEnd) {
						$timeout(transitionComplete, 750);
					}
				}
			}
			
			var startTimer = function() {
				$timeout(expire, delay);
			}
			
			var startScroll = function() {
				if ((PageUtils.getScrollPos() + PageUtils.getWindowHeight()) >= PageUtils.getTop(elem[0])) {
					angular.element($window).unbind('scroll', startScroll);
					startTimer();
				}
			}
			
			if (attrs.fadeOverride) {
				scope.$watch(attrs.fadeOverride, function(newVal) {
					if (typeof(newVal) !== 'undefined' && newVal) {
						expire();
					}
				});
			}
			
			if (transitionEnd) {
				elem[0].addEventListener(transitionEnd, transitionComplete, false);
			}
			
			scope.$on('$destroy', function() {
				if (attrs.fadeScroll) {
					angular.element($window).unbind('scroll', startScroll);
				}
			});
			
			if (attrs.fadeStart) {
				scope.$watch(attrs.fadeStart, function(newVal) {
					if (typeof(newVal) !== 'undefined' && newVal) {
						startTimer();
					}
				});
			} else if (attrs.fadeScroll) {
				 angular.element($window).bind('scroll', startScroll);
			} else {
				startTimer();
			}
		}
	}
}])

.directive('parallax', ['$window', 'PageUtils', function($window, PageUtils) {
	return {
		restrict: 'A',
		transclude: true,
		template: '<div ng-transclude></div>',
		scope: {
			parallaxRatio: '@',
			parallaxVerticalOffset: '@',
		},
		link: function(scope, elem, attrs) {
			var setPosition = function () {
				var calcValY = (PageUtils.getTop(elem[0]) - $window.pageYOffset) * (scope.parallaxRatio ? scope.parallaxRatio : 1.1) - (scope.parallaxVerticalOffset || 0);
				elem.css('background-position', "50% " + calcValY + "px");
			};
			
			var init = function() {
				setPosition();
				scope.$apply();
			}

			angular.element($window).bind('load', init);
			angular.element($window).bind("scroll", setPosition);
			angular.element($window).bind("touchmove", setPosition);
			
			scope.$on('$destroy', function() {
				angular.element($window).unbind('load', init);
				angular.element($window).unbind("scroll", setPosition);
				angular.element($window).unbind("touchmove", setPosition);
			});
		}
	}
}])

.directive('filterDropdown', ['$window', '$compile', '$location', 'AccountService', 'PageUtils', 'CacheService', function($window, $compile, $location, AccountService, PageUtils, CacheService) {
	return {
		restrict: 'A',
		scope: {
			user: '='
		},
		link: function(scope, element, attrs) {
			var opts, dropdown, backdrop;
			var buffer = 5;
			var hideGlobal = attrs.trunkOnly ==='true';
			
			var relocateDropdown = function() {
				if (dropdown) {
					dropdown.css({'top': (PageUtils.getFullHeight(element[0]) + buffer) + 'px', 'left': PageUtils.getLeft(element[0]) + 'px'});
				}
			}
			
			var hideFilter = function(evt) {
				if (backdrop) {
					if (evt) {
						if (evt.target != backdrop[0]) return;

						evt.stopPropagation();
					}
					
					backdrop[0].parentNode.removeChild(backdrop[0]);
					backdrop = undefined;
					dropdown = undefined;
					angular.element($window).unbind('resize', relocateDropdown);
				}
			}
			
			scope.hideFilter = function(evt) {
				hideFilter(evt);
			}
			
			scope.doFilter = function(global, username) {
				var filter = opts.prop + ':' + opts.val;
				hideFilter();
				if (global) {
					$location.url('/explore?s=rel&f_0=' + filter);
				} else {
					var user = username || AccountService.getAccount().username;
					$location.url('/t/' + user  + '?s=rel&f_0=' + filter);
				}
			}
			
			var handleClick = function() {
				var isOwned = !scope.hasOwnProperty('user') || AccountService.compareTo(scope.user._id);
				backdrop = angular.element('<div class="full-backdrop" ng-click="hideFilter($event)"></div>');
				
				dropdown = angular.element('<div class="filter-dropdown">' + 
										   		'<div class="filter-marker"></div>' + 
										   		'<div class="filter-dd-title">' + (opts.text ? opts.text : opts.prop) + ': ' + opts.val + (opts.suffix ? opts.suffix : '') + '</div>' +
										   		(!hideGlobal ? '<div class="filter-dd-opt"><span class="hover-underline" ng-click="doFilter(true);"><span><i class="fa fa-filter"></i></span>Filter globally</span></div>' : '') + 
										   		(!isOwned ? '<div class="filter-dd-opt hover-underline"><span class="hover-underline" ng-click="doFilter(false, user.username);"><span><i class="fa fa-filter"></i></span>Filter in ' + scope.user.username + '\'s trunk</span></div>' : '') + 
										   		(AccountService.isLoggedIn() ? '<div class="filter-dd-opt hover-underline"><span class="hover-underline" ng-click="doFilter();"><span><i class="fa fa-filter"></i></span>Filter in my trunk</span></div>' : '') + 
										   '</div>');
				document.body.appendChild(backdrop[0]);
				backdrop[0].appendChild(dropdown[0]);
				$compile(backdrop)(scope);
				relocateDropdown();
				
				
				angular.element($window).bind('resize', relocateDropdown);
			}
			
			try {
				opts = eval('(' + attrs.filterDropdown + ')');
			} catch (e) {
				console.log('Invalid expression for filter dropdown.');
				return;
			}
			
				
			if (opts.prop && opts.val) {
				element.bind('click', handleClick);

				scope.$on('destroy', function() {
					element.unbind('click', handleClick);
					hideFilter();
				});
			}
		}
	}
}])

.directive('dynIframe', [function() {
	return {
		restrict: 'E',
		scope: {
			config: '='
		},
		link: function(scope, element) {
			
			function doCreate() {
				var builder = '<iframe ';
				for (var param in scope.config.params) {
					builder += param + '="' + scope.config.params[param] + '" ';
				}
				builder += '></iframe>';
				
				var frame = angular.element(builder);
				element[0].appendChild(frame[0]);
			}
			
			scope.$watch('config.create', function(newVal) {
				if (newVal === true) {
					doCreate();
				}
			});
		}
	}
}])

.directive('removeIf', [function() {
	return {
		restrict: 'A',
		scope: {
			removeIf: '='
		},
		link: function(scope, element) {
			scope.$watch('removeIf', function(newVal) {
				if (typeof(newVal) !== 'undefined' && newVal) {
					element.remove();
				}
			});
		}
	}
}])

.directive('backToTop', ['PageUtils', 'smoothScroll', '$timeout', function(PageUtils, smoothScroll, $timeout) {
	return {
		restrict: 'E',
		replace: true,
		scope: true,
		template: '<div class="back-top" ng-click="scrollTop()">Back to Top</div>',
		link: function(scope, element, attrs) {
			var isShowing = false;
			var parent = element[0].parentElement;
			var top = PageUtils.getTop(parent);
			
			
			function resize() {
				top = PageUtils.getTop(parent);
				var pLeft = PageUtils.getLeft(parent);
				var left = pLeft + (parent.clientWidth - 100)/2;
				element.css({'left': left + 'px'});
			}
			
			function showContainer() {
				if (PageUtils.getScrollPos() > top) {
					if (!isShowing) {
						element.css({'display':'block'});
						isShowing = true;
					}
				} else {
					if (isShowing){
						element.css({'display':'none'});
						isShowing = false;
					}
				}
			}
			
			scope.scrollTop = function() {
				var options = {
					duration: 200,
					easing: 'easeInQuad'
				}

				smoothScroll(parent, options);
			}
			
			angular.element(document).bind('scroll', showContainer);
			
			scope.$watch(function() {
				 return parent.clientWidth;
			 }, function() {
				resize();
			});
			
			scope.$on('destroy', function() {
				angular.element(document).unbind('scroll', showContainer);
			});
			
			$timeout(resize);
			
		}
	}
}])

.directive('countdown', ['$interval', '$timeout', function($interval, $timeout) {
	return {
		restrict: 'A',
		scope: {
			secLeft: '=',
			counts: '=',
			done: '=',
			show: '='
		},
		link: function(scope, element) {
			var prom;
			var updateCount = function() {
				
				if (typeof(scope.secLeft) === undefined) {
					return;
				}
				
				if (scope.secLeft > 0) {
					scope.done = false;

					scope.counts = {
						hours: ("0" + parseInt(scope.secLeft / 3600)).slice(-3),
						minutes: ("0" + parseInt(scope.secLeft % 3600 / 60)).slice(-2),
						seconds: ("0" + parseInt(scope.secLeft % 3600 % 60 % 60)).slice(-2)
					};
					
					scope.secLeft = scope.secLeft - 1;
				} else {
					scope.done = true;
				}
			}
			
			scope.$watch('done', function(newVal) {
				if (typeof(newVal) !== 'undefined') {
					if (newVal) {
						$interval.cancel(prom);
					} else {
						prom = $interval(updateCount, 1000);
					}
				}
			});
			
			$timeout(function() {
				scope.show = true;
			}, 1000);
			
			element.on('$destroy', function() {
				$interval.cancel(prom);
			});
			
			updateCount();
		}
	}
}])

.directive('matchWidth', [function() {
	return {
		restrict: 'A',
        link: function(scope, element, attrs) {
			var setHeight = function(val) {
				angular.element(element[0]).css({'height': val + 'px'});
			}
			
            scope.$watch(function() {
				return element[0].offsetWidth;
            }, function(val) {
				setHeight(val);
			});
        }
	}
}])

.directive('overflowWrapper', [function() {
	return {
		restrict: 'E',
		replace: true,
		template: '<div ng-transclude></div>',
		transclude: true,
		link: function(scope, element, attrs) {
			var setChild = function(newVal) {
				var child = angular.element(element[0].children[0]);
				
				child.css({'maxWidth': newVal + 'px'});
			}
			
			scope.$watch(function() {
				return element[0].clientWidth;	
			}, function(newVal) {
				setChild(newVal);
			});
			
		}
	}
}])

.directive('mustMatch', [function() {
	return {
        require: "ngModel",
        scope: {
            ov: "=mustMatch"
        },
        link: function(scope, element, attributes, ngModel) {
             
            ngModel.$validators.compareTo = function(modelValue) {
                return modelValue == scope.ov;
            };
 
            scope.$watch("ov", function() {
                ngModel.$validate();
            });
        }
    };
}])

.directive('patternSet', function (){ 
   return {
      	require: 'ngModel',
		link: function(scope, elem, attrs, ngModel) {
			var pattern = new RegExp(attrs.patternSet);

		  ngModel.$parsers.unshift(function(value) {
			 ngModel.$setValidity('patternSet', pattern.test(value));
			 return value && value.length ? value : undefined;
		  });

		  ngModel.$formatters.unshift(function(value) {
			 ngModel.$setValidity('patternSet', pattern.test(value));
			 return value && value.length ? value : undefined;
		  });
		}
   };
})

.directive('validIf', ['$parse', function ($parse){ 
   return {
      	require: 'ngModel',
		link: function(scope, elem, attrs, ngModel) {
			scope.$watch(function() {
				return $parse(attrs.validIf)(scope.$parent);
			}, function(newVal) {
                ngModel.$setValidity('validIf', newVal && newVal.length);
			});
		}
   };
}])

.directive('focusOn', ['$timeout', function($timeout) {
    return {
        restrict: 'A',
        scope: {
            trigger: '=focusOn'
        },
        link: function(scope, element) {
            scope.$watch('trigger', function(value) {
                if (value === true) {
                    $timeout(function() {
                        element[0].focus();
                    }, 300);
                }
            });
        }
    };
}])

.directive('keyScrollList', ['$timeout', function($timeout) {
	return {
		restrict: 'A',
		scope: {
			keyScrollList: '=',
			selection: '=',
			onSelect: '=',
            triggerFocus: '='
		},
		link: function(scope, elem) {
			
			var handleKey = function(evt) {
				switch(evt.keyCode) {
					case 9: {
						if (scope.selection > -1) {
							$timeout(function() {
								scope.onSelect(scope.selection);
							});
						}
						break;
					}
					case 13: {
						$timeout(function() {
							if (scope.selection > -1) {
								scope.onSelect(scope.selection);
							}
						});
						break;
					}
					case 38: {
						$timeout(function() {
							scope.selection = Math.max(-1, scope.selection - 1);
						});
						break;
					}
					case 40: {
						$timeout(function() {
							scope.selection = Math.min(scope.keyScrollList.length - 1, scope.selection + 1);
						});
						break;
					}
				}
			}
			
			elem.bind('keydown', handleKey);
			
			
            scope.$watch('triggerFocus', function(value) {
                if (value === true) {
                    $timeout(function() {
                        elem[0].focus();
                    }, 300);
                }
            });
			
			scope.$on('$destroy', function() {
				elem.unbind('keyup', handleKey);
			});
		}
	}
}])

.directive('scrollMe', ['$timeout', function($timeout) {
	return {
		restrict: 'A',
		scope: {
			scrollMe: '='
		},
		link: function(scope, elem) {
			var parent = elem[0].parentElement;
			
			scope.$watch('scrollMe', function(newVal) {
				if (typeof(newVal) !== 'undefined' && newVal === true) {
					var elemLoc = elem[0].offsetTop + elem[0].offsetHeight;
					var resultsLoc = parent.scrollTop + parent.offsetHeight;

					if (parent.scrollTop > elem[0].offsetTop) {
						parent.scrollTop = elem[0].offsetTop;
					} else if (resultsLoc < elemLoc) {
						parent.scrollTop = elemLoc - parent.offsetHeight;
					}
				}
			});
		}
	}
}])

.directive('parseInput', ['$compile', function($compile) {
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, elem, attrs, ngModel) {
			elem.on('paste', function() {
				console.log('pasted');
			});
		}
	}
}])

.directive('locationSearch', ['$window', '$compile', '$timeout', 'LocationService', function($window, $compile, $timeout, LocationService) {
	return {
		restrict: 'A',
		require: 'ngModel',
		scope: {
			ngModel: '=',
			locationSearch: '='
		},
		link: function(scope, elem, attrs, ngModel) {
			scope.results = [];
			scope.active = false;
			scope.init = false;
			scope.activeIndex = -1;
			var loc;
			var hasFocus;
			
			var resizeLoc = function() {
				loc.css('width', elem[0].clientWidth + 'px');
			}
			
			var getCoords = function(lat, lng) {
				LocationService.getReverseGeo(lat, lng, function(success, results) {
					if (success && results.length) {
						scope.locationSearch(results[0]);
					}
				}, true);
			}
			
			scope.setLocation = function(result) {
				getCoords(result.latitude, result.longitude);
			}
			
			var initLoc = function() {
				loc = document.createElement('ul');
				loc.classList.add('location-result-container');
				loc.innerHTML = '<li class="location-result handle-overflow" ng-repeat="result in results track by $index" ng-class="{\'active\':activeIndex == $index}" ng-click="$event.stopPropagation(); setLocation(result)" scroll-me="activeIndex == $index">{{result.address}}</li>';
				elem[0].parentNode.insertBefore(loc, elem[0].nextSibling);
				loc = angular.element(loc);
				loc.css('marginTop', '7px');
				loc.attr('ng-show', 'results.length && active');
				$compile(loc)(scope);
				resizeLoc();
			}
			
			var queryLoc = function() {
				LocationService.getGeoLocation(ngModel.$modelValue, function(success, results) {
					if (success) {
                        scope.results = results;
						scope.activeIndex = -1;
					} else {
						scope.results = [];
					}
				}, ['postal_code']);
			}
			
			var inputFocus = function() {
				hasFocus = true;
				
				$timeout(function() {
					scope.active = true;
				});
				
			}
			
			var inputBlur = function() {
				hasFocus = false;
				
				$timeout(function() {
					scope.active = false;
				}, 200);
			}
			
			var keyDownEvt = function(evt) {
				if ((evt.keyCode == 13 || evt.keyCode == 9) && scope.activeIndex > -1) {
					evt.preventDefault();
				}
			}
			
			var handleKey = function(evt) {
				if ((evt.keyCode == 13 || evt.keyCode == 9) && scope.activeIndex > -1) {
					evt.preventDefault();
					evt.stopImmediatePropagation();
					scope.setLocation(scope.results[scope.activeIndex]);
					$timeout(function() {
						scope.activeIndex = -1;
						scope.active = false;
					});
					return;
				}
				
				switch(evt.keyCode) {
					case 38: {
						evt.stopImmediatePropagation();
						$timeout(function() {
							scope.activeIndex = Math.max(-1, scope.activeIndex - 1);
						});
						break;
					}
					case 40: {
						evt.stopImmediatePropagation();
						$timeout(function() {
							scope.activeIndex = Math.min(scope.results.length - 1, scope.activeIndex + 1);
						});
						break;
					}
				}
			}
			
			angular.element(window).bind('resize', resizeLoc);
			elem.bind('focus', inputFocus);
			elem.bind('blur', inputBlur);
			elem.bind('keyup', handleKey);
			elem.bind('keydown', keyDownEvt);
			
			scope.$watch(function () {
				return ngModel.$modelValue;
			}, function(newValue) {
				if (typeof(newValue) === 'undefined' || newValue == '') {
					scope.results = [];
				} else {
					if (!scope.active && hasFocus) scope.active = true;
					queryLoc();
				}
			});
			
			scope.$on('$destroy', function() {
				angular.element(window).unbind('resize', resizeLoc);
				elem.unbind('focus', inputFocus);
				elem.unbind('blur', inputBlur);
				elem.unbind('keyup', handleKey);
				elem.unbind('keydown', keyDownEvt);
			})
			
			initLoc();
		}
		
	}
}])

.directive('dzAutoComplete', ['$compile', '_', 'QueryService', '$timeout', function($compile, _, QueryService, $timeout) {
	return {
		restrict: 'A',
		require: 'ngModel',
		scope: {
			ngModel: '=',
			userId: '='
		},
		link: function(scope, elem, attrs, ngModel) {
			scope.results = [];
			scope.active = false;
			scope.init = false;
			scope.activeIndex = -1;
			var setLock = false;
			var lastQueried;
			var ac;
			var hasFocus = false;
			
			var resizeAC = function() {
				ac.css('width', elem[0].clientWidth + 'px');
				ac.css('marginTop', elem[0].clientHeight + 'px');
			}
			
			var initAC = function() {
				ac = document.createElement('ul');
				ac.classList.add('ac-container');
				ac.innerHTML = '<li style="text-align:left;" ng-repeat="result in results track by $index" ng-class="{\'active\':activeIndex == $index}" ng-click="setInput(result.val)">{{result.val}} ({{result.count}})</li>';
				elem[0].parentNode.insertBefore(ac, elem[0].nextSibling);
				ac = angular.element(ac);
				ac.attr('ng-show', 'results.length && active');
				$compile(ac)(scope);
				resizeAC();
			}
			
			var postFilter = function(results) {
				if (ngModel.$modelValue === 'undefined' || !ngModel.$modelValue.length)
					return [];
				
				if (attrs.dzMulti) {
					return _.filter(results, function(item) {
						return item.val.toLowerCase().indexOf(ngModel.$modelValue.toLowerCase()) > -1;
					});
				} else {
					return results;
				}
			}
			
			var queryField = function() {
				var query = ngModel.$modelValue;
				QueryService.queryFacet({
					query: ngModel.$modelValue,
					userId: scope.userId,
					facet: {
						name: attrs.dzAutoComplete,
						limit: 20,
						offset: 0,
						query: true
					}}, function(success, response) {
                    if (success) {
                        scope.results = postFilter(response.facets.dynFilters[attrs.dzAutoComplete].filters);
						lastQueried = query;
						scope.activeIndex = -1;
                    }
                });
			}
			
			scope.setInput = function(val) {
				$timeout(function() {
					scope.ngModel = val;
					setLock = true;
					elem[0].focus();
				});
			}
			
			var inputFocus = function() {
				
				hasFocus = true;
				
				if (setLock) {
					setLock = false;
					return;
				}
				
				$timeout(function() {
					scope.active = true;
				});
				
				if (lastQueried != ngModel.$modelValue && ngModel.$modelValue && ngModel.$modelValue.length) {
					queryField();
				}
				
			}
			
			var inputBlur = function() {
				hasFocus = false;
				
				$timeout(function() {
					scope.active = false;
				}, 200);
			}
			
			var keyDownEvt = function(evt) {
				var handle = (evt.keyCode == 13 && scope.activeIndex > -1) || (evt.keyCode == 9 && scope.activeIndex > -1);
				if (handle) {
					evt.preventDefault();
					ngModel.disableEnter = true;
					evt.stopImmediatePropagation();
				}
			}
			
			var handleKey = function(evt) {
				var handle = (evt.keyCode == 13 && scope.activeIndex > -1) || (evt.keyCode == 9 && scope.activeIndex > -1);
				
				if (handle) {
					evt.preventDefault();
					evt.stopImmediatePropagation();
					scope.setInput(scope.results[scope.activeIndex].val);
					$timeout(function() {
						scope.activeIndex = -1;
						scope.active = false;
						ngModel.disableEnter = false;
					});
					return;
				}
				
				switch(evt.keyCode) {
					case 38: {
						evt.stopImmediatePropagation();
						$timeout(function() {
							scope.activeIndex = Math.max(-1, scope.activeIndex - 1);
						});
						break;
					}
					case 40: {
						evt.stopImmediatePropagation();
						$timeout(function() {
							scope.activeIndex = Math.min(scope.results.length - 1, scope.activeIndex + 1);
						});
						break;
					}
				}
			}
			
			angular.element(window).bind('resize', resizeAC);
			elem.bind('focus', inputFocus);
			elem.bind('blur', inputBlur);
			elem.bind('keyup', handleKey);
			elem.bind('keydown', keyDownEvt);
			
			scope.$watch(function () {
				return ngModel.$modelValue;
			}, function(newValue) {if (typeof(newValue) === 'undefined' || newValue == '') {
					scope.results = [];
				} else {
					if (!scope.active && hasFocus) scope.active = true;
					
					queryField();
				}
			});
			
			scope.$on('$destroy', function() {
				angular.element(window).unbind('resize', resizeAC);
				elem.unbind('focus', inputFocus);
				elem.unbind('blur', inputBlur);
				elem.unbind('keyup', handleKey);
				elem.unbind('keydown', keyDownEvt);
			})
			
			initAC();
		}
	}
}])

.directive('parseText', ['$compile', 'PageCache', function($compile, PageCache) {
	return {
		restrict: 'A',
		scope: {
			parseText: '='
		},
		link: function(scope, elem, attrs) {
			var toReplace = [];
			var inner = typeof(scope.parseText) !== 'undefined' ? scope.parseText : '';
			elem[0].innerHTML = '';
			
			 var escapeHtml = function(unsafe) {
				return unsafe
					 .replace(/&/g, "&amp;")
					 .replace(/</g, "&lt;")
					 .replace(/>/g, "&gt;")
					 .replace(/"/g, "&quot;")
					 .replace(/'/g, "&#039;");
			 }
			 
			 var getMatches = function(regex, val) {
				 var matchGroups = [];
				 var match = regex.exec(val);
				 while (match != null) {
					 matchGroups.push(match[0]);
					 match = regex.exec(val);
				 }
				 
				 return matchGroups;
			 }
			 
			if (typeof(attrs.parseDisc) !== 'undefined') {
				var discRegex = new RegExp('(?:https?:\/\/)?(?:www\.)?(?:' + PageCache.getUrlRegex() + '\\.com)\/d\/[a-zA-Z0-9-_]+', 'g');
				var matches = getMatches(discRegex, inner);
				for (var i = 0; i < matches.length; i++) {
					var dElem = '<inline-disc disc-url="' +  matches[i] + '"></inline-disc>';
					toReplace.push(dElem);
					inner = inner.split(matches[i]).join('+_rep' + (toReplace.length - 1) + '+');
				}
			}
			
			if (typeof(attrs.parseUrl) !== 'undefined') {
				var urlRegex = /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;
				var matches = getMatches(urlRegex, inner);
				for (var i = 0; i < matches.length; i++) {
					var url = /^https?:\/\//i.test(matches[i]) ? matches[i] : 'http://' + matches[i];
					toReplace.push('<a class="dz-blue hover-underline" href="' + url + '" target="_blank">' + matches[i] +'</a>');
					inner = inner.split(matches[i]).join('+_rep' + (toReplace.length - 1) + '+');
				}
			}
			
			inner = escapeHtml(inner);
			for (var i = 0; i < toReplace.length; i++) {
				inner = inner.split('+_rep' + i + '+').join(toReplace[i]);
			}
			
			var innerHTML = ''
			
			var spans = inner.split('\n');
			for (var i = 0; i < spans.length; i++) {
				if (!spans[i].length) {
					innerHTML += '<br />';
					continue;
				}
				
				if (!/^(\<a|\<inline-disc)/g.test(spans[i])) {
					innerHTML += '<span>' + spans[i] + '</span>';
				} else {
					innerHTML += spans[i];
				}
			}
			
			elem[0].innerHTML = '<div class="block-text">' + innerHTML + '</div>';
			$compile(angular.element(elem[0].firstChild))(scope.$parent);
		}
	}
}])

.directive('inlineDisc', ['_', '$timeout', 'CacheService', 'PageCache', function(_, $timeout, CacheService, PageCache) {
	return {
		restrict: 'E',
		replace: true,
		scope: {
			discUrl: '@'
		},
		template: '<a class="inline-disc hover-underline" ng-href="{{url}}">' +
					'<img img-load directive-on="init" directive-set="{\'img-src\':\'{{image}\}\'}"/>{{title}}' +
				'</a>',
		link: function(scope, elem, attrs) {
			var discRegex = new RegExp('(?:https?:\/\/)?(?:www\.)?(?:' + PageCache.getUrlRegex() + '\\.com)\/d\/([a-zA-Z0-9-_]+)', 'g');
			var match = discRegex.exec(scope.discUrl);
			if (match) {
				scope.discId = match[match.length - 1];
				CacheService.getDisc(scope.discId, function(success, disc) {
					if(success) {
						$timeout(function() {
							scope.image = disc.primaryImage ? '/files/' + _.findWhere(disc.imageList, {_id: disc.primaryImage}).fileId : undefined;
							scope.init = typeof(scope.image) !== 'undefined';
							scope.title = disc.brand + ' ' + disc.name;
							scope.url = '/d/' + disc._id;
						});
					} else {
						scope.title = 'Private Disc';
						scope.url = '#';
					}
				});
			} else {
				scope.title = 'Unknown Disc';
			}
		}		
	}
}])

/******************************************************************************
* 
* DIRECTIVES
* 
*******************************************************************************/
.directive('dzHeader', ['$window', '$location', '$timeout', 'PageUtils', 'AccountService', 'MessageService', function($window, $location, $timeout, PageUtils, AccountService, MessageService) {
    return {
        restrict: 'E',
        replace: true,
		scope: {
			globalModalOpts: '=modalOpts'
		},
        template: '<div class="dz-navbar min-window-width" ng-class="{\'fixed\':fixed}" ng-style="{\'background-color\':\'rgba(74,74,74,\' + (alphaValue/100) +\')\'}">' +
					'<div class="dz-navbar-btn-container float-left">' +
						'<div class="dz-navbar-btn-list">' +
							'<a href="/" ng-style="{\'opacity\': alphaValue}"><img src="/static/logo/logo_text.png" class="dz-navbar-logo"></a>' +
						'</div>' +
					'</div>' +
					'<div class="dz-navbar-btn-container float-right">' +
						'<div class="dz-navbar-btn-list">' +
							'<div class="dz-navbar-item dz-navbar-dropdown" ng-if="user" ng-click="toggleDropdown()">' +
								'<div class="default-bg-image" img-load="/static/img/dz_profile.png" img-src="{{getAccountImage()}}" bg-image="true"></div>' +
								'<i class="fa fa-angle-double-down fa-lg" style="line-height:40px;"></i>' +
								'<div class="clearfix"></div>' + 
							'</div>' +
							'<div class="backdrop" ng-show="showOptions" ng-click="toggleDropdown(false)" ng-if="user"></div>' +
							'<ul class="dz-dropdown-menu" ng-show="showOptions" ng-if="user">' +
								'<li><a href="/d/create/templates"><span><i class="fa fa-tools fa-plus-circle"></i></span>Add Disc</a></li>' +
								'<li class="menu-sep"></li>' +
								'<li><a ng-click="showFeedbackModal()" id="menu-feedback" class="hover-pointer"><span><i class="fa fa-comment fa-tools"></i></span>Feedback</a></li>' +
								'<li><a href="/faq"><span><i class="fa fa-tools fa-question-circle"></i></span>FAQ</a></li>' +
								'<li><a href="/about"><span><i class="fa fa-tools fa-info-circle"></i></span>About</a></li>' +
								'<li class="menu-sep"></li>' +
								'<li><a href="/account"><span><i class="fa fa-tools fa-user"></i></span>My Account</a></li>' +
								'<li><a href="/logout" data-ajax="false"><span><i class="fa fa-sign-out fa-tools"></i></span>Logout</a></li>' +
							'</ul>' +
							'<div class="dz-navbar-links">' +
								'<a class="dz-navbar-item dz-navbar-btn" href="/explore" ng-class="{\'active\':isItemActive(\'explore\')}">Explore</a>' +
								'<a class="dz-navbar-item dz-navbar-btn" href="/trunks" ng-class="{\'active\':isItemActive(\'trunks\')}">Trunks</a>' +
								'<a class="dz-navbar-item dz-navbar-btn" ng-if="!user" href="/about" ng-class="{\'active\':isItemActive(\'about\')}">About</a>' +
								'<a class="dz-navbar-item dz-navbar-btn" ng-if="user" ng-href="/t/{{user.username}}" ng-class="{\'active\':isItemActive(\'t/{{user.username}}\')}">My Trunk</a>' +
								'<a class="dz-navbar-item dz-navbar-btn" ng-if="user" ng-href="/inbox" ng-class="{\'active\':isItemActive(\'inbox\')}">Inbox<span ng-show="unreadCount > 0" style="color: #ffa840;"> ({{unreadCount}})</span></a>' +
								'<a class="dz-navbar-item dz-navbar-btn" href="/login" ng-if="!user" ng-class="{\'active\':isItemActive(\'login\')}">Sign In</a>' +
								'<a class="dz-navbar-item dz-navbar-btn" href="/signup" ng-if="!user" ng-class="{\'active\':isItemActive(\'signup\')}">Sign Up</a>' +
								'<div class="clearfix"></div>' + 
							'</div>' +
						'</div>' +
					'</div>' +
					'<dz-modal modal-opts="globalModalOpts"></dz-modal>' +
					'<div class="clearfix"></div>' +
				'</div>',
        link: function(scope, element, attrs) {
			var alert = new Audio('/static/audio/whoosh.wav');
			scope.globalModalOpts = {};
			scope.user = AccountService.getAccount();
			scope.showOptions = false;
			scope.unreadCount = undefined;
            scope.safeApply = function(fn) {
                var phase = this.$root.$$phase;
                if (phase == '$apply' || phase == '$digest') {
                    if (fn && (typeof(fn) === 'function')) {
                        fn();
                    }
                }
                else {
                    this.$apply(fn);
                }
            }
            
            var blendHeader = function(){
                var x = PageUtils.getScrollPos();
                var height = $window.innerHeight - 50;
                
                scope.safeApply(function() {
                    scope.alphaValue = Math.min(100, (x / height) * 100);
                });
            }
            
            if (attrs.blend === 'true') {
                scope.alphaValue = 0;
                
                angular.element(document).bind('scroll', blendHeader);
                
            } else {
                scope.alphaValue = 100;
            }
            
            if (attrs.fixed === 'true') {
                scope.fixed = true;
            }
            
            scope.getAccountImage = function() {
                return scope.user.image || '/static/img/dz_profile.png';
            }
            
            scope.isItemActive = function(item) {
				var urlTest = new RegExp(item + '(\\?.*)?$');
                return urlTest.test($location.url());
            }
					
			scope.toggleDropdown = function(forceTo) {
				if (typeof(forceTo) !== 'undefined') {
					scope.showOptions = forceTo;
				} else {
					scope.showOptions = !scope.showOptions;
				}

			}
			
			scope.showFeedbackModal = function() {
				scope.toggleDropdown();
				scope.globalModalOpts = {
					type: 'dz-feedback-modal',
					show: true
				}
			}
			
			var updateMessageCount = function(unreadCount) {
				$timeout(function() {
					if (typeof(scope.unreadCount) !== 'undefined' && unreadCount.messageCount > scope.unreadCount) alert.play();
					scope.unreadCount = unreadCount.messageCount;
				});
			}
			
			MessageService.addListener(updateMessageCount);
            
            scope.$on('$destroy', function() {
                angular.element(document).unbind('scroll', blendHeader);
				MessageService.removeListener(updateMessageCount);
            });
            
        }
    }
}])

.directive('dzFooter', ['$timeout', 'PageUtils', function($timeout, PageUtils) {
    return {
        restrict: 'E',
        replace: true,
        template: '<div class="footer-bar" id="footer-bar" ng-show="footerReady">' +
					'<div>' +
						'<span class="footer-copyright">' +
							'<span class="cr-main">Copyright <i class="fa fa-copyright"></i> disc|zump, LLC</span>' +
							'<span class="cr-links">' +
								'<a href="mailto:support@disczump.com">Contact Us</a>' +
								'<a href="/faq">FAQ</a>' +
								'<a href="/privacy">Privacy Policy</a>' +
								'<a href="/terms">Terms and Conditions</a>' +
							'</span>' +
						'</span>' +
						'<span class="footer-links">' +
						  '<a href="https://www.facebook.com/disczump/" target="_blank">' +
							'<span class="fa-stack fa-lg">' +
							  '<i class="fa fa-circle fa-stack-2x"></i>' +
							  '<i class="fa fa-facebook fa-stack-1x fa-inverse"></i>' +
							'</span>' +
						  '</a>' +
						  '<a href="https://twitter.com/disczump" target="_blank">' +
							'<span class="fa-stack fa-lg">' +
							  '<i class="fa fa-circle fa-stack-2x"></i>' +
							  '<i class="fa fa-twitter fa-stack-1x fa-inverse"></i>' +
							'</span>' +
						  '</a>' +
						  '<a href="https://instagram.com/disczump/" target="_blank">' +
							'<span class="fa-stack fa-lg">' +
							  '<i class="fa fa-circle fa-stack-2x"></i>' +
							  '<i class="fa fa-instagram fa-stack-1x fa-inverse"></i>' +
							'</span>' +
						  '</a>' +
						'</span>' +
						'<div class="clearfix"></div>' +
					'</div>' +
				'</div>',
        link: function(scope, element, attrs) {
            $timeout(function() {
				scope.footerReady = true;
			},50);
        }
    }
}])

.directive('dzProfile', ['$window', '$timeout', 'CacheService', 'AccountService', '$compile', function($window, $timeout, CacheService, AccountService, $compile) {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            userId: '@',
						currentUser: '=',
						modalOpts: '='
        },
        template: '<div class="profile-container fclear">' +
					'<div class="card-container" ng-show="loaded">' +
						'<div id="card-remain" style="display: inline-block">' +
							'<div class="profile-card p-info">' +
								'<div class="p-info-img">' +
									'<div class="default-bg-image" img-load="/static/img/dz_profile.png" directive-on="loaded" directive-set="{\'img-src\':\'{{getAccountImage()}}\'}" bg-image="true" ng-class="{\'has-img\':ready}"></div>' +
								'</div>' +
								'<div class="p-info-content p-container">' +
									'<div class="p-info-icon">' +
										'<span style="cursor:pointer;" class="fa-stack dz-blue-hover" modal-trigger="dz-profile-modal" data="{\'userId\':\'userId\'}" modal-opts="modalOpts">' +
											'<i class="fa fa-circle fa-stack-2x"></i>' +
											'<i class="fa fa-info fa-stack-1x fa-inverse"></i>' +
										'</span>' +
									'</div>' +
									'<div class="p-info-text">' +
										'<div class="p-username handle-overflow">{{user.username}}</div>' +
										'<div class="p-name handle-overflow">{{user.firstName}} {{user.lastName}}</div>' +
									'</div>' +
									'<div class="p-info-bio fancy-scroll" ng-class="{\'has-ph\':!user.bio}">' +
										'<span class="placeholder" ng-if="!user.bio">Hello, welcome to my trunk...</span>' +
										'<div parse-text="user.bio" parse-url parse-disc id="user-bio">' +
										'</div>' +
									'</div>' +
								'</div>' +
							'</div>' +
							 '<div class="profile-card p-icon-button" ng-if="currentUser != userId">' +
								'<div class="p-container">' +
									'<a class="p-icon-text align-vmid" ng-href="/inbox?userId={{user._id}}">' +
										'<div class="p-icon-style"><i class="fa fa-envelope"></i></div>' +
										'<div class="p-icon-label">Message</div>' +
									'</a>' +
								'</div>' +
							'</div>' +
							'<div class="profile-card p-icon-button" ng-if="currentUser == userId">' +
								'<div class="p-container">' +
									'<a class="p-icon-text align-vmid" href="/d/create/templates">' +
										'<div class="p-icon-style"><i class="fa fa-plus-circle"></i></div>' +
										'<div class="p-icon-label">Add Disc</div>' +
									'</a>' +
								'</div>' +
							'</div>' +
						'</div>' +
						'<div class="profile-card p-icon-button" ng-show="!cardLoaded">' +
							'<div class="p-container">' +
								'<div class="p-icon-text align-vmid">' +
									'<div class="p-icon-style"><i class="fa fa-spin fa-spinner"></i></div>' +
								'</div>' +
							'</div>' +
						'</div>' +
						'<div ng-style="contStyle" class="card-list" id="card-list" ng-show="cardLoaded">' +
						'</div>' +
					'</div>' +
					'<div class="explore-nav" ng-show="navArr.length > 1" ng-init="start = 0">' +
						'<span>' +
							'<i class="fa fa-angle-double-left nav-list-arrow" ng-click="pageBack()" ng-class="{inactive: start == 0}"></i>' +
							'<i class="fa" ng-repeat="i in navArr track by $index" ng-click="navIndex($index)" ng-class="{active: start == $index, \'fa-circle\': start == $index, \'fa-circle-thin\': start != $index}"></i>' +
							'<i class="fa fa-angle-double-right nav-list-arrow" ng-click="pageNext()" ng-class="{inactive: start == navArr.length - 1}"></i>' +
						'</span>' +
					'</div>' +
				'</div>',
        link: function(scope, element, attrs) {
			var loadTimer;

			scope.init = false;
			scope.showCount = 0;
			scope.cards = [];
			scope.navArr = new Array(0);
			scope.start = 0;
			scope.contStyle = {};

			scope.navIndex = function(index) {
				scope.start = index;
			}

			scope.pageBack = function() {
				scope.start = Math.max(scope.start - 1, 0);
			}

			scope.pageNext = function() {
				scope.start = Math.min(scope.start + 1, scope.navArr.length - 1);
			}

			scope.getAccountImage = function() {
				return scope.user ? scope.user.image : '/static/img/dz_profile.png';
			}

			var accountUpdate = function(msg) {
				if (msg === 'AccountUpdated') {
					if (AccountService.compareTo(scope.user._id)) {
						scope.user = AccountService.getAccount();
					}
				}
			}

			var resizeProfile = function() {
				$timeout(function(){
					var remainContainer = angular.element(document.getElementById('card-remain'));
					scope.showCount = Math.floor((element[0].clientWidth - remainContainer[0].clientWidth) / 220);
					scope.navArr = new Array(Math.ceil(scope.cards.length / scope.showCount));

					if (scope.navArr.length > 1) {
						element.addClass('with-nav');
					} else {
						element.removeClass('with-nav');
					}
					scope.contStyle = { 'maxWidth': (scope.showCount * 220) + 'px' };
					scope.cardLoaded = true;
					scope.$apply();
				});
			}

			function setCards() {
				scope.cards.push({type: 'dz-map-card'});
				if (scope.user.verifications.pdga) scope.cards.push({type: 'dz-pdga-card'});
				if (scope.user.verifications.facebook) scope.cards.push({type: 'dz-facebook-card'});
				scope.cards.push({type: 'dz-disc-card'});
				scope.cards.push({type: 'dz-date-card'});

				var list = document.getElementById('card-list');
				if (list) {
					scope.cards.forEach(function(card, index) {
						var card = angular.element('<div ' + card.type + ' user="user" init="init" ng-show="start < ' + (index + 1) + ' && (showCount + start) >= ' + (index + 1) + '"></div>');
						list.appendChild(card[0]);
						$compile(card)(scope);
					});
				}
			}

			if (typeof(scope.userId) !== 'undefined') {
				CacheService.reloadUser(scope.userId, function(success, user) {
					if (success) {

						if (AccountService.compareTo(user._id)) {
							AccountService.addListener(accountUpdate);
						}

						$timeout(function() {
							scope.user = user;

							var bio = document.getElementById('user-bio');
							if (bio) {
								$compile(bio)(scope);
							}

							scope.loaded = true;
							$timeout(function() {
								scope.ready = true;
							});

							$timeout(function() {
								setCards();
								var remainContainer = angular.element(document.getElementById('card-remain'));
								scope.$watch(function() { return remainContainer[0].clientWidth;}, function(val) {
									if (typeof(val) !== 'undefined' && val > 0) {
										resizeProfile();
										scope.init = true;
									}
								});
							}, 1000);
						});
					}
				});
			}

			angular.element($window).bind('resize', resizeProfile);

			scope.$on('$destroy', function() {
				angular.element($window).unbind('resize', resizeProfile);
				AccountService.removeListener(accountUpdate);
			});
        }
    }
}])

.directive('dzPdgaCard', ['$timeout', function($timeout) {
	return {
		restrict: 'A',
		replace: true,
		scope: {
			user: '='
		},
		template: '<div class="profile-card p-icon p-pdga scale-fade">' +
						'<div class="p-container">' +
							'<div class="p-icon-text align-vmid">' +
								'<div class="p-icon-label verified">' + 
									'<span class="fa-stack">' + 
										'<i class="fa fa-certificate fa-stack-2x" aria-hidden="true"></i>' + 
										'<i class="fa fa-check fa-stack-1x" aria-hidden="true"></i>' + 
									'</span>Verified' + 
								'</div>' +
								'<div class="p-icon-style shadow verified"><i class="fa fa-slack"></i></div>' +
								'<div class="p-icon-label"><a class="dz-blue-hover" target="_blank" ng-href="http://www.pdga.com/player/{{user.pdgaNumber}}">PDGA #{{user.pdgaNumber}}</a></div>' +
							'</div>' +
						'</div>' +
					'</div>',
		link: function(scope, element) {
			
		}
	}
}])

.directive('dzFacebookCard', ['$timeout', function($timeout) {
	return {
		restrict: 'A',
		replace: true,
		scope: {
			user: '='
		},
		template: '<div class="profile-card p-icon p-facebook scale-fade">' +
						'<div class="p-container">' +
							'<div class="p-icon-text align-vmid">' +
								'<div class="p-icon-label verified">' + 
									'<span class="fa-stack">' + 
										'<i class="fa fa-certificate fa-stack-2x" aria-hidden="true"></i>' + 
										'<i class="fa fa-check fa-stack-1x" aria-hidden="true"></i>' + 
									'</span>Verified' + 
								'</div>' +
								'<div class="p-icon-style shadow verified"><i class="fa fa-facebook-square"></i></div>' +
								'<div class="p-icon-label"><a class="dz-blue-hover" target="_blank" ng-href="https://www.facebook.com/{{user.fbId}}">View Profile</a></div>' +
							'</div>' +
						'</div>' +
					'</div>',
		link: function(scope, element) {
			
		}
	}
}])

.directive('dzDateCard', ['$timeout', function($timeout) {
	return {
		restrict: 'A',
		replace: true,
		scope: {
			user: '='
		},
		template: '<div class="profile-card p-icon p-cal scale-fade">' +
						'<div class="p-container">' +
							'<div class="p-icon-text align-vmid">' +
								'<div class="p-icon-style shadow"><i class="fa fa-calendar"></i></div>' +
								'<div class="p-icon-label">Member Since {{user.dateJoined | dateLocal | date:\'MM/dd/yyyy\'}}</div>' +
							'</div>' +
						'</div>' +
					'</div>',
		link: function(scope, element) {
			
		}
	}
}])

.directive('dzDiscCard', ['$timeout', function($timeout) {
	return {
		restrict: 'A',
		replace: true,
		scope: {
			user: '='
		},
		template: '<div class="profile-card p-count scale-fade">' +
						'<div class="p-container">' +
							'<div class="p-count-text align-vmid">' +
								'<div class="p-count-data">{{user.discCount}}</div>' +
								'<div class="p-count-label">Public Discs</div>' +
							'</div>' +
						'</div>' +
					'</div>',
		link: function(scope, element) {
			
		}
	}
}])

.directive('dzMapCard', ['$timeout', function($timeout) {
	return {
		restrict: 'A',
		replace: true,
		scope: {
			user: '=',
			init: '='
		},
		template: '<div class="profile-card p-loc scale-fade">' +
						'<div class="p-container">' +
							'<div class="align-vmid" id="map-parent">' +
								'<div id="card-map"></div>' +
							'</div>' +
						'</div>' +
					'</div>',
		link: function(scope, element) {
			var map, marker, init;
			
			scope.mapId = Math.floor(Math.random() * 100);
			
			var setMarker = function() {
				marker = new google.maps.Marker({
					position: {lat: parseFloat(scope.user.geoLat), lng: parseFloat(scope.user.geoLng)},
					animation: google.maps.Animation.DROP,
					title: scope.user.shortLocation,
					clickable: false,
					map: map,
					icon: {
						url: '/static/img/disc_marker.png',
						size: new google.maps.Size(33, 49),
						origin: new google.maps.Point(0, 0),
						anchor: new google.maps.Point(12, 49)
					}
				});
			}

			scope.initMap = function() {
				var mapContainer = document.getElementById('card-map');
				if (!mapContainer) return;
				map = new google.maps.Map(mapContainer, {
					center: {lat: parseFloat(scope.user.geoLat), lng: parseFloat(scope.user.geoLng)},
					zoom: 4,
					draggable: false,
					scrollwheel: false,
					navigationControl: false,
					mapTypeControl: false,
					scaleControl: false,
					disableDoubleClickZoom: true
				});
				setMarker();
			}

			var clearMarker = function() {
				marker.setMap(null);
				marker = undefined;
			}

			var refreshMap = function() {
				if (typeof(map) !== 'undefined') {
					$timeout(function() {
						map.setCenter(new google.maps.LatLng(parseFloat(scope.user.geoLat),  parseFloat(scope.user.geoLng)));
						clearMarker();
						setMarker();
					});
				}
			}
			
			var unregisterInit = scope.$watch('init', function(newVal) {
				if (newVal !== true) return;
				unregisterInit();
				var unregisterDisplay = scope.$watch(function() { return element[0].style.display; }, function(newVal) {
					if (typeof(newVal) !== 'undefined' && newVal !== 'none') {
						unregisterDisplay();
						$timeout(function() {
							if (!init) {
								scope.initMap();
								init = true;
							}
						}, 300);
					}
				});
			});
			
			scope.$on('$destroy', function() {
					map = undefined;
// 					var mapParentContainer = document.getElementById('map-parent');
// 					mapParentContainer.removeChild(mapParentContainer.childNodes[0]);
			});
		}
	}
}])

.directive('dzStatusBar', [function() {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            showCount: '=',
            totalCount: '=',
            breadcrumbs: '=',
            hideOn: '=',
			homeUrl: '='
        },
        template: '<div class="breadcrumb-container fclear">' +
					'<div class="pagination-container" title="Showing {{showCount}} of {{totalCount}} results" ng-show="$def(showCount)">' +
						'{{showCount}} | <span class="dz-blue">{{totalCount}}</span>' +
					'</div>' +
					'<div class="breadcrumb-trail" ng-show="!hideOn">' +
						'<span class="hover-underline" title="Explore Home"><a ng-href="/{{homeUrl}}"><i class="fa fa-home" style="font-size: 1.1em; color: #008edd"></i></a></span>' +
						'<span class="breadcrumb-item-container" ng-repeat="item in breadcrumbs">' +
							'<span><i class="fa fa-chevron-right"></i><span ng-if="item.title" style="margin-left: 5px">{{item.title}}:</span></span>' +
							'<span class="breadcrumb-item" ng-repeat="link in item.links track by $index">' +
								'<span ng-if="$index > 0">|</span>' +
								'<a class="dz-blue hover-underline" ng-if="link.href" ng-href="{{link.href}}">{{link.text}}</a>' +
								'<span class="dz-italic" ng-if="!link.href" ng-href="link.href">{{link.text}}</span>' +
							'</span>' +
						'</span>' +
					'</div>' +
					'<div class="clearfix"></div>' +
				'</div>',
        link: function(scope, element, attrs) {
			if (typeof(scope.homeUrl) === 'undefined') {
				scope.homeUrl = 'explore';
			}
			
            scope.$def = function(elem) {
                return (typeof(elem) !== 'undefined');
            }
        }
    }
}])

.directive('templateItem', function() {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            template: '='
        },
        templateUrl: '/static/src/pages/partials/templateItem.html',
    }
})

.directive('discItem', ['$timeout', 'QueryService', function($timeout, QueryService) {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            disc: '=',
            currentUser: '=',
			msOpts: '=',
			lbOpts: '='
        },
        templateUrl: '/static/src/pages/partials/discItem.html',
        link: function(scope, element, attrs) {
            scope.getSolrPrimaryImage = function(disc) {
                return QueryService.getSolrPrimaryImage(disc);
            }
			
			scope.isDef = function(x) {
				return typeof(x) !== 'undefined';
			}
			
			scope.setLbOpts = function() {
				scope.lbOpts.discId = scope.disc._id;
				scope.lbOpts.show = true;
			}
        }
    }
}])

.directive('userItem', ['CacheService', function(CacheService) {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            user: '=',
			profileModal: '='
        },
        templateUrl: '/static/src/pages/partials/userItem.html',
        link: function(scope, element, attrs) {
					CacheService.getUser(scope.user._id, function(success, user) {
						if (success) {
							scope.location = user.shortLocation;
							scope.user.image = user.image;
							scope.user.discCount = user.discCount;
							scope.discStyle = {color:(user.discCount >= 200 ? '#008EDD' : (user.discCount >= 50 ? '#8bd1ff' : '#bebebe'))};
							scope.init = true;
						}
					});
        }
    }
}])

.directive('lightbox', ['_', '$window', '$timeout', 'CacheService', function(_, $window, $timeout, CacheService) {
    return {
			restrict: 'E',
			replace: true,
			scope: {
				discId: '=',
				curImg: '=',
				trigger: '='
			},
			templateUrl: '/static/src/pages/partials/lightbox.html',
			link: function(scope, element, attrs) {
				var lb = document.getElementById('lb-content');
				var lbContent, lbImageList, lbImage;
				var pad = 100;
				var padList = 85;
				var width = 0;
				var height = 0;
				scope.isReady;
				scope.index = 0;
				scope.showLightbox = false;
				scope.lbAlert = {};
				scope.disc = {};
				
				scope.backdropExit = function(evt) {
					if (evt.target == element[0]) {
						scope.trigger = false;
					}
				}
				
				var scrollLock = function(lock) {
					if (lock) document.body.classList.add('scroll-lock');
					else document.body.classList.remove('scroll-lock');
				}
				
				var preloadImages = function() {
					angular.forEach(scope.disc.imageList, function(img) {
						var imgObj = new Image();
						imgObj.src = '/files/' + img.fileId;
					});
				}
				
				var handleKeyup = function(e) {
					if (e.keyCode == 39 || e.keyCode == 40) { //right or down
						$timeout(function() {
							scope.index = Math.min(scope.disc.imageList.length - 1, scope.index + 1);
						});
					} else if (e.keyCode == 37 || e.keyCode == 38) { //left or up
						$timeout(function() {
							scope.index = Math.max(0, scope.index - 1);
						});
					} else if (e.keyCode == 27) { //esc
						$timeout(function() {
							scope.trigger = false;
						});
					}
				}
				
				var resize = function() {
					if (!scope.isReady) {
						lbContent = angular.element(document.getElementById('lb-content'));
						lbImageList = angular.element(document.getElementById('lb-image-list'));
						lbImage = angular.element(document.getElementById('lb-image'));
						lbContent.bind('keyup', handleKeyup);
					}

					if ($window.innerHeight < $window.innerWidth) { //landscape
						height = $window.innerHeight - pad;
						lbContent.css('height', height + 'px');
						lbContent.css('width', ($window.innerHeight - pad + padList) + 'px');
						lbImageList.css('max-height', height + 'px');
						lbImage.css('height', height + 'px');
						lbImage.css('width', height + 'px');
					} else { //portrait
						width = $window.innerWidth - pad;
						height = width - padList;
						lbContent.css('height', height + 'px');
						lbContent.css('width', width + 'px');
						lbImageList.css('max-height', height + 'px');
						lbImage.css('height', height + 'px');
						lbImage.css('width', height + 'px');
					}
					lbContent[0].focus();
					
					if (!scope.isReady) {
						$timeout(function() {
							scope.isReady = true;
						});
					}
				}
				
				scope.setImage = function(imgIndex) {
					$timeout(function() {
						scope.index = imgIndex;
					});
				}
				
				scope.$watch('trigger', function(val) {
					if (val === true) {
						scope.loading = true;
						scrollLock(val);
						scope.showLightbox = true;
						element[0].classList.remove('dz-cloak');
						
						CacheService.getDisc(scope.discId, function(success, data) {
							if (!success) {
								scope.lbAlert.error = {
									title: 'Error',
									message: 'Error loading disc images.',
									show: true
								};
							} else {
								scope.disc.primaryImage = data.primaryImage;
								scope.disc.imageList = data.imageList;
								preloadImages();
								scope.startImg = scope.curImg ? scope.curImg : scope.disc.primaryImage;
								scope.index = _.findIndex(scope.disc.imageList, function(img) {
									return img._id == scope.startImg;
								});
								$timeout(resize);
							}
							scope.loading = false;
						});
						
					} else if (val === false) {
						scope.showLightbox = false;
						scrollLock(val);
						scope.disc = {};
					}
				})
				
				angular.element($window).bind('resize', resize);
				
				scope.$on('$destroy', function() {
					angular.element($window).unbind('resize', resize);
					if (typeof(lbContent) !== 'undefined') {
						lbContent.unbind('keyup', handleKeyup);
					}
				});
			}
		}
}])

.directive('dropzonePreview', ['$compile', function($compile){
    return {
        restrict: 'A',
        scope: {},
        link: function(scope, element, attrs) {
            if (attrs.compiled !== 'true') {
                var overlay = element[0].querySelector('.image-overlay');
                element.attr('ng-mouseenter', 'displayOverlay=true;');
                element.attr('ng-mouseleave', 'displayOverlay=false;');
                element.attr('compiled', 'true');
                angular.element(overlay).attr('ng-show', 'displayOverlay');
                $compile(element)(scope.$parent);
            }
        }
    }
}])

.directive('dropzone', function() {
    return function(scope, element, attrs) {
        var config, dropzone;

        config = scope[attrs.dropzone];

        dropzone = new Dropzone(element[0], config.options);

        angular.forEach(config.eventHandlers, function(handler, event) {
            dropzone.on(event, handler);
        });

        scope[attrs.dropzone].getDropzone = function() {
            return dropzone;
        };
    };
})

.directive('imageCropper', ['$window', '$timeout', 'ImageService', 'PageUtils', 
    function($window, $timeout, ImageService, PageUtils) {
        return {
            restrict: 'E',
            scope: {
                cropperOptions: '='
            },
            template: '<div class="backdrop backdrop-dark photo-crop" ng-show="show" ng-style="{\'top\':topMarg + \'px\'}">' + 
                            '<div class="crop-container" ng-style="{\'top\':topInnerMarg + \'px\', \'left\':leftInnerMarg + \'px\'}">' + 
                				'<div class="crop-area" id="image-parent">' + 
                				'</div>' + 
                				'<div class="crop-control-area">' + 
                					'<div class="crop-control">' + 
                						'<button type="button" class="btn btn-default" ng-click="cancel($event)"><span><i class="fa fa-trash fa-tools"></i></span>Cancel</button>' + 
                						'<button type="button" class="btn btn-primary" ng-click="finish($event)"><span><i class="fa fa-save fa-tools"></i></span>Accept</button>' + 
                					'</div>' +
                				'</div>' + 
                			'</div>' + 
                        '</div>',
            replace: true,
            link: function(scope, element, attrs) {
                if (!scope.cropperOptions) {
                    return;
                }
                
                var cropper, imageName, imageSrc;
                
                scope.show = false;
				
				var scrollLock = function(lock) {
					if (lock) document.body.classList.add('scroll-lock');
					else document.body.classList.remove('scroll-lock');
				}
                
                var resizeCropper = function() {
                    var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
                    var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
					
                    $timeout(function() {
                        scope.topInnerMarg = ($window.innerHeight - 500) / 2;
                        scope.leftInnerMarg = (width - 500) / 2;
                    });
                }
    
                var initCropper = function() {
                    var image = document.getElementById('test-crop');
                    cropper = new Cropper(image, {
                        checkOrientation: false,
                        aspectRatio: 1 / 1,
                        autoCropArea: 1,
                        dragMode: 'move',
                        dragCrop: false,
                        cropBoxMovable: false,
                        cropBoxResizable: false,
                        viewMode: 3,
                        built: function() {
                            scope.safeApply(function() {
                                scope.cropperOptions.cropperLoading = false;
                            });
                        }
                    });
                }
                
                angular.element($window).bind('resize', resizeCropper);
            
                scope.$on('$destroy', function() {
                    angular.element($window).unbind('resize load', resizeCropper);
                });
    
                scope.cropperOptions.showCropper = function(name, src) {
                    imageName = name;
                    imageSrc = src;
                    scope.safeApply(function() {
                        scope.show = true;
						scrollLock(true);
                    });
                    var parent = document.getElementById('image-parent');
                    parent.innerHTML = '<img src="' + src + '" id="test-crop"' + 
                        ' filename="' + name + '"/>';
					$timeout(initCropper);
                }
    
                scope.cancel = function(e) {
                    e.preventDefault();
                    $timeout(function() {
                        scope.show = false;
						scrollLock(false);
						scope.cropperOptions.onFinish();
                    cropper.destroy();
                    });
                }
    
                scope.finish = function(e) {
                    e.preventDefault();
                    $timeout(function() {
                        scope.cropperOptions.cropperLoading = true;
                        scope.show = false;
						scrollLock(false);
                    });
                    $timeout(function() {
                        var blob = cropper.getCroppedCanvas().toDataURL();
                        var newFile = ImageService.dataURItoBlob(blob);
                        cropper.destroy();
                        newFile.cropped = true;
                        newFile.name = imageName;
                        scope.cropperOptions.onFinish(newFile);
                        
                    }, 100);
                }
    
                scope.safeApply = function(fn) {
                    var phase = this.$root.$$phase;
                    if (phase == '$apply' || phase == '$digest') {
                        if (fn && (typeof(fn) === 'function')) {
                            fn();
                        }
                    }
                    else {
                        this.$apply(fn);
                    }
                };
                
                resizeCropper();
            }
        }
    }])

.directive('smartMsg', [function() {
	return {
		restrict: 'A',
		replace: true,
		scope: {
			smartMsg: '='
		},
		template: '<span></span>',
		link: function(scope, element, attrs) {
			
			scope.$watch('smartMsg', function() {
				element[0].innerHTML = '';
				
				if (typeof scope.smartMsg === 'undefined') return;
			
				if (typeof scope.smartMsg === 'string') {
					element[0].textContent = scope.smartMsg;
					return;
				}

				var getMatches = function(regex, val) {
					 var matchGroups = [];
					 var match = regex.exec(val);
					 while (match != null) {
						 matchGroups.push(match[1]);
						 match = regex.exec(val);
					 }

					 return matchGroups;
				 }

				if (scope.smartMsg.hasOwnProperty('smartConfig')) {
					var config = scope.smartMsg.smartConfig;
					var text = config.text;
					var output = '';

					if (config.links) {
						var urlRegex = /\<\!(.+)\>/g;
						var matches = getMatches(urlRegex, text);
						for (var i = 0; i < matches.length; i++) {
							var url = config.links.length > i ? config.links[i] : '#';
							text = text.split('<!' + matches[i] + '>').join('<a class="hover-underline dz-blue" href="' + url +'">' + matches[i] + '</a>');
						}
					} 

					output = '<span>' + text + '</span>';

					element[0].innerHTML = output;
				}
			});
		}
	}
}])
    
.directive('dzAlert', ['$timeout', 'PageUtils', function($timeout, PageUtils){
    return {
        restrict: 'E',
        scope: {
            alertData: '=',
			dock: '@'
        },
        replace: true,
        templateUrl: '/static/src/pages/partials/dzAlert.html',
        link: function(scope, element, attrs) {
			var timer;
			
			var forceScroll = attrs.forceScroll === 'true';

			var startTimer = function(timeout) {
				var time = timeout || 3000;
				timer = $timeout(function() {
					scope.alertData = {};
				}, time);
			}

			var handleChange = function(val) {
				if (val.show) element[0].classList.remove('dz-cloak');
				
				if (val.show === true && typeof (val.timeout) !== 'undefined') {
					startTimer(val.timeout);
				} else {
					if (timer) $timeout.cancel(timer);
				}
				
				if (forceScroll) {
					$timeout(function() {
						var top = PageUtils.getTop(element[0]);
						if (PageUtils.getScrollPos() > top || top > (PageUtils.getScrollPos() + PageUtils.getWindowHeight()))
							window.scrollTo(0, top);
					});
				}
			}
			
            scope.$watch('alertData.success.show', function(val) {
                if (typeof val !== 'undefined') {
                    scope.alertData.error = {};
                    scope.alertData.info = {};
					handleChange(scope.alertData.success);
                }
            });
            
            scope.$watch('alertData.error.show', function(val) {
                if (typeof val !== 'undefined') {
                    scope.alertData.success = {};
                    scope.alertData.info = {};
					handleChange(scope.alertData.error);
                }
            });
            
            scope.$watch('alertData.info.show', function(val) {
                if (typeof val !== 'undefined') {
                    scope.alertData.success = {};
                    scope.alertData.error = {};
					handleChange(scope.alertData.info);
                }
            });
        }
    }
}])
    
.directive('navBack', ['$window', function($window) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
             element.on('click', function() {
                 $window.history.back();
             });
         }
    }
}])

.directive('dzConfirm', ['$timeout', function($timeout) {
	return {
		restrict: 'E',
		scope: {
			label: '@',
			icon: '@',
			action: '='
		},
		replace: true,
		template: '<div class="confirm-button" ng-class="{\'open\': confirmActive}" ng-mouseenter="confirmActive && clearReset()" ng-mouseleave="confirmActive && reset()">' +
					  '<div class="confirm-icon" ng-click="toggle()">' +
						  '<i class="fa fa-{{icon}}" title="{{label}}"></i>' +
					  '</div>' +
					  '<div class="confirm-button-inner dz-blue-hover" ng-show="confirmActive" ng-click="doAction()">{{label}}? Click to Confirm</div>' +
					  '<div class="clearfix"></div>' +
				  '</div>',
		link: function(scope, elem, attrs) {
			scope.confirmActive = false;
			var autoClose;
			
			scope.doAction = function() {
				scope.action();
			}
			
			scope.toggle = function() {
				scope.confirmActive = !scope.confirmActive;
			}
			
			scope.clearReset = function() {
				$timeout.cancel(autoClose);
			}
			
			scope.reset = function() {
				autoClose = $timeout(function() {
						scope.confirmActive = false;
						autoClose = undefined;
					}, 1000);
			}
		}
	}
}])

.directive('fitPage', ['$window', '$timeout', function($window, $timeout) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var offset = attrs.offset ? parseInt(attrs.offset) || 0 : 0;
			var timer;
            
            var resize = function() {
				if (timer) {
					$timeout.cancel(timer);
				}
				cancel = $timeout(function() {
					var child = element[0].children[0];
					if (child.clientHeight <= $window.innerHeight) {
						angular.element(element).css('height', ($window.innerHeight + offset) + 'px');
					} else {
						angular.element(element).css('height', 'auto');
					}
				},10);
            }
            
            
            angular.element($window).bind('resize', resize);
			
			scope.$watch(function() {
				return element[0].children[0].clientHeight;
			}, function(newVal) {
				if (typeof(newVal) !== 'undefined') resize();
			});
            
            scope.$on('$destroy', function() {
                angular.element($window).unbind('resize', resize);
            })
            
			resize();
        }
    }
}])

.directive('dzWrapper', ['$window', '$timeout', function($window, $timeout) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.addClass('wrapper');
            
            var resize = function() {
				$timeout(function() {
                	angular.element(element).css('min-height', $window.innerHeight + 'px');
				});
            }
            
            
            angular.element($window).bind('resize', resize);
            
            scope.$on('$destroy', function() {
                angular.element($window).unbind('resize', resize);
            });
            
            resize();
        }
    }
}])

.directive('fitBelowPage', ['$window', function($window) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var offset = attrs.offset ? parseInt(attrs.offset) | 0 : 0;
            
            var resize = function() {
                angular.element(element).css('marginTop', ($window.innerHeight + offset) + 'px');
            }
            
            
            angular.element($window).bind('resize', resize);
            
            scope.$on('$destroy', function() {
                angular.element($window).unbind('resize', resize);
            });
            
            resize();
        }
    }
}])

.directive('centerAlign', function() {
    return {
        restrict: 'A',
        transclude: true,
        template: '<div style="margin: auto; display: table-cell; vertical-align: middle;" ng-transclude></div>',
        link: function(scope, element, attrs) {
            angular.element(element).css('display', 'table').css('width', '100%');
        }
    }
})

/******************************************************************************
* Name:         toggleClass
* Type:         Attribute
* Description:  Toggles a specified class as the element is clicked.
*******************************************************************************/
.directive('toggleClass', [function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.bind('click', function() {
                element.toggleClass(attrs.toggleClass);
            });
        }
    };
}])

/******************************************************************************
* Name:         directiveOn
* Type:         Attribute
* Description:  Conditional directive that adds an object of directives to an 
*               element when a condition becomes true.
*******************************************************************************/
.directive('directiveOn', ['$compile', function($compile) {
    return {
        scope: {
            trigger: '=directiveOn'
        },
        restrict: 'A',
        link: function(scope, element, attrs) {
            var directive = eval('(' + attrs.directiveSet + ')');
					
			var setDirective = function() {
            	directive = eval('(' + attrs.directiveSet + ')');
				for (var a in directive) {
						element.attr(a, directive[a]);
				}

				element.removeAttr('directive-on');
				element.removeAttr('directive-set');
				$compile(angular.element(element[0]))(scope.$parent);
			}

            if (typeof directive === 'object') {
				if (scope.trigger === true) {
					setDirective();
				} else {
					scope.$watch('trigger', function(newValue, oldValue) {
							if (newValue === true) {
								setDirective();
							}
					});
				}
            }
        }
    };
}])

.directive('infiniteScroll', ['$window', function($window) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var raw = element[0];
            
            var onScroll = function(evt) {
                var rectObject = raw.getBoundingClientRect();
                var rectTop = rectObject.top + window.pageYOffset - document.documentElement.clientTop;
                
                if (rectTop + raw.clientHeight <= $window.scrollY + window.innerHeight) {
                    scope.$apply(attrs.infiniteScroll);
                }
            }
            
            angular.element($window).bind('scroll load', onScroll);
            
            scope.$on('$destroy', function() {
                angular.element($window).unbind('scroll load', onScroll);
            })
        }
    };
}])

.directive('ngRepeatFinish', ['$parse', function($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            if (scope.$last) {
                $parse(attrs.ngRepeatFinish)(scope);
            }
        }
    }
}])

.directive('imgLoad', [function() {
    return {
        restrict: 'A', 
        link: function(scope, element, attrs) {
			var bgImg = attrs.bgImage === 'true';
			
			function setSource(src) {
				if (bgImg) {
					element.css('background-image', 'url(' + src + ')');
				} else {
					attrs.$set('src', src);
				}
			}
			
			function handleUrl() {
				var imageObj = new Image();
				imageObj.addEventListener('load', function() {
					setSource(imageObj.src);
				});
				imageObj.src = attrs.imgSrc;
				if (!imageObj.complete) {
					setSource(attrs.imgLoad || '/static/img/dz_disc.png');
				}
			}
			
			function startObs() {
                var stopObserving = attrs.$observe('imgSrc', function() {
                    handleUrl();
                });
			}
			
			if (attrs.imgSrc) {
				handleUrl();
			} else {
				setSource(attrs.imgLoad || '/static/img/dz_disc.png');
			}
			startObs();
        }
    }    
}])

.directive('tagList', ['$timeout', '_', 'QueryService', function($timeout, _, QueryService) {
	return {
		restrict: 'E',
		scope: true,
		template: '<div class="text-list">' + 
					'<a class="text-item tag" ng-href="{{getLink(tag)}}" ng-repeat="tag in tagList track by $index" ng-class="{\'large\':$index < limitLarge, \'med\': ($index >= limitLarge && $index < limitMed)}">' + 
					'{{tag.val}}' + 
					'</a>' + 
				'</div>',
		replace: true,
		link: function(scope, elem, attrs) {
			scope.tagList = [];
			
			scope.getLink = function(tag) {
				return '/explore?mode=all-market&q=' + encodeURIComponent(tag.val);
			}
			
			QueryService.queryFacet({
				query: '*',
				limit: 0,
				marketplace: {
					forSale: true,
					forTrade: true
				},
				facet: {
					name: 'tag',
					limit: 50
				}
			}, function(success, response) {
				if (success && response.facets.dynFilters.tag) {
					$timeout(function() {
						scope.tagList = response.facets.dynFilters.tag.filters || [];

						scope.limitLarge = Math.floor(scope.tagList.length * 0.25);
						scope.limitMed = Math.floor(scope.tagList.length * 0.5);
					});
				}
			});
		}
	}
}])

.directive('exploreCategory', ['$window', '$location', '$timeout', '_', 'QueryService', 
    function($window, $location, $timeout, _, QueryService) {
        return {
            restrict: 'E',
            scope: true,
            templateUrl: '/static/src/pages/partials/exploreCategory.html',
            replace: true,
            link: function(scope, element, attrs) {
				var isRecent = attrs.recent === 'true';
				
                scope.fvalue = isRecent ? 'Recently Added' : attrs.fvalue;
                scope.start = 0;
                scope.dispCount = Math.floor(element[0].clientWidth / 156);
                scope.exploreList = [];
                var filter = [];
				
				if (!isRecent) {
					filter.push({
						name: attrs.field,
						fields: [attrs.fvalue]
					});
				}
                
                scope.getLink = function() {
                    return '/explore?mode=all-market' + (isRecent ? '' : '&s=new&f_0=' + attrs.field + ':' + encodeURIComponent(attrs.fvalue));
                }
                
                scope.navIndex = function(index) {
                    scope.page = index;
                    scope.start = scope.page * scope.dispCount;
                }
                
                scope.pageBack = function() {
                    scope.page = Math.max(0, scope.page - 1);
                    scope.start = scope.page * scope.dispCount;
                }
                
                scope.pageNext = function() {
                    scope.page = Math.min(scope.page + 1, scope.navArr.length - 1);
                    scope.start = scope.page * scope.dispCount;
                }
                
                scope.getDisplayCount = function(){
                   $timeout(function() {
                        scope.dispCount = Math.floor(element[0].clientWidth / 156);
                        scope.navArr = new Array(Math.ceil(scope.exploreList.length / scope.dispCount));
                        scope.page = Math.min(scope.page, scope.navArr.length - 1);
                        scope.start = scope.page * scope.dispCount;
                    });
                }
                
                var resizeCat = function() {
                    scope.getDisplayCount();
                }
                
                angular.element($window).bind('resize', resizeCat);
                
                scope.$on('$destroy', function() {
                    angular.element($window).unbind('resize', resizeCat);
                })
				
				var query = {
                    query: '*',
                    sort: 'new',
                    limit: 20,
					marketplace: {
						forSale: true,
						forTrade: true
					}
                };
				
				if (!isRecent) {
					query.filter = filter;
					query.group = {
                        limit: 3,
                        field: 'userId'
                    };
				}
                
                QueryService.queryAll(query, function(success, response) {
                    if (success) {
						if (!isRecent) { 
							for (var group in response.results) {
								Array.prototype.push.apply(scope.exploreList, response.results[group]);
							}
						} else {
							Array.prototype.push.apply(scope.exploreList, response.results);
						}
                        
                        scope.navArr = new Array(Math.ceil(scope.exploreList.length / scope.dispCount));
                    }
                });
            }
        }
    }])

.directive('modalTrigger', ['$parse', '$timeout', function($parse, $timeout) {
	return {
		restrict: 'A',
		scope: {
			modalOpts: '='
		},
		link: function(scope, elem, attrs) {
			var data = {};
			
			if (attrs.data) {
            	var dataExp = eval('(' + attrs.data + ')');
				for (var a in dataExp) {
					data[a] = $parse(dataExp[a])(scope.$parent);
				}
			}
			
			var showModal = function() {
				$timeout(function() {
					scope.modalOpts.data = data;
					scope.modalOpts.type = attrs.modalTrigger;
					scope.modalOpts.show = true;
				});
			}
			
			scope.$on('$destroy', function() {
				elem.unbind('click', showModal);
			});

			elem.bind('click', showModal);
		}
	}
}])

.directive('dzModal', ['$compile', '$window', '$timeout', function($compile, $window, $timeout) {
	return {
		restrict: 'E',
		scope: {
			modalOpts: '='
		},
		replace: true,
		template: '<div class="full-screen-backdrop no-select" ng-show="showModal">' +
					'<div class="dz-modal-container" id="dz-modal">' +
						'<i class="dz-modal-close fa fa-times" aria-hidden="true" ng-click="!childOpts.lock && (modalOpts.show = false)"></i>' +
						'<div id="dz-modal-inner"></div>' +
					'</div>' +
				  '</div>',
		link: function(scope, elem, attrs) {
			scope.childOpts = {
				lock: false,
				doOnClose: false
			};
			
			var scrollLock = function(lock) {
				if (lock) document.body.classList.add('scroll-lock');
				else document.body.classList.remove('scroll-lock');
			}
			
			scope.resize = function(){
				var modal = document.getElementById('dz-modal');
				
				$timeout(function() {
					angular.element(modal).css('max-height', ($window.innerHeight * 0.8) + 'px');
				});
			}
			
			scope.$on('$locationChangeStart', function(e) {
				scrollLock(false);
			});
			
			scope.$watch('modalOpts.show', function(newVal) {
				if (typeof(newVal) === 'undefined')
					return;
				
				var inner = document.getElementById('dz-modal-inner');
				inner.innerHTML = '';
				
				if (!newVal) {
					scrollLock(newVal);
					scope.showModal = false;
					if (typeof(scope.modalOpts.data) !== 'undefined' && typeof(scope.modalOpts.data.onClose) !== 'undefined') {
						scope.modalOpts.data.onClose(scope.childOpts.doOnClose);
					}
					return;
				}
				
				var newModal = angular.element('<' + scope.modalOpts.type + ' data="modalOpts.data" show="modalOpts.show" lock="childOpts.lock" do-on-close="childOpts.doOnClose" ' + (scope.modalOpts.partial ? 'partial="' + scope.modalOpts.partial + '"' : '') + '></' + scope.modalOpts.type + '>');
				inner.appendChild(newModal[0]);
				$compile(newModal)(scope);
				scrollLock(newVal);
				$timeout(function() {
					scope.showModal = true;
				});
			});
			
			scope.$on('$destroy', function() {
				angular.element($window).unbind('resize', scope.resize);
			});

			angular.element($window).bind('resize', scope.resize);
			
			scope.resize();
		}
	}
}])

.directive('dzFeedbackModal', ['APIService', function(APIService) {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '='
		},
		replace: true,
		templateUrl: '/static/src/pages/partials/dzFeedbackModal.html',
		link: function(scope, elem, attrs) {
			scope.feedback = '';
			scope.feedbackAlert = {};
			
			scope.submit = function() {
				var body = {
					data: scope.feedback
				};
				
				APIService.Post('/feedback', body, function(success, data) {
					if (success) {
						scope.show = false;
					} else {
						scope.feedbackAlert.error = {
							title: data.type,
							message: data.message,
							show: true
						}
					}
				})
			}
		}
	}
}])

.directive('dzInfoModal', ['$window', '$timeout', '$templateRequest', '$compile', function($window, $timeout, $templateRequest, $compile) {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '='
		},
		replace: true,
		template: '<div>' +
						'<div class="dz-modal-content">' +
							'<div class="dz-modal-title-info" id="modal-title"><i class="fa fa-question-circle fa-tools"></i></div>' +
							'<div id="modal-body" style="overflow:auto;"></div>' +
						'</div>' +
						'<div class="dz-modal-btn-container">' +
							'<div class="dz-modal-triangle"></div>' +
							'<div class="dz-modal-btn cancel" ng-click="show = false">Close</div>' +
						'</div>' +
					'</div>',
		link: function(scope, elem, attrs) {
			var body = document.getElementById('modal-body');
			document.getElementById('modal-title').innerHTML += scope.data.title;
			
			$templateRequest('/static/src/pages/partials/' + attrs.partial, true).then(function(partial){
				var node = angular.element(partial);
				body.appendChild(node[0]);
                $compile(node)(scope);
            });
			
			scope.resize = function(){
				$timeout(function() {
					angular.element(body).css('max-height', ($window.innerHeight * 0.8 - 200) + 'px');
				});
			}
			
			scope.$on('$destroy', function() {
				angular.element($window).unbind('resize', scope.resize);
			});

			angular.element($window).bind('resize', scope.resize);
			
			scope.resize();
		}
	}
}])

.directive('dzBumpModal', ['_', 'DiscService', function(_, DiscService) {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '=',
			lock: '=',
			doOnClose: '='
		},
		replace: true,
		templateUrl: '/static/src/pages/partials/dzBumpModal.html',
		link: function(scope, elem, attrs) {
			scope.tableOpts = {
				isCounter: true,
				isDisc: true,
				headerText: 'Disc',
				defaultText: 'Bump Ready',
				items: scope.data.discs
			};
			scope.opts = {};
			scope.modalAlert = {};
			
			scope.confirm = function() {
				var tableContent = document.getElementById('modal-table-content');
				tableContent.scrollTop = 0;
				
				var updateDiscs = function(discs, i, finish) {
					var disc = discs[i];
					
					if (typeof(disc.countdown) !== 'undefined' && disc.countdown.bumpReady) {
						DiscService.bumpDisc(disc._id, function(success, data) {
							if (success) {
								disc.countdown.bumpRemaining = data.bumpRemaining;
								disc.countdown.bumpReady = false;
							} else {
								scope.modalAlert.error = {
									title: data.type,
									message: data.message,
									show: true
								}
							}
							
							if (i > 4)
								tableContent.scrollTop += 30;

							if (i < discs.length - 1) {
								updateDiscs(discs, i+1, finish);
							} else {
								finish();
							}
						});
					}
				}
				
				scope.opts.loading = true;
				scope.doOnClose = true;
				scope.lock = true;
				
				updateDiscs(scope.data.discs, 0, function() {
					scope.opts.loading = false;
					scope.opts.disableBump = true;
					scope.lock = false;
				});
			}
		}
	}
}])

.directive('dzTagModal', ['_', '$timeout', 'DiscService', function(_, $timeout, DiscService) {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '=',
			lock: '=',
			doOnClose: '='
		},
		replace: true,
		templateUrl: '/static/src/pages/partials/dzTagModal.html',
		link: function(scope, elem, attrs) {
			var tempCommon = _.intersection.apply(_, (_.pluck(scope.data.discs, 'tag')));
			scope.newTags = tempCommon.slice();
			scope.tempTag = '';
			
			scope.opts = {};
			scope.modalAlert = {};
			scope.tagAlert = {};
			scope.overwriteAlert = {};
			scope.tableOpts = {
				isDisc: true,
				headerText: 'Disc',
				successText: 'Saved',
				defaultText: 'Unchanged',
				items: scope.data.discs
			};
			
			scope.removeNewTag = function(index) {
				scope.newTags.splice(index,1)[0];
			}
			
			scope.pushTempTag = function() {
				if (typeof(scope.tagAlert.error) !== 'undefined') scope.tagAlert.error.show = false;
				
				if (scope.tempTag && scope.tempTag.length) {
					if (_.contains(scope.newTags, scope.tempTag)) {
						scope.tagAlert.error = {
							title: 'Error',
							message: '"' + scope.tempTag + '" already exists as a common tag.',
							show: true
						}
					} else {
						scope.newTags.push(scope.tempTag);
						scope.tempTag = '';
					}
				}
			}
			
			scope.confirm = function() {
				var tableContent = document.getElementById('modal-table-content');
				tableContent.scrollTop = 0;
				
				var removeArray = _.difference(tempCommon, scope.newTags);
				
				var updateDiscs = function(discs, i, finish) {
					var disc = discs[i];
					var curList = typeof(disc.tag) !== 'undefined' ? disc.tag : [];
					curList = scope.opts.overwrite ? scope.newTags : _.uniq(_.union(_.difference(curList, removeArray), scope.newTags));
					
					if (typeof(disc.success) !== 'undefined') {
						disc.success = false;
					}

					if (typeof(disc.error) !== 'undefined') {
						disc.error = false;
					}
					
					DiscService.editDisc({tagList: curList, _id: disc._id}, function(success, data) {
						if (success) {
							disc.success = true;
						} else {
							disc.error = true;
						}
						
						if (i > 4)
							tableContent.scrollTop += 30;
						
						if (i < discs.length - 1) {
							updateDiscs(discs, i+1, finish);
						} else {
							finish();
						}
					});
				}
				
				scope.opts.loading = true;
				scope.doOnClose = true;
				scope.lock = true;
				
				updateDiscs(scope.data.discs, 0, function() {
					scope.tagAlert.info = {
						title: 'Finished',
						message: 'Tag update is complete.',
						show: true
					}
					
					tempCommon = scope.newTags.slice();
					scope.opts.allowSave = false;
					scope.opts.loading = false;
					scope.lock = false;
				});
			}
			
			scope.$watch('show', function(newVal) {
				$timeout(function() {
					if (newVal === true) {
						scope.opts.isShowing = true;
					}
				}, 500);
			});
			
			scope.$watch('opts.overwrite', function(newVal) {
				if (typeof(newVal) !== 'undefined') {
					if (newVal) {
						scope.opts.allowSave = true;
						scope.overwriteAlert.info = {
							message: 'Enabling this option will REPLACE all tags across all selected discs with the tag list shown above!',
							hideClose: true,
							show: true
						}
					} else {
						scope.overwriteAlert.info.show = false;
					}
				}
			});
			
			scope.$watchCollection('newTags', function(newVal) {
				if (typeof(newVal) !== 'undefined') {
					if (newVal.length != tempCommon.length) {
						scope.opts.allowSave = true;
					} else {
						var intersect = _.intersection(newVal, tempCommon);
						scope.opts.allowSave = intersect.length != newVal.length;
					}
				}
			});
		}
	}
}])

.directive('dzProfileModal', ['_', '$compile', '$window', '$timeout', '$location', 'CacheService', 'MembershipService', 'AccountService', 
							  function(_, $compile, $window, $timeout, $location, CacheService, MembershipService, AccountService) {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '=',
			lock: '='
		},
		replace: true,
		templateUrl: '/static/src/pages/partials/dzProfileModal.html',
		link: function(scope, elem, attrs) {
			var bio = document.getElementById('modal-bio');
			var profileTable = document.getElementById('profile-table');
			var tableCells = document.getElementsByClassName('dz-modal-profile-cell');
			var cellWidth;
			scope.opts = {};
			scope.modalAlert = {};
			
			scope.getUserImage = function() {
				return typeof(scope.user.image) ? scope.user.image : '/static/img/dz_profile.png';
			}
			
			scope.getAccountName = function() {
				return MembershipService.getAccountName(scope.user.accountType);
			}
			
			scope.initMessage = function() {
				$location.path('/inbox').search('userId', scope.user._id);
			}
			
			scope.viewTrunk = function() {
				$location.path('/t/' + scope.user.username).search({});
			}
			
			scope.viewAccount = function() {
				$location.path('/account').search({});
			}
			
			scope.resize = function(){
				$timeout(function() {
					angular.element(bio).css('max-height', ($window.innerHeight * 0.8 - 300) + 'px');
					cellWidth = profileTable.offsetWidth / 3;
					
					_.each(tableCells, function(cell) {
						angular.element(cell).css('width', cellWidth + 'px');
						angular.element(cell).css('max-width', cellWidth + 'px');
					});
				});
			}
			
			scope.$on('$destroy', function() {
				angular.element($window).unbind('resize', scope.resize);
			});

			angular.element($window).bind('resize', scope.resize);
			
			scope.opts.loading = true;
			scope.lock = true;
			var loc = $location.path();
			scope.isTrunk = loc.search('/t/') != -1;
			
			CacheService.getUser(scope.data.userId, function(success, user) {
				if (success) {
					scope.user = user;
					scope.isOwner = AccountService.compareTo(user._id);
					
					if (bio) {
						$compile(bio)(scope);
					}
					scope.userInit = true;
				} else {
					scope.modalAlert.error = {
						title: 'Error',
						message: 'Error retrieving profile.',
						show: true
					}
				}
				scope.opts.loading = false;
				scope.lock = false;
			});
			
			$timeout(function() {
				scope.resize();
			});
		}
	}
}])

.directive('dzDeleteAccountModal', ['AccountService', function(AccountService) {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '=',
			lock: '='
		},
		replace: true,
		templateUrl: '/static/src/pages/partials/dzDeleteAccountModal.html',
		link: function(scope, elem, attrs) {
			scope.opts = {};
			scope.modalAlert = {};
			
			scope.getAccountImage = function() {
				return AccountService.getAccountImage();
			}
			
			scope.confirm = function() {
				scope.opts.loading = true;
				scope.lock = true;
				
				AccountService.doAccountDelete(function(success, response) {
					if (success && response.status == 'OK') {
						scope.modalAlert.success = {
							title: 'Success',
							message: 'An email confirmation has been sent to your email address.',
							show: true
						}
						scope.opts.confirmed = true;
					} else {
						scope.modalAlert.error = {
							title: 'Error',
							message: 'An error occurred while attempting to delete your account.',
							show: true
						}
					}
					
					scope.opts.loading = false;
					scope.lock = false;
				});
			}
		}
	}
}])

.directive('dzDeleteDiscModal', ['DiscService', function(DiscService) {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '=',
			lock: '=',
			doOnClose: '='
		},
		replace: true,
		templateUrl: '/static/src/pages/partials/dzDeleteDiscModal.html',
		link: function(scope, elem, attrs) {
			scope.opts = {};
			scope.modalAlert = {};
			scope.tableOpts = {
				isDisc: true,
				headerText: 'Disc',
				successText: 'Deleted',
				defaultText: 'Unchanged',
				items: scope.data.discs
			};
			
			scope.confirm = function() {
				var tableContent = document.getElementById('modal-table-content');
				tableContent.scrollTop = 0;
				
				var deleteDiscs = function(discs, i, finish) {
					var disc = discs[i];
					
					DiscService.deleteDisc(disc, function(success, data) {
						if (success) {
							disc.success = true;
						} else {
							disc.error = true;
						}
						
						if (i > 4)
							tableContent.scrollTop += 30;
						
						if (i < discs.length - 1) {
							deleteDiscs(discs, i+1, finish);
						} else {
							finish();
						}
					});
				}
				
				scope.opts.loading = true;
				scope.doOnClose = true;
				scope.lock = true;
				
				deleteDiscs(scope.data.discs, 0, function() {
					scope.modalAlert.info = {
						title: 'Finished',
						message: 'Disc deletion is complete.',
						show: true
					}
					
					scope.opts.loading = false;
					scope.lock = false;
				});
			}
		}
	}
}])

.directive('dzVisibilityModal', ['DiscService', function(DiscService) {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '=',
			lock: '=',
			doOnClose: '='
		},
		replace: true,
		templateUrl: '/static/src/pages/partials/dzVisibilityModal.html',
		link: function(scope, elem, attrs) {
			scope.opts = {};
			scope.modalAlert = {};
			scope.tableOpts = {
				isDisc: true,
				isVisibility: true,
				headerText: 'Disc',
				items: scope.data.discs
			};
			scope.makePublic = true;
			
			scope.confirm = function() {
				var tableContent = document.getElementById('modal-table-content');
				tableContent.scrollTop = 0;
				
				var updateDiscs = function(discs, i, finish) {
					var disc = discs[i];
					
					if (typeof(disc.success) !== 'undefined') {
						disc.success = false;
					}

					if (typeof(disc.error) !== 'undefined') {
						disc.error = false;
					}
					
					DiscService.editDisc({visible: scope.makePublic, _id: disc._id}, function(success, data) {
						if (success) {
							disc.visible = scope.makePublic;
							disc.success = true;
						} else {
							disc.error = true;
						}
						
						if (i > 4)
							tableContent.scrollTop += 30;
						
						if (i < discs.length - 1) {
							updateDiscs(discs, i+1, finish);
						} else {
							finish();
						}
					});
				}
				
				scope.opts.loading = true;
				scope.doOnClose = true;
				scope.lock = true;
				
				updateDiscs(scope.data.discs, 0, function() {
					scope.opts.loading = false;
					scope.lock = false;
				});
			}
		}
	}
}])

.directive('dzMarketplaceModal', ['DiscService', 'AccountService', function(DiscService, AccountService) {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '=',
			lock: '=',
			doOnClose: '='
		},
		replace: true,
		templateUrl: '/static/src/pages/partials/dzMarketplaceModal.html',
		link: function(scope, elem, attrs) {
			scope.opts = {};
			scope.modalAlert = {};
			scope.tempMarketplace = {
				forSale: false,
				forTrade: false
			};
			scope.tableOpts = {
				isDisc: true,
				isMarketplace: true,
				headerText: 'Disc',
				items: scope.data.discs
			};
			
			scope.confirm = function() {
				var tableContent = document.getElementById('modal-table-content');
				tableContent.scrollTop = 0;
				
				var updateDiscs = function(discs, i, finish) {
					var disc = discs[i];
					
					if (disc.ineligible) {
						return next(discs, i, finish);
					}
					
					disc.success = false;
					disc.error = false;
					
					DiscService.editDisc({marketplace: scope.tempMarketplace, _id: disc._id}, function(success, data) {
						if (success) {
							disc['marketplace.forSale'] = scope.tempMarketplace.forSale;
							disc['marketplace.forTrade'] = scope.tempMarketplace.forTrade;
							disc.success = true;
						} else {
							disc.error = true;
						}
						
						return next(discs, i, finish);
					});
				}
				
				var next = function(discs, i, finish) {
					if (i > 4)
						tableContent.scrollTop += 30;
					
					if (i < discs.length - 1) {
						return updateDiscs(discs, i+1, finish);
					} else {
						return finish();
					}
				}
				
				scope.opts.loading = true;
				scope.doOnClose = true;
				scope.lock = true;
				
				updateDiscs(scope.data.discs, 0, function() {
					AccountService.getAccountMarket(function(success, data) {
						if (!success) {
							scope.modalAlert.error = {
								title: 'Error',
								message: 'Error updating marketplace remaining count.',
								show: true
							}
						}
						scope.data.marketData.marketAvailable = data.marketAvailable;
					});
					scope.opts.loading = false;
					scope.lock = false;
				});
			}
		}
	}
}])

.directive('dzShareModal', ['_', '$location', '$timeout', 'QueryService', 'AccountService', 'FacebookUtils', function(_, $location, $timeout, QueryService, AccountService, FacebookUtils) {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '=',
			lock: '='
		},
		replace: true,
		templateUrl: '/static/src/pages/partials/dzShareModal.html',
		link: function(scope, elem, attrs) {
			scope.linkOpts = {};
			scope.modalAlert = {};
			scope.fbModalAlert = {};
			scope.loading = {
				fb: true
			};
			scope.formData = {
				linkType: 'full'
			};
			
			var urlBase = $location.absUrl().replace($location.url(), '');
			
			var getSolrPrimaryImage = function(disc) {
                return QueryService.getSolrPrimaryImage(disc);
            }
			
			var getPrimaryImage = function(disc) {
				if (typeof(disc) !== 'undefined') {
					var imgObj = _.findWhere(disc.imageList, {_id: disc.primaryImage});
					return typeof(imgObj) === 'undefined' ? '/static/img/dz_disc.png' : '/files/' + imgObj.thumbnailId;
				}
			}
			
			var initFb = function(path) {
				FacebookUtils.initFacebook().then(function() {
					FacebookUtils.scrapePath(path, function(error) {
						$timeout(function() {
							if (error) {
								scope.fbModalAlert.error = {
									title: 'Facebook Unavailable',
									message: 'Facebook is unavailable at this time. Please try again.',
									show: true
								}
							} else {
								scope.facebookInit = true;
							}
							scope.loading.fb = false;
						});
					});
				});
			}
			
			var getLink = function() {
				if (scope.isDisc) {
					scope.linkOpts.link = urlBase + '/d/' + scope.data.disc._id;
				} else if (scope.isTrunk) {
					if (scope.formData.linkType == 'base') {
						scope.linkOpts.link = urlBase + '/t/' + scope.data.user.username;
					} else if (scope.formData.linkType == 'full') {
						scope.linkOpts.link = $location.absUrl();
					}
				}
				
				$timeout(function() {
					document.getElementById('input-link').select();
				});
			}
			
			scope.getDiscImage = function(disc) {
				if (typeof(disc) !== 'undefined') {
					if (_.isArray(disc.imageList)) {
						return getPrimaryImage(disc);
					} else {
						return getSolrPrimaryImage(disc);
					}
				}
			}
			
			scope.getAccountImage = function() {
				return scope.data.user ? scope.data.user.image : '/static/img/dz_profile.png';
			}
			
			scope.shareFB = function() {
				if (scope.isDisc) {
					FacebookUtils.shareFacebook('/d/' + scope.data.disc._id);
				} else if (scope.isTrunk) {
					FacebookUtils.shareFacebook('/t/' + scope.data.user._id);
				}
			}
			
			scope.showLink = function() {
				scope.linkOpts.linkSelected = true;
				getLink();
			}
			
			scope.$watch('formData.linkType', function(newVal) {
				if (typeof(newVal) !== 'undefined') getLink();
			});
			
			if (typeof(scope.data.disc) !== 'undefined') {
				scope.isDisc = true;
				scope.typeText = 'disc';
				
				scope.modalAlert.info = {
					title: 'Note',
					message: 'A shared link will be broken if this disc is marked private.',
					hideClose: true,
					show: true
				}
				
				initFb('/d/' + scope.data.disc._id);
			} else if (typeof(scope.data.user) !== 'undefined') {
				scope.isOwner = AccountService.compareTo(scope.data.user._id);
				scope.isTrunk = true;
				scope.typeText = 'trunk';
				
				if (scope.isOwner) {
					scope.modalAlert.info = {
						title: 'Note',
						message: 'Only your public discs will be visible when sharing your trunk.',
						hideClose: true,
						show: true
					}
				}
				
				initFb('/t/' + scope.data.user.username);
			}
		}
	}
}])

.directive('dzAcknowledgementModal', ['DiscService', function(DiscService) {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '=',
			doOnClose: '='
		},
		replace: true,
		templateUrl: '/static/src/pages/partials/dzAcknowledgementModal.html',
		link: function(scope, elem, attrs) {
			if (typeof(scope.data.message1) !== 'undefined') {
				document.getElementById('modal-message-1').innerHTML = scope.data.message1;
			}
			if (typeof(scope.data.message2) !== 'undefined') {
				document.getElementById('modal-message-2').innerHTML = scope.data.message2;
			}
			
			scope.confirm = function() {
				scope.doOnClose = true;
				scope.show = false;
			}
		}
	}
}])

.directive('dzModalTable', ['_', 'QueryService', 'DiscService', function(_, QueryService, DiscService) {
	return {
		restrict: 'E',
		scope: {
			successText: '=',
			defaultText: '=',
			tableOpts: '='
		},
		replace: true,
		templateUrl: '/static/src/pages/partials/dzModalTable.html',
		link: function(scope, elem, attrs) {
			
			var getSolrPrimaryImage = function(disc) {
                return QueryService.getSolrPrimaryImage(disc);
            }
			
			var getPrimaryImage = function(disc) {
				var imgObj = _.findWhere(disc.imageList, {_id: disc.primaryImage});
				return '/files/' + imgObj.thumbnailId;
			}
			
			scope.getImage = function(item) {
				if(scope.tableOpts.isDisc) {
					if (_.isArray(item.imageList)) {
						return getPrimaryImage(item);
					} else {
						return getSolrPrimaryImage(item);
					}
				} else {
					// if table is not for discs (ex. profiles)
				}
			}
			
			scope.$watch('tableOpts.isCounter', function(newVal) {
				if (typeof(newVal) !== 'undefined' && newVal === true) {
					_.each(scope.tableOpts.items, function(disc) {
						if (disc['marketplace.forSale'] || disc['marketplace.forTrade']) {
							disc.countdown = {};
							disc.countdown.loading = true;
							DiscService.getBumpRemaining(disc._id, function(success, data) {
								if (!success) {
									disc.error = true;
								} else {
									disc.countdown.bumpRemaining = data.bumpRemaining;
									disc.countdown.init = true;
								}
								disc.countdown.loading = false;
							});
						}
					});
				}
			});
		}
	}
}])

.directive('ngEnter', ['$timeout', function ($timeout) {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			
			if (typeof(attrs.ngEnterLock) !== 'undefined') {
				element.bind('keydown', function(event) {
					if(event.which === 13 && !event.shiftKey) {
						event.preventDefault();
					};
				})
			}
			
        	element.bind("keyup", function (event) {
				if(event.which === 13 && !event.shiftKey) {
					event.preventDefault();
					event.stopImmediatePropagation();
					$timeout(function (){
						scope.$eval(attrs.ngEnter);
						event.preventDefault();
					});
				}
			});
		}
	}
}])

.directive('ngModelEnter', ['$timeout', function ($timeout) {
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function (scope, element, attrs, ngModelCtrl) {
        	element.bind("keyup", function (event) {
            	if(event.which === 13 && !event.shiftKey) {
					if (ngModelCtrl.disableEnter) {
						return;
					}
					event.stopImmediatePropagation();
					$timeout(function (){
						ngModelCtrl.$commitViewValue();
						scope.$eval(attrs.ngModelEnter);
						event.preventDefault();
					});
				}
			});
		}
	}
}])

/******************************************************************************
* 
* CONTROLLERS
* 
*******************************************************************************/

/******************************************************************************
* Name:         MainController
* Description:  Parent controller for all child scopes in the app. Initializes 
*               the dashboard and sets app-related settings.
*******************************************************************************/
.controller('MainController', ['$rootScope', '$scope', '$location', 'AccountService', '_', 'APIService', 'QueryService', 'SocketUtils', 'DiscService',
    function($rootScope, $scope, $location, AccountService, _, APIService, QueryService, SocketUtils, DiscService) {
        $scope.Math = window.Math;
        $scope.nav = function(url, replace) {
            $location.path('/' + (url ? url : '')).search({});
            
            if (replace) {
                $location.replace();
            }
        }
        
        $scope.navExplore = function(search) {
            $location.path('/explore').search('q', search);
        }

        $scope.$def = function(obj) {
            return typeof obj !== 'undefined';
        }
        
        $scope.safeApply = function(fn) {
            if (this.$root && this.$root.$$phase) {
                var phase = this.$root.$$phase;
                if (phase == '$apply' || phase == '$digest') {
                    if (fn && (typeof(fn) === 'function')) {
                        fn();
                    }
                }
                else {
                    this.$apply(fn);
                }
            }
            
        }
        
        $scope.containsStr = function(parent, child) {
            return _.contains(parent, String(child));
        }
        
        $scope.getUserImage = function(user) {
            return user.image ? user.image : '/static/img/dz_profile.png';
        }
        
        $scope.getPrimaryImage = function(disc) {
            if (disc.primaryImage) {
                var imgObj = _.findWhere(disc.imageList, {_id: disc.primaryImage});
                if (imgObj) {
                    return '/files/' + imgObj.fileId;
                }
            }
            return '/static/img/dz_disc.png';
        }
        
        $scope.log = function(obj) {
            console.log(obj);
        }
        
        $scope.getSolrPrimaryImage = function(disc) {
            return QueryService.getSolrPrimaryImage(disc);
        }
        
		$scope.toggle = function(val) {
			val = !val;
		}
				
    }
])

/******************************************************************************
* Name:         PortalController
* Description:  Controller for explore/marketplace functionality. 
*******************************************************************************/
.controller('PortalController', ['$scope', '$location', '$window', '$timeout', 'smoothScroll', 'PageUtils',
    function($scope, $location, $window, $timeout, smoothScroll, PageUtils) {
        var topExplore = document.getElementById('explore-start');
		var lastX;
        
		$location.search({}); // clear search params
        $scope.transform = 'rotate(0deg)';
		
        $scope.scrollPage = function() {
            var options = {
                duration: 700,
                easing: 'easeInQuad',
                offset: 50
            }
            
            smoothScroll(topExplore, options);
        }
        
        var updatePageIcon = function() {
            var x = Math.min(180, PageUtils.getScrollPos());
			
			if (x != lastX) {
				$timeout(function() {
					$scope.transform = 'rotate(' + x + 'deg)';
				});
				lastX = x;
			}
        }
        
        angular.element(document).bind('scroll', updatePageIcon);
        
        $scope.$on('$destroy', function() {
            angular.element(document).unbind('scroll', updatePageIcon);
        });
    }
])

/******************************************************************************
* Name:         TrunksController
* Description:  Controller for user trunks functionality. 
*******************************************************************************/

.controller('TrunksController', ['$scope', '$location', '$routeParams', '$window', '_', '$timeout', 'smoothScroll', 'QueryUserService', 'CacheService', 'AccountService', 'LocationService', 'PageUtils', 'PageCache', 'PropService',  
	function($scope, $location, $routeParams, $window, _, $timeout, smoothScroll, QueryUserService, CacheService, AccountService, LocationService, PageUtils, PageCache, PropService) {
		var init = true;
        var reqSize = PropService.get('TrunkReqSize');
		var sortSet = false;
		var cacheSettings;
		var loadMoreActive = false;
		var locationSearch = angular.element(document.getElementById('location-search'));
		var locationResults = document.getElementById('location-results');
		
        $scope.curUser = AccountService.getAccount();
        $scope.activeFilters = [];
		$scope.breadcrumbs = [];
        $scope.resultList = [];
        $scope.resultFilters = {};
		$scope.location = {
			results: [],
			loading: false,
			locSet: false
		};
        $scope.pagination = { start: 0, total: 0 };
		$scope.units = 'miles';
		$scope.statusHome = 'trunks';
		
        $scope.searchParam = '';
        $scope.sortParam = 'rel';
        
        $scope.loading = true;
        $scope.loadingMore = false;
		
		$scope.itemSelected = function() {
			$scope.setLocation($scope.location.results[$scope.location.selResult]);
		}
		
		var refreshPage = function() {
			cacheSettings = {
				loadCount: $scope.resultList.length,
				routeTime: new Date(),
				scrollPos: PageUtils.getScrollPos()
			};
			$scope.handleUrl();
		}
		
		var updateBreadcrumbs = function() {
			$scope.breadcrumbs = [];
			
			if ($scope.searchParam.length) {
				$scope.breadcrumbs.push({
					title: 'Searching',
					links: [
						{text: '"' + $scope.searchParam + '"'}
					]
				});
			}
			
			if ($scope.geo && $scope.geo.distance) {
				$scope.breadcrumbs.push({
					title: 'In',
					links: [
						{text: $scope.location.curLocation}
					]
				});
				
				$scope.breadcrumbs.push({
					title: 'Radius',
					links: [
						{text: $scope.geo.distance + ' ' + $scope.units, href: '/trunks?d=' + $scope.geo.distance}
					]
				});
			}
			
			var filters = [];
			_.each($scope.activeFilters, function(filter) {
				var item = { title: filter.text, links: []};
				var tempFilter = {name: filter.name, fields: []};
				filters.push(tempFilter);
				
				_.each(filter.fields, function(field) {
					tempFilter.fields.push(field);
					item.links.push({
						text: field === 'true' ? 'Active' : field,
						href: $location.path() + QueryUserService.getQueryString({
							query: $scope.searchParam,
							sort: sortSet ? $scope.sortParam : undefined,
							locSet: $scope.location.locSet,
							filter: filters,
							geo: $scope.geo,
						})
					});
				});
				
				$scope.breadcrumbs.push(item);
			});
		}
        
        $scope.loadMore = function() {
            if ($scope.loading || init || loadMoreActive) return;
			
			loadMoreActive = true;
            
            if ($scope.resultList.length < $scope.pagination.total) {
				var nextStart = $scope.resultList.length;
                $scope.pagination.start = nextStart;
                $scope.performSearch(true);
            }
        }
		
		$scope.locationAllowed = function() {
			return LocationService.isLocationAvailable();
		}
		
		$scope.hideLocResults = function() {
			$timeout(function() {
				$scope.location.editable = false;
				$scope.location.loading = false;
				$scope.location.search = '';
				$scope.location.selResult = -1;
			}, 300);
		}
		
		$scope.setLocation = function(result) {
			$scope.location.editable = false;
			$scope.location.curLocation = result.address;
			if (!$scope.geo) {
				$scope.geo = {};
			}
			
			$scope.geo.latitude = result.latitude;
			$scope.geo.longitude = result.longitude;
			$scope.location.locSet = true;
			
			$scope.updateUrl();
		}
		
		$scope.$watch('location.search', function(newLoc) {
			$scope.location.selResult = -1;
			if (newLoc && newLoc.length > 3) {
				$scope.location.loading = true;
				LocationService.getGeoLocation(newLoc, function(success, results) {
					if (success) {
						$scope.location.results = results;
						$scope.location.selResult = -1;
					} else {
						$scope.location.results = [];
					}
					$scope.location.loading = false;
				});
			} else {
				$scope.location.results = [];
			}
		});
		
		$scope.startSearch = function() {
			$scope.activeFilters = [];
			$scope.geo = undefined;
			$scope.sortParam = undefined;
			$scope.updateUrl();
		}
		
		$scope.isFilterActive = function(facet, filter) {
            var prop = _.find($scope.activeFilters, {name: facet.prop});
            filter.active = prop && $scope.containsStr(prop.fields, filter.val);
            return filter.active;
        }
        
        $scope.hasActiveFilters = function(facet) {
            var prop = _.find($scope.activeFilters, {name: facet.prop});
            
            return prop && prop.fields.length;
        }
        
        $scope.clearActiveFilters = function(facet, silent) {
            $scope.activeFilters = _.filter($scope.activeFilters, function(filter) { return filter.name != facet.prop });
            if (!silent) $scope.updateUrl();
        }
		
		$scope.toggleFilter = function(facet, filter) {
            var prop = _.find($scope.activeFilters, {name: facet.prop});
            
            if (prop) {
                if ($scope.containsStr(prop.fields, filter.val)) {
                    prop.fields = _.without(prop.fields, String(filter.val));
                } else {
                    prop.fields.push(filter.val);
                }
            } else {
                $scope.activeFilters.push({
                    name: facet.prop,
                    text: facet.text,
                    fields: [filter.val]
                });
            }
            
            $scope.activeFilters = _.filter($scope.activeFilters, function(item) { return item.fields.length > 0});
            $scope.updateUrl();
		}
		
		$scope.toggleVerification = function(facet) {
			$scope.toggleFilter(facet, {val: true});
		}
		
		$scope.isVerificationActive = function(facet) {
			return $scope.isFilterActive(facet, {val: true});
		}
		
		$scope.hasVerificationsActive = function() {
			if (typeof($scope.resultFilters.statFilters) === 'undefined') return false;
			var verifications = _.filter($scope.activeFilters, function(filter) {
				return typeof($scope.resultFilters.statFilters[filter.name] !== 'undefined');
			});
			
			return verifications.length;
		}
		
		$scope.clearActiveVerifications = function() {
			_.each($scope.resultFilters.statFilters, function(filter) {
				$scope.clearActiveFilters(filter, true);
			});
			
			$scope.updateUrl();
		}
        
        $scope.updateUrl = function() {
            $scope.pagination.start = 0;
            $location.url($location.path() + QueryUserService.getQueryString({
				query: $scope.searchParam,
				sort: sortSet ? $scope.sortParam : undefined,
				filter: $scope.activeFilters,
				geo: $scope.geo,
				locSet: $scope.location.locSet
			}));
        }
		
		$scope.updateLocation = function() {
			if ($scope.geo && $scope.geo.latitude && $scope.geo.longitude) {
				$scope.location.loading = true;
				LocationService.getReverseGeo($scope.geo.latitude, $scope.geo.longitude, 
					function(success, data) {
						if (success && data.length) {
							$scope.location.curLocation = data[0].address;
						} else {
							$scope.location.curLocation = 'Unknown';
						}
						$scope.location.loading = false;
						updateBreadcrumbs();
					});
			} else {
				$scope.location.curLocation = undefined;
				updateBreadcrumbs();
			}
		}
		
		$scope.performSearch = function(appendOnly) {
            if (appendOnly) {
                $scope.loadingMore = true;
            } else {
                $scope.loading = true;
				$scope.pagination.start = 0;
            }
			
			var override = typeof(cacheSettings) !== 'undefined' && !cacheSettings.loaded;
            
            QueryUserService.queryAll({
                query: $scope.searchParam,
                sort: $scope.sortParam,
                filter: $scope.activeFilters,
                start: override ? 0 : $scope.pagination.start,
                limit: override ? Math.max(cacheSettings.loadCount, reqSize) : reqSize,
				geo: $scope.geo
            }, function(success, response) {
                    if (success) {
						if (override) cacheSettings.loaded = true;
                        $scope.pagination.start = response.start;
                        $scope.pagination.total = response.total;
                        
                        if (appendOnly) {
                            Array.prototype.push.apply($scope.resultList, response.results);
                        } else {
                            $scope.resultList = response.results;
                            $scope.resultFilters = response.facets;
                        }
                    }
					$scope.updateLocation();
                    $scope.loading = false;
                    $scope.loadingMore = false;
					loadMoreActive = false;
                });
        }
		
		$scope.onLastUser = function() {
			$scope.resizeRes(function() {
				if (typeof(cacheSettings) !== 'undefined' && !cacheSettings.scrolled) {
					window.scrollTo(0, cacheSettings.scrollPos);
					cacheSettings.scrolled = true;
				}
				
            	var resList = document.getElementById('results-list');
				if (PageUtils.getWindowHeight() > PageUtils.getFullHeight(resList) && $scope.pagination.total > $scope.resultList.length) {
					$scope.loadMore();
				}
			});
		}
        
        $scope.resizeRes = function(callback){
            var resCont = document.getElementById('results-container');
            var resList = document.getElementById('results-list');
			var resHeaderStatic = document.getElementById('result-header-static');
			var resHeaderFluid = document.getElementById('result-header-fluid');
			
            $timeout(function() {
            	angular.element(resList).css('width', Math.floor(resCont.clientWidth / 207) * 207 + 'px');
				angular.element(resHeaderFluid).css('padding-right', resHeaderStatic.clientWidth + 10 + 'px');
				if (typeof(callback) === 'function') return callback();
            });
        }
		
		$scope.$on('$locationChangeStart', function() {
			PageCache.setData({
				loadCount: $scope.resultList.length,
				routeTime: new Date(),
				scrollPos: PageUtils.getScrollPos()
			});
		});
		
		$scope.updateSort = function() {
            sortSet = true;
            $scope.updateUrl();
        }
		
		$scope.setProximity = function(geoFacet) {
			if (!geoFacet) {
				$scope.geo.distance = undefined;
			} else if ($scope.geo) {
				$scope.geo.distance = geoFacet.val;
			}
			
			$scope.updateUrl();
		}
		
		$scope.isProximityActive = function(geoFacet) {
			if (geoFacet) {
				return $scope.geo && $scope.geo.distance == geoFacet.val;
			} else {
				return $scope.geo && $scope.geo.distance;
			}
		}
        
        $scope.$watch('fullscreen', function(newVal) {
            $timeout(function() {
                $scope.resizeRes();
            });
        });
		
		$scope.getLocation = function(distance, callback) {
			var d = distance;
			if (typeof(distance) === 'undefined') {
				if ($scope.geo && $scope.geo.distance) {
					d = $scope.geo.distance;
				}
			}
			
			LocationService.getLocation(function(success, coords) {
				if (success) {
					$scope.geo = {
						latitude: coords.latitude,
						longitude: coords.longitude,
						distance: distance
					}
					$scope.location.locSet = false;
				} else {
					$scope.geo = {};
					$scope.location.locSet = false;
				}
				
				if (callback) callback();
				else $scope.performSearch();
			});
		}
		
		var setParams = function(ret) {
			if (!ret) ret = {};
			var distanceSet = $scope.geo && typeof($scope.geo.distance) !== 'undefined';
			var latSet = $scope.geo && typeof($scope.geo.latitude) !== 'undefined' && typeof($scope.geo.longitude) !== 'undefined';
			
			if (ret.sort) {
					switch (ret.sort) {
						case 'proximity': {
							$scope.sortParam = (distanceSet || latSet) ? ret.sort : 'rel';
							break;
						}
						default: 
							$scope.sortParam = ret.sort;
					}
                } else if (ret.search.length) {
                    $scope.sortParam = 'rel';
                } else if (distanceSet || latSet) {
					$scope.sortParam = 'proximity';
				} else {
					$scope.sortParam = 'rel';
				}
			
			$scope.performSearch();
		}
		
        $scope.$watch(function () { return $location.url(); }, function (url) {
            if (url && /^\/(trunks)/.test(url)) {
				
				if (PageCache.isNavBack()) {
					var data = PageCache.getPageData();
					if (data) {
						cacheSettings = data;
					}
				}
				
                var ret = QueryUserService.parseUrlQuery($location.search());
				var distanceSet = ret.geo && typeof(ret.geo.distance) !== 'undefined';
				var latSet = ret.geo && ret.geo.latitude && ret.geo.longitude;
                
                $scope.activeFilters = ret.filters;
                $scope.searchParam = ret.search;
				
				if (ret.geo) {
					if (ret.geo.latitude && ret.geo.longitude) {
						$scope.geo = {
							latitude: ret.geo.latitude,
							longitude: ret.geo.longitude,
							distance: ret.geo.distance
						}
						$scope.location.locSet = true;
						setParams(ret);
					} else if (distanceSet) {
						$scope.getLocation(ret.geo.distance, function() {
							setParams(ret);
						});
					}
				} else {
					$scope.getLocation(undefined, function() {
						setParams(ret);
					});
				}
            }
        });
        
        $scope.$on('$destroy', function() {
            angular.element($window).unbind('resize', $scope.resizeRes);
        });
		
		angular.element($window).bind('resize', $scope.resizeRes);
		
		$scope.resizeRes();
		
		init = false;
		
	}])

/******************************************************************************
* Name:         ExploreController
* Description:  Controller for explore functionality. 
*******************************************************************************/
.controller('ExploreController', ['$scope', '$location', '$routeParams', '$window', '$q', '_', '$timeout', 'QueryService', 
								  'CacheService', 'AccountService', 'DiscService', 'RedirectService', 'APIService', 'MembershipService', 'PageCache', 'PageUtils', 'PropService', 
    function($scope, $location, $routeParams, $window, $q, _, $timeout, QueryService, CacheService, AccountService, DiscService, RedirectService, APIService, MembershipService, PageCache, PageUtils, PropService) {
        var init = true;
        var sortSet = false;
        var reqSize = PropService.get('ExploreReqSize');
		var cacheSettings;
		var loadMoreActive = false;
		$scope.view = {};
        $scope.curUser = AccountService.getAccount();
        $scope.activeFilters = [];
		$scope.breadcrumbs = [];
        $scope.resultList = [];
        $scope.resultFilters = [];
        $scope.trunk = {};
		$scope.lbOpts = {};
		$scope.alertOpts = {};
		
		$scope.isOwnedTrunk = $routeParams.username && $scope.curUser && $routeParams.username === $scope.curUser.username;
		
		$scope.marketplace = {
			forSale: !$scope.isOwnedTrunk,
			forTrade: !$scope.isOwnedTrunk,
			all: $scope.isOwnedTrunk
		}
        $scope.pagination = { start: 0, total: 0 };
        
        $scope.searchParam = '';
        $scope.sortParam = PropService.get('ExploreDefSort');
        
        $scope.loading = true;
        $scope.loadingMore = false;
		
		$scope.msOpts = {
			active: false,
			count: 0,
			loading: false,
			showIneligible: false,
			showNoCount: false
		};
		
		var refreshPage = function() {
			cacheSettings = {
				loadCount: $scope.resultList.length,
				routeTime: new Date(),
				scrollPos: PageUtils.getScrollPos()
			};
			$scope.handleUrl();
		}
		
		var loadAllDiscs = function(callback) {
			$scope.loadMore($scope.pagination.total, function() {
				reqSize = 20;
				if (callback) return callback();
			});
		}
		
		$scope.shareTrunk = function() {
			$scope.globalModalOpts = {
				type: 'dz-share-modal',
				show: true,
				data: {
					user: $scope.trunk.user
				}
			}
		}
		
		$scope.msOpts.showMsHelp = function() {
			$scope.globalModalOpts = {
				type: 'dz-info-modal',
				show: true,
				data: {
					title: 'Multi-select Toolbox Help'
				},
				partial: 'dzMsInfo.html'
			}
		}
		
		$scope.hasMsPermission = function(msFn) {
			if ($scope.curUser) {
				return MembershipService.hasPermission(msFn, $scope.curUser.accountType);
			}
		}
		
		var doSelectAll = function() {
			$scope.msOpts.loading = true;
			$scope.msOpts.count = 0;
			
			loadAllDiscs(function() {
				$timeout(function() {
					_.each($scope.resultList, function(result) {
						result.selected = true;
						$scope.msOpts.count += 1;
					});
					$scope.msOpts.loading = false;
				});
			});
		}
		
		$scope.msOpts.selectAll = function() {
			var remaining = $scope.pagination.total - $scope.resultList.length;
			
			if (remaining > 40) {
				$scope.globalModalOpts = {
					type: 'dz-acknowledgement-modal',
					show: true,
					data: {
						message1: 'You are attempting to load and select ' + remaining + ' more discs.  Please be patient if you wish to proceed.',
						message2: 'Do you wish to proceed?',
						onClose: function(confirmed) {
							if (confirmed) doSelectAll();
						}
					}
				}
			} else {
				doSelectAll();
			}
		}
		
		$scope.msOpts.deselectAll = function() {
			$scope.msOpts.count = 0;
			var results = _.where($scope.resultList, {selected: true});
			_.each(results, function(result) {
				result.selected = false;
			});
		}
		
		$scope.msOpts.setVisibility = function() {
			var results = _.where($scope.resultList, {selected: true});
			
			if (results.length) {
				$scope.globalModalOpts = {
					type: 'dz-visibility-modal',
					show: true,
					data: {
						discs: results,
						onClose: function(reload) {
							AccountService.getAccount(function(success, account) {
								$scope.curUser = account;
							});
							
							if (reload) {
								refreshPage();
							}
						}
					}
				}
			}
		}
		
		$scope.msOpts.setMarketplace = function() {
			var results = _.where($scope.resultList, {selected: true});
			var isIneligible = false;
			
			_.each(results, function(disc) {
				if (typeof(disc['imageList.0._id']) === 'undefined' || !disc.visible) {
					disc.ineligible = true;
					isIneligible = true;
				}
			});
			
			if (results.length) {
				$scope.globalModalOpts = {
					type: 'dz-marketplace-modal',
					show: true,
					data: {
						isIneligible: isIneligible,
						marketData: $scope.marketData,
						discs: results,
						onClose: function(reload) {
							if (reload) {
								refreshPage();
							}
						}
					}
				}
			}
		}
		
		$scope.msOpts.bumpDiscs = function() {
			var results = _.where($scope.resultList, {selected: true});
			
			if (results.length) {
				$scope.globalModalOpts = {
					type: 'dz-bump-modal',
					show: true,
					data: {
						discs: results,
						onClose: function(reload) {
							if (reload) {
								refreshPage();
							}
						}
					}
				}
			}
		}
		
		$scope.msOpts.manageTags = function() {
			var results = _.where($scope.resultList, {selected: true});
			
			if (results.length) {
				$scope.globalModalOpts = {
					type: 'dz-tag-modal',
					show: true,
					data: {
						discs: results,
						user: $scope.trunk.user._id,
						onClose: function(reload) {
							if (reload) {
								refreshPage();
							}
						}
					}
				}
			}
		}
		
		$scope.msOpts.deleteDiscs = function() {
			var results = _.where($scope.resultList, {selected: true});
			
			if (results.length) {
				$scope.globalModalOpts = {
					type: 'dz-delete-disc-modal',
					show: true,
					data: {
						discs: results,
						onClose: function(reload) {
							if (reload) {
								refreshPage();
							} 
						}
					}
				}
			}
		}
        
        $scope.msOpts.toggleMS = function() {
            $scope.msOpts.active = !$scope.msOpts.active;
            
            if (!$scope.msOpts.active) {
                $scope.msOpts.deselectAll();
            }
        }
        
        $scope.msOpts.toggleSelected = function(disc) {
            disc.selected = !disc.selected;
            
            if (disc.selected) {
                $scope.msOpts.count += 1;
            } else {
                $scope.msOpts.count -= 1;
            }
        }
		
		var rangeToString = function(str) {
			var elems = str.match(/\[(\d+)\s?TO\s?(\d+|\*)\]/);
			if (elems.length != 3) {
				return str;
			}
			
			return '$' + elems[1] + (elems[2] === '*' ? '+' : ' - $' + elems[2]);
		}
		
		var updateBreadcrumbs = function() {
			$scope.breadcrumbs = [];
			if ($scope.searchParam.length) {
				$scope.breadcrumbs.push({
					title: 'Searching',
					links: [
						{text: '"' + $scope.searchParam + '"'}
					]
				});
			}
			
			$scope.breadcrumbs.push({
				title: 'Showing',
				links: [
					{text: $scope.marketplace.forSale ? ($scope.marketplace.forTrade ? 'For Sale and Trade' : 'For Sale') : ($scope.marketplace.forTrade ? 'For Trade' : 'All Discs')}
				]
			});
			
			if (typeof($scope.view.visible) !== 'undefined') {
				$scope.breadcrumbs.push({
					title: 'Displaying',
					links: [
						{text: ($scope.view.visible ? 'Public Only' : 'Private Only')}
					]
				});
			}
			
			var filters = [];
			_.each($scope.activeFilters, function(filter) {
				var item = { title: filter.text, links: []};
				var tempFilter = {name: filter.name, fields: []};
				filters.push(tempFilter);
				
				_.each(filter.fields, function(field) {
					var text = field;
					
					if (/\[\d+\s?TO\s?(?:\d+|\*)\]/.test(field)) {
						text = rangeToString(field);
					}
					
					tempFilter.fields.push(field);
					item.links.push({
						text: text,
						href: $location.path() + QueryService.getQueryString({
							query: $scope.searchParam,
							sort: sortSet ? $scope.sortParam : undefined,
							filter: filters,
							marketplace: $scope.marketplace,
							visible: $scope.view.visible
						})
					});
				});
				
				$scope.breadcrumbs.push(item);
			});
		}
        
        $scope.loadMore = function(loadTo, callback) {
            if ($scope.loading || init || loadMoreActive) return;
			
			loadMoreActive = true;
            
            if ($scope.resultList.length < $scope.pagination.total) {
				var nextStart = $scope.resultList.length;
				if (loadTo) {
					reqSize = Math.min($scope.pagination.total, loadTo) - nextStart;
				}
				
                $scope.pagination.start = nextStart;
                $scope.performSearch(true, callback);
            } else {
				loadMoreActive = false;
				if (callback) callback();
			}
        }
		
		$scope.getVisibleTitle = function() {
			if (typeof($scope.view.visible) === 'undefined') {
				return 'Displaying All';
			} else if ($scope.view.visible) {
				return 'Displaying Public';
			} else {
				return 'Displaying Private';
			}
		}
		
		$scope.toggleVisibillty = function() {
			if (typeof($scope.view.visible) === 'undefined') {
				$scope.view.visible = true;
			} else if ($scope.view.visible) {
				$scope.view.visible = false;
			} else {
				$scope.view.visible = undefined;
			}
			
			$scope.updateUrl();
		}
		
		$scope.startSearch = function() {
			$scope.activeFilters = [];
			$scope.sortParam = undefined;
			$scope.updateUrl();
		}
        
        $scope.updateUrl = function() {
            $scope.pagination.start = 0;
            $location.url($location.path() + QueryService.getQueryString({
				query: $scope.searchParam,
				sort: sortSet ? $scope.sortParam : undefined,
				filter: $scope.activeFilters,
				marketplace: $scope.marketplace,
				visible: $scope.view.visible
			}));
        }
        
        $scope.marketMode = function() {
			return $scope.marketplace.forSale || $scope.marketplace.forTrade;
        }
        
        var processRngFilters = function(rangeFilters) {
            for (var facetName in rangeFilters) {
                var facet = rangeFilters[facetName];
                facet.open = true;
                for (var i = 0; i < facet.filters.length; i++) {
                    if (i == facet.filters.length - 1) {
                        facet.filters[i].text = '$' + facet.filters[i].val + '+';
                        facet.filters[i].val =  '[' + facet.filters[i].val + ' TO *]';
                    } else {
                        facet.filters[i].text = '$' + facet.filters[i].val + ' - ' + '$' + facet.filters[i+1].val;
                        facet.filters[i].val =  '[' + facet.filters[i].val + ' TO ' + facet.filters[i+1].val + ']';
                    }
                }
                
                var activeFacetFilters = _.findWhere($scope.activeFilters, {name: facetName});
                if (activeFacetFilters) {
                    for (var i = 0; i < activeFacetFilters.fields.length; i++) {
                        if (QueryService.isCustomRange(activeFacetFilters.fields[i])) {
                            var boundSearch = activeFacetFilters.fields[i].match(/^\[(\d+) TO (\d+)\]$/);
                            if (boundSearch.length > 2) {
                                facet.custom = {
                                    enable: true,
                                    lBound: parseInt(boundSearch[1]),
                                    uBound: parseInt(boundSearch[2])
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }
		
		function processFacets(facet) {
			for (var i = 0; i < facet.filters.length; i++) {
				var filter = facet.filters[i];
				if (!filter.count && !$scope.isFilterActive(facet, filter)) {
					facet.filters.splice(i, 1);
					i--;
				}
			}
		}
        
        $scope.performSearch = function(appendOnly, callback) {
            if (appendOnly) {
                $scope.loadingMore = true;
            } else {
                $scope.loading = true;
				$scope.pagination.start = 0;
            }
			var override = typeof(cacheSettings) !== 'undefined' && !cacheSettings.loaded;
            
            QueryService.queryAll({
                query: $scope.searchParam,
                sort: $scope.sortParam,
                filter: $scope.activeFilters,
                start: override ? 0 : $scope.pagination.start,
                valueRange: true,
                limit: override ? Math.max(cacheSettings.loadCount, reqSize) : reqSize,
				marketplace: $scope.marketplace,
                userId: $scope.trunk.userId || undefined,
				visible: $scope.view.visible
            }, function(success, response) {
                    if (success) {
						if (override) cacheSettings.loaded = true;
                        $scope.pagination.start = response.start;
                        $scope.pagination.total = response.total;
                        
                        if (appendOnly) {
                            Array.prototype.push.apply($scope.resultList, response.results);
                        } else {
                            $scope.resultList = response.results;
                            
                            processRngFilters(response.facets.rangeFilters);
                            
                            var i = 0;
                            for (var facetType in response.facets) {
                                var facetTypeList = response.facets[facetType];
                                
                                for (var facetName in facetTypeList) {
                                    var facet = facetTypeList[facetName];
									processFacets(facet);
                                    
                                    if (facet.filters.length) {
                                        if (i < 4) facet.open = true;
                                        
                                        var limit = 5;
                                        var prop = _.find($scope.activeFilters, {name: facetName});
                                        if (prop) {
                                            _.each(prop.fields, function(field) {
                                                limit = Math.max(limit, _.findIndex(facet.filters, function(filter) { return filter.val == field }) + 1);
                                            });
                                        }
                                        facet.limit = limit;
                                        i++;
                                    }
                                }
                            }
                            
                            $scope.resultFilters = response.facets;
                        }
                        $scope.getUsers();
                    }
					if (callback) callback();
                    $scope.loading = false;
                    $scope.loadingMore = false;
					loadMoreActive = false;
                });
        }
        
        $scope.resultOrder = function(filter) {
           return -1 * (filter.count + (filter.active ? 0.5 : 0));
        };
        
        $scope.getUsers = function() {
            var results = _.groupBy($scope.resultList, 'userId');
            
            for (var userId in results) {
                CacheService.getUser(userId, function(success, user) {
                    if (success) {
                        _.each(results[user._id], function(disc) {
                            disc.user = user;
                        });
                    }
                });
            }
        }
		
		$scope.onLastDisc = function() {
			$scope.resizeRes(function() {
				if (typeof(cacheSettings) !== 'undefined' && !cacheSettings.scrolled) {
					window.scrollTo(0, cacheSettings.scrollPos);
					cacheSettings.scrolled = true;
				}
				
            	var resList = document.getElementById('results-list');
				if (PageUtils.getWindowHeight() > PageUtils.getFullHeight(resList) && $scope.pagination.total > $scope.resultList.length) {
					$scope.loadMore();
				}
			});
		}
        
        $scope.resizeRes = function(callback){
            var resCont = document.getElementById('results-container');
            var resList = document.getElementById('results-list');
						var resHeaderStatic = document.getElementById('result-header-static');
						var resHeaderFluid = document.getElementById('result-header-fluid');
			
            $timeout(function() {
            	angular.element(resList).css('width', Math.floor(resCont.clientWidth / 207) * 207 + 'px');
							angular.element(resHeaderFluid).css('padding-right', resHeaderStatic.clientWidth + 10 + 'px');
							if (typeof(callback) === 'function') return callback();
            });
        }
        
        $scope.isFilterActive = function(facet, filter) {
            var prop = _.find($scope.activeFilters, {name: facet.prop});
            filter.active = prop && $scope.containsStr(prop.fields, filter.val);
            return filter.active;
        }
		
		$scope.isMarketplaceModeActive = function(prop) {
			return $scope.marketplace[prop];
		}
        
        $scope.hasActiveFilters = function(facet) {
            var prop = _.find($scope.activeFilters, {name: facet.prop});
            
            return prop && prop.fields.length;
        }
		
		$scope.clearAllFilters = function() {
			$scope.activeFilters = [];
            $scope.updateUrl();
		}
        
        $scope.clearActiveFilters = function(facet, silent) {
            $scope.activeFilters = _.filter($scope.activeFilters, function(filter) { return filter.name != facet.prop });
            if (!silent) $scope.updateUrl();
        }
        
        $scope.getFacets = function() {
            QueryService.queryFacet({
                query: $scope.searchParam,
                sort: $scope.sortParam,
                filter: $scope.activeFilters,
                userId: $scope.trunk.userId || undefined,
				marketplace: $scope.marketplace,
				visible: $scope.view.visible,
				facet: {
					name: 'tag',
                    limit: 2,
                    offset: 2
				}}, function(success, response) {
                    if (success) {
                        //console.log(response);
                    }
                });
        }
        
        $scope.updateSort = function() {
            sortSet = true;
            $scope.updateUrl();
        }
        
        $scope.$watch('fullscreen', function(newVal) {
            $timeout(function() {
                $scope.resizeRes();
            });
        });
		
		$scope.$on('$locationChangeStart', function() {
			PageCache.setData({
				loadCount: $scope.resultList.length,
				routeTime: new Date(),
				scrollPos: PageUtils.getScrollPos()
			});
		});
        
		$scope.handleUrl = function() {
			var ret = QueryService.parseUrlQuery($location.search());
			var isMarket = false;

			$scope.activeFilters = ret.filters;
			$scope.searchParam = ret.search;
			if (ret.mode) {
				$scope.marketplace = {
					forSale: ret.mode == 'all-market' || ret.mode == 'sale',
					forTrade: ret.mode == 'all-market' || ret.mode == 'trade',
					all: ret.mode == 'all',
				}
			}

			isMarket = $scope.marketplace.forSale || $scope.marketplace.forTrade;

			if (ret.sort) {
				if (!(ret.sort == 'new' && !isMarket) &&
					!(ret.sort == 'modDate' && !$scope.isOwnedTrunk)) {
					$scope.sortParam = ret.sort;
				}
			} else if (ret.search.length) {
				$scope.sortParam = 'rel';
			} else if (isMarket) {
				$scope.sortParam = 'new';
			} else {
				$scope.sortParam = 'createDate';
			}

			if (typeof(ret.visible) !== 'undefined' && $scope.isOwnedTrunk) {
				$scope.view.visible = ret.visible;
			}

			updateBreadcrumbs();

			if ($scope.msOpts && $scope.msOpts.active) $scope.msOpts.toggleMS();

			if (!init) $scope.performSearch();
		}
		
		var startWatch = function() {
			$scope.$watch(function () { return $location.url(); }, function (url) {
				var url = $location.url();

				if (url && /^\/(t\/|explore)/.test(url)) {
					if (PageCache.isNavBack()) {
						var data = PageCache.getPageData();
						if (data) {
							cacheSettings = data;
						}
					}
					$scope.handleUrl();
				}
			});
		}
		
        $scope.toggleFilter = function(facet, filter) {
            var prop = _.find($scope.activeFilters, {name: facet.prop});
            
            if (prop) {
                if ($scope.containsStr(prop.fields, filter.val)) {
                    prop.fields = _.without(prop.fields, String(filter.val));
                } else {
                    prop.fields.push(filter.val);
                }
            } else {
                $scope.activeFilters.push({
                    name: facet.prop,
                    text: facet.text,
                    fields: [filter.val]
                });
            }
            
            $scope.activeFilters = _.filter($scope.activeFilters, function(item) { return item.fields.length > 0});
            $scope.updateUrl();
        }
		
		$scope.toggleMarketplaceMode = function(prop) {
			switch (prop) {
				case 'forSale':
					if ($scope.marketplace.forSale && !$scope.marketplace.forTrade) {
						$scope.marketplace.all = true;
					} else {
						$scope.marketplace.all = false;
					}
					break;
				case 'forTrade':
					if ($scope.marketplace.forTrade && !$scope.marketplace.forSale) {
						$scope.marketplace.all = true;
					} else {
						$scope.marketplace.all = false;
					}
					break;
				case 'all':
					if (!$scope.marketplace.all) {
						$scope.marketplace.forTrade = false;
						$scope.marketplace.forSale = false;
					} else return;
					break;
			}
			
			$scope.marketplace[prop] = !$scope.marketplace[prop];
			$scope.updateUrl();
		}
			
        angular.element($window).bind('resize', $scope.resizeRes);
		
		$scope.$on('$destroy', function() {
            angular.element($window).unbind('resize', $scope.resizeRes);
        });
        
        if ($routeParams.username) {
            CacheService.getUserByUsername($routeParams.username, function(success, user) {
                if (!success) {
                    return RedirectService.setRedirect('explore');
                }
                $scope.trunk.userId = user._id;
                $scope.trunk.user = user;
								$scope.statusHome = 't/' + user.username;
								$scope.resizeRes();
				if ($scope.isOwnedTrunk) {
					AccountService.getAccountMarket(function(success, data) {
						if (!success) {
							return RedirectService.setRedirect('explore');
						}
						$scope.marketData = data;
						$scope.marketData.accountName = MembershipService.getAccountName($scope.curUser.accountType);
					});
				}			
    		init = false;
				startWatch();
            });
        } else {
            init = false;
			$scope.statusHome = 'explore';
				startWatch();
        }
			
			$scope.resizeRes();
    }
])

/******************************************************************************
* Name:         RedirectController
* Description:  Controller for redirect page functionality. 
*******************************************************************************/
.controller('RedirectController', ['$scope', '$timeout', 'RedirectService', '$location',
    function($scope, $timeout, RedirectService, $location) {
        $timeout(function() {
            $location.path('/' + RedirectService.getRedirectPath()).replace();
        }, 1000);
    }
])

/******************************************************************************
* Name:         DiscController
* Description:  Controller for disc page functionality. 
*******************************************************************************/
.controller('DiscController', ['$scope', '$location', '$routeParams', '$timeout', '$window', '_', 
							   'RedirectService', 'CacheService', 'AccountService', 'DiscService', 'MessageService',
    function($scope, $location, $routeParams, $timeout, $window, _, RedirectService, CacheService, AccountService, DiscService, MessageService) {
    var discId = $routeParams.discId;
		
		$location.search({}); // clear search params
        $scope.breadcrumbs = [];
        
		$scope.bumpReady = false;
		$scope.isSaving = false;
        $scope.loading = {
			disc: true,
			privacy: false
		};
		$scope.tempMarketplace = {};
		$scope.discAlert = {};
		$scope.marketAlert = {};
		
		var initUser = function() {
			$scope.breadcrumbs = [
				{title: 'Trunk', links: [{text: $scope.user.username, href:'/t/' + $scope.user.username}]},
				{title: 'Disc', links: [{text: $scope.disc.brand + ' ' + $scope.disc.name}]},
			];
			$scope.userInit = true;
		}
		
		var refreshMarket = function() {
			AccountService.getAccountMarket(function(success, data) {
				if (success) {
					$scope.tempMarketplace.counts = data;
				} else {
					$scope.marketAlert.error = {
						title: data.type,
						message: data.message,
						show: true
					}
				}
			});
		}
		
		var updateTempMarket = function(disc) {
			$scope.tempMarketplace.forSale = disc.marketplace.forSale;
			$scope.tempMarketplace.forTrade = disc.marketplace.forTrade;
			refreshMarket();
		}
		
		$scope.isDef = function(x) {
			return typeof(x) !== 'undefined';
		}
		
		$scope.showProfileModal = function() {
			$scope.globalModalOpts = {
				type: 'dz-profile-modal',
				show: true,
				data: {
					
				}
			}
		}
		
		$scope.shareDisc = function() {
			$scope.globalModalOpts = {
				type: 'dz-share-modal',
				show: true,
				data: {
					disc: $scope.disc
				}
			}
		}
		
		$scope.deleteDisc = function() {
			var discArr = [
				$scope.disc
			];
			
			$scope.globalModalOpts = {
				type: 'dz-delete-disc-modal',
				show: true,
				data: {
					discs: discArr,
					onClose: function(redirect) {
						if (redirect) $location.url('/t/' + $scope.user.username);
					}
				}
			}
		}
		
		$scope.bumpDisc = function() {
			DiscService.bumpDisc($scope.disc._id, function(success, data) {
				if (success) {
					$scope.disc.marketplace.bumpRemaining = data.bumpRemaining;
					$scope.bumpReady = false;
				} else {
					$scope.marketAlert.error = {
						title: data.type,
						message: data.message,
						show: true
					}
				}
			});
		}
		
		$scope.saveDisc = function() {
			$scope.isSaving = true;
			
			var tempDisc = {
				_id: $scope.disc._id,
				marketplace: {
					forSale: $scope.tempMarketplace.forSale,
					forTrade: $scope.tempMarketplace.forTrade
				}
			};
			
			DiscService.editDisc(tempDisc, function(success, disc) {
				if (success) {
					$scope.disc = disc;
					$scope.bumpReady = disc.marketplace.bumpRemaining === 0;
					updateTempMarket(disc);
					$scope.marketAlert.success = {
						title: 'Success',
						message: 'Marketplace options have been updated successfully.',
						show: true,
						timeout: 3000
					}
				} else {
					$scope.marketAlert.error = {
						title: 'Error',
						message: 'Unable to update marketplace options.',
						show: true
					}
				}
				$scope.isSaving = false;
			});
		}
		
		$scope.warnPrivacy = function() {
			if ($scope.isMarket()) {
				$scope.globalModalOpts = {
					type: 'dz-acknowledgement-modal',
					show: true,
					data: {
						message1: 'This disc is currently on the marketplace, and making it private will automatically remove it from the marketplace. Do you wish to proceed?',
						onClose: function(confirmed) {
							if (confirmed) $scope.togglePrivacy();
						}
					}
				}
			} else {
				$scope.togglePrivacy();
			}
		}
		
		$scope.togglePrivacy = function() {
			$scope.loading.privacy = true;
			
			var tempDisc = {
				_id: $scope.disc._id,
				visible: !$scope.disc.visible
			};
			
			DiscService.editDisc(tempDisc, function(success, disc) {
				$timeout(function() {
					if (success) {
						$scope.disc = disc;
						updateTempMarket(disc);
					} else {
						$scope.discAlert.error = {
							title: 'Error',
							message: 'Unable to update disc visibility.',
							show: true
						}
					}
					$scope.loading.privacy = false;
				});
			});
		}
		
		$scope.initMessage = function() {
			MessageService.setAttachment(MessageService.TypeDisc, $scope.disc._id);
			$location.path('/inbox').search('userId', $scope.user._id);
		}
		
		$scope.setImage = function(img) {
				$scope.imageBlock = img;
		}
		
		$scope.isMarket = function() {
			if (typeof($scope.disc) !== 'undefined') {
				return $scope.disc.marketplace.forSale || $scope.disc.marketplace.forTrade;
			}
		}
		
		$scope.isMarketInvalid = function() {
			return !$scope.disc || !$scope.tempMarketplace.counts || (!$scope.isMarket() && $scope.tempMarketplace.counts.marketAvailable === 0) || !$scope.disc.visible || !$scope.disc.primaryImage;
		}
		
		$scope.isDirty = function() {
			return $scope.tempMarketplace.forSale != $scope.disc.marketplace.forSale ||
					$scope.tempMarketplace.forTrade != $scope.disc.marketplace.forTrade;
		}
		
		$scope.givePermission = function() {
				return AccountService.compareTo($scope.disc.userId);
		}
		
		CacheService.reloadDisc(discId, function(success, disc) {
            if (!success) {
                return RedirectService.setRedirect('explore');
            } else {
							$scope.disc = disc;
							$scope.imageBlock = _.findWhere(disc.imageList, {_id: disc.primaryImage});
							$scope.discInit = true;

							if ($scope.givePermission()) {
								$scope.user = AccountService.getAccount();
								$scope.isOwner = true;
								updateTempMarket(disc);
								initUser();
							} else {
								CacheService.getUser(disc.userId, function(success, user) {
									if (!success) {
										return $scope.nav();
									}
									$scope.user = user;
									$scope.publicMode = true;
									initUser();
								});
							}
            }
            $scope.loading.disc = false;
        });
    }
])

/******************************************************************************
* Name:         DiscTemplateController
* Description:  Controller for disc template search
*******************************************************************************/
.controller('DiscTemplateController', ['$scope', '$window', '$location', '$routeParams', '$timeout', '_', 'AccountService', 'APIService', 
    function($scope, $window, $location, $routeParams, $timeout, _, AccountService, APIService) {
        
		if (!AccountService.isLoggedIn()) {
			var curPath = $location.path();
			return $location.path('/login').search('redirect', curPath);
		}
		
		$location.search({}); // clear search params
        $scope.templates = [];
        $scope.loading = false;
        
        $scope.$watch('query', function(q) {
            if (typeof(q) === 'undefined' || q == '') {
                return $scope.templates = [];
            }
            
            $scope.loading = true;
            
            APIService.Get('/templates?q=' + q, function(success, templates) {
                var procGroups = [];
                
                if (success) {
                    var templateGroups = _.groupBy(templates, 'textSearch');
                    for (var key in templateGroups) {
                        procGroups.push({fullName: key, name: templateGroups[key][0].name, brand: templateGroups[key][0].brand, templates: templateGroups[key]});
                    }
                }
                
                $scope.templates = _.sortBy(procGroups, 'fullName');
                $scope.loading = false;
            });
        });
        
        $scope.showVowel = function() {
            return $scope.query && /[aeiou]/i.test($scope.query.charAt(0));
        }
        
        $scope.resizeRes = function(){
            var resCont = document.getElementById('results-container');
            var resList = document.getElementById('results-list');
            $timeout(function() {
            	angular.element(resList).css('width', Math.floor(resCont.clientWidth / 208) * 208 + 'px');
            });
        }
        
        angular.element($window).bind('resize', $scope.resizeRes);
        
        $scope.$on('$destroy', function() {
            angular.element($window).unbind('resize', $scope.resizeRes);
        });
        
        $scope.resizeRes();
    }
])


/******************************************************************************
* Name:         ModifyDiscController
* Description:  Controller for disc page functionality. 
*******************************************************************************/
.controller('ModifyDiscController', ['$compile', '$scope', '$routeParams', '$location', '$timeout', '_', 'smoothScroll', '$ocLazyLoad', 'APIService', 'CacheService', 'ImageService', 'AccountService', 'DiscService', 'RedirectService', 
    function($compile, $scope, $routeParams, $location, $timeout, _, smoothScroll, $ocLazyLoad, APIService, CacheService, ImageService, AccountService, DiscService, RedirectService) {
		if (!AccountService.isLoggedIn()) {
			var curPath = $location.path();
			return $location.path('/login').search('redirect', curPath);
		}
        
        var discId = $routeParams.discId;
        var templateId = $routeParams.templateId;
        var pageTop = document.getElementById('page-top');
		var dropzoneTemplate = '<div class="image-item-container image-template">' +
                    '<div class="image-item">' +
                        '<div class="image-entity">' +
                            '<img data-dz-thumbnail />' +
                        '</div>' +
                        '<div class="image-progress" data-dz-uploadprogress></div>' +
                        '<div class="image-overlay">' +
                            '<span class="image-remove" data-dz-remove><i class="fa fa-times fa-lg"></i></span>' +
                            '<div class="image-title handle-overflow"><span data-dz-name></span></div>' +
                            '<div class="image-size handle-overflow" data-dz-size></div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
		var queuedImages = [];
		
		$scope.editAlert = {};
		$scope.account = AccountService.getAccount();
		
		$scope.showGeneralHelp = function() {
			$scope.globalModalOpts = {
				type: 'dz-info-modal',
				show: true,
				data: {
					title: 'Modify Disc Help - General'
				},
				partial: 'dzGeneralInfo.html'
			}
		}
		
		$scope.showAdvancedHelp = function() {
			$scope.globalModalOpts = {
				type: 'dz-info-modal',
				show: true,
				data: {
					title: 'Modify Disc Help - Advanced'
				},
				partial: 'dzAdvancedInfo.html'
			}
		}
		
		$scope.clearForm = function(skipAlert) {
			$scope.disc = {_id: $scope.disc._id, visible: true, tagList: [], imageList: []};
			$scope.discForm.$setPristine();
			if (!skipAlert) $scope.editAlert = {};
		}
		
        $scope.currentTagDrag = {
            accept: function (sourceItemHandleScope, destSortableScope) {
                return sourceItemHandleScope.itemScope.sortableScope.$id === destSortableScope.$id;
            }
        }
        $scope.currentImageDrag = {
            accept: function (sourceItemHandleScope, destSortableScope) {
                return sourceItemHandleScope.itemScope.sortableScope.$id === destSortableScope.$id;
            }
        }
        $scope.disc = {_id: discId, visible: true, tagList: [], imageList: []};
        $scope.settings = {discReady: false,dropzoneReady: false,dropzoneProcessing: false}
		
		var processImg = function(file) {
			ImageService.getDataUri(file, function(dataUri) {
				$scope.discImageCropper.showCropper(file.name, dataUri);
			});
		}
		
		var handleQueue = function(file) {
			if (!file) {
				if (queuedImages.length) processImg(queuedImages[0]);
				return;
			}
			
			queuedImages.push(file);
			
			if (queuedImages.length == 1) {
				processImg(file);
			}
		}
		
        $scope.dropzoneConfig = {
            options: {
                url: '/api/images',
                method: "POST",
                thumbnailWidth: 100,
                thumbnailHeight: 100,
                parallelUploads: 5,
                maxFiles: 5,
                paramName: 'discImage',
                previewTemplate: dropzoneTemplate,
                acceptedFiles: "image/*",
                autoProcessQueue: true,
                previewsContainer: '#dropzone-previews',
                clickable: '#add-image',
                accept: function(file, done) {
                    if (this.files[5] != null) {
                        return this.removeFile(this.files[5]);
                    }
                    
                    if (file.cropped || file.width < 200) {
                        $timeout(function() {
                            $scope.discImageCropper.cropperLoading = false;
                            $scope.settings.dropzoneProcessing = true;
                            file.previewElement.setAttribute('dropzone-preview', '');
                            $compile(angular.element(file.previewElement))($scope);
                        });
                        return done();
                    }
                    
                    $timeout(function() {
                        $scope.discImageCropper.cropperLoading = true;
                    });
                    $scope.dropzoneConfig.getDropzone().removeFile(file);
					handleQueue(file);
                    return done('Processing');
                },
                success: function(file, response) {
                    if (typeof response._id !== 'undefined') {
                        $scope.disc.imageList.push(response);
                        
                        if ($scope.disc.imageList.length == 1) {
                            $scope.disc.primaryImage = response._id;
                        }
                        $scope.safeApply();
                    }
                    this.removeFile(file);
                },
                queuecomplete: function() {
                    $timeout(function() {
                        $scope.settings.dropzoneProcessing = false;
                    });
                }
            }
        };
        
        $scope.discImageCropper = {
            onFinish: function(file) {
                $scope.safeApply(function() {
                    $scope.discImageCropper.cropperLoading = false;
                });
                if (file) {
                    $scope.dropzoneConfig.getDropzone().addFile(file);
                }
				queuedImages.shift();
				handleQueue();
            },
            cropperLoading: false
        }
        
        $scope.triggerDropzone = function() {
             $scope.dropzoneConfig.getDropzone().progTrigger();
        }
        
        $scope.removeImage = function(index) {
            var image = $scope.disc.imageList.splice(index,1)[0];
            
            if (image._id == $scope.disc.primaryImage) {
                $scope.disc.primaryImage = $scope.disc.imageList.length ? $scope.disc.imageList[0]._id : undefined;
            }
        }
        
        $scope.removeTag = function(index) {
            $scope.disc.tagList.splice(index,1)[0];
        }
        
        $scope.pushTempTag = function() {
            if ($scope.tempTag && $scope.tempTag.length && !_.contains($scope.disc.tagList, $scope.tempTag)) {
                $scope.disc.tagList.push($scope.tempTag);
                $scope.tempTag = '';
            } else {
				$scope.tempTag = '';
			}
        }
        
        var scrollTop = function() {
            var options = {
                duration: 300,
                easing: 'easeInQuad'
            }
            
            smoothScroll(pageTop, options);
        }
		
		$scope.refreshMarket = function() {
			$scope.marketLoading = true;
			AccountService.getAccountMarket(function(success, data) {
				if (success) {
					$scope.market = data;
				} else {
					$scope.editAlert.error = {
						title: data.type,
						message: data.message,
						show: true
					}
				}
				$scope.marketLoading = false;
			});
		}
        
        $scope.submitDisc = function() {
			if ($scope.discForm.$invalid) {
				for (var inError in $scope.discForm.$error) {
					angular.forEach($scope.discForm.$error[inError], function(field) {
							field.$setDirty();
					});
				}
				$scope.editAlert.error = {
						title: 'Invalid Input',
						message: 'Please correct any invalid fields and try again.',
						show: true
				}
				scrollTop();
				return;
			}
			
			if ((!$scope.disc.visible || $scope.disc.imageList.length === 0) && $scope.disc.marketplace && ($scope.disc.marketplace.forSale || $scope.disc.marketplace.forTrade)) {
				$scope.marketError = true;
				return;
			}
			
			$scope.marketError = false;
			
            if ($scope.disc._id) {
				DiscService.editDisc($scope.disc, function(success, disc) {
                    if (success) {
                        $scope.disc = disc;
						$scope.breadcrumbs.splice(1, 1, {title: 'Disc', links: [{text: disc.brand + ' ' +  disc.name + ' ' + '(#' + discId + ')', href: '/d/' + discId}]});
                        $scope.editAlert.success = {
                            title: 'Success',
                            message: {
								smartConfig: {
									text: '<!' + disc.brand + ' ' + disc.name + '> has been updated successfully.',
									links: ['/d/' + disc._id]
								}
							},
                            show: true
                        }
                        scrollTop();
						$scope.discForm.$setPristine();
						$scope.refreshMarket();
                    } else {
                        $scope.editAlert.error = {
                            title: 'Error',
                            message: 'Unable to update disc. ' + disc.type + ': ' + disc.message,
                            show: true
                        }
                        scrollTop();
                    }
                });
            } else {
				DiscService.createDisc($scope.disc, function(success, disc) {
                    if (success) {
                        $scope.editAlert.success = {
                            title: 'Success',
                            message: {
								smartConfig: {
									text: '<!' + disc.brand + ' ' + disc.name + '> has been created successfully.',
									links: ['/d/' + disc._id]
								}
							},
                            show: true
                        }
                        scrollTop();
						$scope.clearForm(true);
						$scope.refreshMarket();
                    } else {
                        $scope.editAlert.error = {
                            title: disc.type,
                            message: disc.message,
                            show: true
                        }
                        scrollTop();
                    }
                });
                
            }
        }
        
        if (typeof Dropzone === 'undefined' || typeof EXIF === 'undefined' || 
            typeof Cropper === 'undefined') {
            $ocLazyLoad.load(
                ['https://cdn.rawgit.com/exif-js/exif-js/master/exif.js',
                '/static/src/js-dist/dropzone.min.js'
                ]).then(function() {
                    $ocLazyLoad.load([
                        '/static/src/js-dist/cropper.min.js',
                        {type: 'css', path: 'https://cdn.rawgit.com/fengyuanchen/cropperjs/master/dist/cropper.min.css'}
                    ]).then(function() {
                            $scope.settings.dropzoneReady = true;
                        });
                });
        } else {
            $scope.settings.dropzoneReady = true;
        }
		
		$scope.breadcrumbs = [
			{title: 'Trunk', links: [{text: $scope.account.username, href:'/t/' + $scope.account.username}]}
		];
        
        if (typeof(discId) !== 'undefined') { // Edit Mode
            CacheService.getDisc(discId, function(success, disc) {
                if (!success) {
                    return RedirectService.setRedirect('explore');
                } else {
					if (!AccountService.compareTo(disc.userId)) {
                        return RedirectService.setRedirect('explore');
                    }
                    $scope.disc = disc;
					$scope.isMarket = disc.marketplace.forSale || disc.marketplace.forTrade;
					
					$scope.breadcrumbs.push({title: 'Disc', links: [{text: disc.brand + ' ' +  disc.name + ' ' + '(#' + discId + ')', href: '/d/' + discId}]});
					$scope.breadcrumbs.push({links: [{text:'Edit Disc'}]});
                    
                    $scope.settings.discReady = true;
                }
            });
        } else { // Create Mode
			$scope.breadcrumbs.push({links: [{text:'Create Disc'}]});
            if (typeof(templateId) !== 'undefined') {
                APIService.Get('/templates/' + templateId, function(success, template) {
                    if (success) {
                        $scope.disc = {
                            brand: template.brand,
                            name: template.name,
                            type: template.type,
                            material: template.material,
                            speed: template.speed,
                            glide: template.glide,
                            turn: template.turn,
                            fade: template.fade,
                            visible: true, 
                            tagList: [], 
                            imageList: []
                        }
                        
                        $scope.editAlert.info = {
                            title: 'Template Applied',
                            message: 'The selected template was applied to the form.',
                            show: true
                        }
                    }
                    
                    $scope.settings.discReady = true;
                });
            } else {
                $scope.settings.discReady = true;
            }
        }
		
		$scope.refreshMarket();
    }
])

/******************************************************************************
* Name:         NewsfeedController
* Description:  Controller for newsfeed functionality. 
*******************************************************************************/
.controller('NewsfeedController', ['$scope', '$location', 'DataService',
    function($scope, $location, DataService) {
        
    }
])

/******************************************************************************
* Name:         DashboardController
* Description:  Handles obtaining and organizing a disc list for a user. 
*******************************************************************************/
.controller('DashboardController', ['$scope', '$location', 'DataService',
    function($scope, $location, DataService) {
        
    }
])

/******************************************************************************
* Name:         MessageController
* Description:  Handles sending, receiving, and organizing messages. 
*******************************************************************************/
.controller('MessageController', ['$scope', '$location', '$timeout', '$q', '_', 'smoothScroll', 'APIService', 'AccountService', 
								  'SocketUtils', 'PageUtils', 'CacheService', 'Random', 'MessageService', 'PropService', 
    function($scope, $location, $timeout, $q, _, smoothScroll, APIService, AccountService, SocketUtils, PageUtils, CacheService, Random, MessageService, PropService) {
			if (!AccountService.isLoggedIn()) {
				var curPath = $location.path();
				return $location.path('/login').search('redirect', curPath);
			}
			
			var messageTextArea = angular.element(document.getElementById('message-text-area'));
			var messageList = document.getElementById('message-list');
			var activeThreadId;
			$scope.page = {
				threadLimit: 10,
				aThreadLimit : 10
			};
			$scope.init = false;
			$scope.account = AccountService.getAccount();
			$scope.messageThreads = [];
			$scope.archivedThreads = [];
			$scope.activeThread = undefined;
			$scope.sendOnEnter = true;
			$scope.messageAlert = {};
			$scope.breadcrumbs = [
				{links: [{text: 'My Account', href:'/account'}]},
				{links: [{text: 'Inbox'}]},
			];
			
			$scope.scrollBottom = function() {
				if ($scope.activeThread.state) {
					$timeout(function() {
						messageList.scrollTop = $scope.activeThread.state.scrollPos || messageList.scrollHeight;
						delete $scope.activeThread.state;
					});
					return;
				}
				
				var lastMessage = angular.element(messageList)[0].querySelector('.message-item:last-child');
				
				var options = {
						duration: 700,
						easing: 'easeInQuad',
    					containerId: 'message-list'
				}
				
				$timeout(function() {
					smoothScroll(lastMessage, options);
					messageTextArea[0].focus();
				});
			}
			
			var resizeInbox = function() {
				$timeout(function() {
					var inboxArea = document.getElementById('inbox-area');
					var footer = document.getElementById('footer-bar');
					var height = PageUtils.getWindowHeight();
					var rectTop = PageUtils.getTop(inboxArea);
					angular.element(inboxArea).css('height', (height - rectTop - 100) + 'px');
				});
			}
			
			var cloneThread = function(toThread, fromThread) {
				toThread.messageCount = fromThread.messageCount;
				toThread.currentMessageCount = fromThread.currentMessageCount;
				toThread.modifiedDate = fromThread.modifiedDate;
			}
			
			var updateThread = function(thread) {
				var userId = _.find(thread.users, function(user){ 
					return user != $scope.account._id;
				});
				CacheService.getUser(userId, function(success, user) {
					if (success) {
						thread.user = user;
						thread.userInit = true;
						if (user.image) {
							thread.image = user.image;
							thread.imgInit = true;
						}
					} else {
						// HANDLE ERROR
						thread.removed = true;
					}
				});
			}
			
			var reloadThread = function(threadId, setActive) {
				APIService.Get('/threads/' + threadId, function(success, rThread) {
					if (success) {
						
						if (rThread.active) {
							var index = _.findIndex($scope.messageThreads, function(thread) {return thread.threadId == rThread.threadId; });
							if (index > -1) {
								cloneThread($scope.messageThreads[index], rThread);
							} else {
								rThread.messages = [];
								$scope.messageThreads.push(rThread);
								updateThread(rThread);
							}
							
							index = _.findIndex($scope.archivedThreads, function(thread) {return thread.threadId == rThread.threadId; });
							if (index > -1) {
								if ($scope.activeThread == $scope.archivedThreads[index]) {
									$scope.archivedThreads.splice(index, 1);
								}
							}
						} else {
							var index = _.findIndex($scope.archivedThreads, function(thread) {return thread.threadId == rThread.threadId; });
							if (index > -1) {
								cloneThread($scope.archivedThreads[index], rThread);
							} else {
								rThread.messages = [];
								$scope.archivedThreads.push(rThread);
								updateThread(rThread);
							}
							
							index = _.findIndex($scope.messageThreads, function(thread) {return thread.threadId == rThread.threadId; });
							if (index > -1) {
								$scope.messageThreads.splice(index, 1);
							}
						}
						
						if (setActive) {
							$scope.activateThread(rThread);
						}
					} else {
						$scope.messageAlert.error = {
							title: rThread.type,
							message: 'Unable to reload message thread. ' + rThread.message,
							show: true
						}
					}
				});
			}
			
			var initThreads = function(threads) {
				_.each(threads, function(thread) {
					thread.messages = [];

					if (activeThreadId && thread.threadId == activeThreadId) {
						$scope.activeThread = thread;
						$scope.getMessages(true);
					}

					updateThread(thread);
				});
			}
			
			var setThreadRead = function(thread, callback) {
				if (thread.currentMessageCount == thread.messageCount)
					return;
				
				APIService.Put('/threads/' + thread.threadId, {messageCount: thread.currentMessageCount}, function(success, upThread) {
					if (success) {
						cloneThread(thread, upThread);
					} else {
						$scope.messageAlert.error = {
							title: thread.type,
							message: 'Unable to update message thread. ' + thread.message,
							show: true
						}
					}
					if (callback) callback();
				});
			}
			
			var initThread = function(thread) {
				return initThreads([thread]);
			}	 
			
			var handleIncMessage = function(message) {
				$timeout(function() {
					if ($scope.activeThread && $scope.activeThread.threadId == message.threadId && $scope.activeThread.active) {
						$scope.activeThread.messages.push(message);
						$scope.activeThread.currentMessageCount++;
						setThreadRead($scope.activeThread);
					} else {
						var thread = _.findWhere($scope.messageThreads, {threadId: message.threadId});
						if (typeof(thread) !== 'undefined') {
							if (thread.messages.length) {
								thread.messages.push(message);
							}
							
							thread.currentMessageCount++;
						} else {
							reloadThread(message.threadId);
						}
					}
				});
			}
			
			var buildMessageReq = function() {
				return '?count=' + PropService.get('MessageReqSize') + ($scope.activeThread.refId ? '&refId=' + $scope.activeThread.refId : '');
			}
			
			$scope.toggleSend = function() {
				$scope.sendOnEnter = !$scope.sendOnEnter;
			}
			
			$scope.unarchiveThread = function() {
				if ($scope.activeThread) {
					APIService.Put('/threads/' + $scope.activeThread.threadId, {active: true}, function(success, localThread) {
						if (success) {
							var index = _.findIndex($scope.archivedThreads, function(thread) {return thread._id == localThread._id; });
							if (index > -1) {
								$scope.archivedThreads.splice(index, 1);
								reloadThread(localThread.threadId, true);
							} else {
								$location.url($location.path());
							}
						} else {
							$scope.messageAlert.error = {
								title: localThread.type,
								message: 'Unable to unarchive message thread. ' + localThread.message,
								show: true
							}
						}
					});
				}
			}
			
			$scope.archiveThread = function() {
				if ($scope.activeThread) {
					APIService.Delete('/threads/' + $scope.activeThread.threadId, function(success, localThread) {
						if (success) {
							var index = _.findIndex($scope.messageThreads, function(thread) {return thread._id == localThread._id; });
							if (index > -1) {
								$scope.messageThreads.splice(index, 1);
								$location.url($location.path());
							}
						} else {
							$scope.messageAlert.error = {
								title: localThread.type,
								message: 'Unable to archive message thread. ' + localThread.message,
								show: true
							}
						}
					});
				}
			}
			
			$scope.getMessageImage = function(message) {
				if (message.userId == $scope.account._id) {
					return $scope.account.image;
				} else {
					return $scope.activeThread.image;
				}
			}
			
			$scope.getMessages = function(firstLoad) {
				$scope.messageAlert = {};
				if (typeof($scope.activeThread) !== 'undefined') {
					if ($scope.activeThread.newThread) {
						return;
					}
					
					if (firstLoad) {
						if ($scope.activeThread.messages.length) {
							if ($scope.activeThread.state) {
								messageList.scrollTop = $scope.activeThread.state.scrollPos || messageList.clientHeight;
							}
							setThreadRead($scope.activeThread, MessageService.reloadUnreadCount);
							return;
						}
						
						$scope.activeThread.refId = undefined;
					}
					
					APIService.Get('/threads/' + $scope.activeThread.threadId + '/messages' + buildMessageReq(), function(success, messages) {
						if (success) {
							$scope.activeThread.messages.push.apply($scope.activeThread.messages, messages);
							$scope.activeThread.refId = messages.length ? messages[messages.length - 1]._id : undefined;
							
							$scope.activeThread.messageCount = $scope.activeThread.currentMessageCount;
							MessageService.reloadUnreadCount();
							
							if (firstLoad) {
								if (!$scope.activeThread.active) {
									$scope.messageAlert.info = {
										title: 'Read-Only',
										message: 'Unarchive this conversation to continue sending messages.',
										show: true
									}
								} else if ($scope.activeThread.removed) {
									$scope.messageAlert.info = {
										title: 'User Account Removed',
										message: 'The user associated with this thread has deleted his/her account.',
										show: true
									}
								}
							}
						} else {
							$scope.messageAlert.error = {
								title: messages.type,
								message: 'Unable to get messages. ' + messages.message,
								show: true
							}
						}
					});
				} else {
					$location.url($location.path());
				}
			}
			
			var postThread = function(thread) {
				var deferred = $q.defer();
				
				if (thread.newThread) {
					var userId = _.find(thread.users, function(user){ 
						return user != $scope.account._id;
					});
					APIService.Post('/threads', {
						receivingUser: userId
					}, function(success, newThread) {
						if (success) {
							initThread(newThread);
							$scope.messageThreads.splice($scope.messageThreads.indexOf(thread), 1);
							$scope.messageThreads.push(newThread);
							deferred.resolve(newThread);
						} else {
							deferred.reject(thread);
						}
					});
				} else {
					deferred.resolve();
				}
				
				return deferred.promise;
			}
			
			$scope.sendMessage = function() {
				if ($scope.userMessage && $scope.userMessage.length) {
					$scope.lockout = true;
					postThread($scope.activeThread).then(function(newThread) {
						var thread = newThread ? newThread : $scope.activeThread;
						
						APIService.Post('/threads/' + thread.threadId + '/messages', {content: $scope.userMessage}, function(success, message) {
							if (success) {
								$scope.activeThread.messages.push(message);
								reloadThread(message.threadId, typeof(newThread) !== 'undefined');
								$scope.userMessage = '';
							} else {
								$scope.messageAlert.error = {
									title: message.type,
									message: 'Unable to send message. ' + message.message,
									show: true
								}
							}

							$scope.lockout = false;
						});
					}, function(err) {
						$scope.messageAlert.error = {
							title: err.type,
							message: 'Unable to create thread. ' + err.message,
							show: true
						}
						$scope.lockout = false;
					});
				}
			}
			
			$scope.activateThread = function(thread, replace) {
				if ($scope.activeThread) {
					$scope.activeThread.state = {
						scrollPos: messageList.scrollTop
					}
				}
				
				if (replace) {
					$location.url($location.path() + '?threadId=' + thread.threadId + (!thread.active ? '&archived=true' : '')).replace();
				} else {
					$location.url($location.path() + '?threadId=' + thread.threadId + (!thread.active ? '&archived=true' : ''));
				}
			}
			
			$scope.loadArchived = function() {
				APIService.Get('/threads?archived=true', function(success, threads) {
					if (success) {
						$scope.archivedThreads = threads;
						initThreads($scope.archivedThreads);
					} else {
						$scope.messageAlert.error = {
							title: threads.type,
							message: 'Unable to load archived message threads. ' + threads.message,
							show: true
						}
					}
				});
			}
			
			$scope.createThread = function(userId) {
				var thread = _.find($scope.messageThreads, function(thread) {
					return thread.users.indexOf(userId) > -1;
				});
				
				if (thread) {
					$scope.activateThread(thread, true);
				} else {
					CacheService.getUser(userId, function(success, user) {
						if (success) {
							var thread = {
								threadId: Random.random(9),
								users: [AccountService.getAccountId(), user._id],
								newThread: true,
								active: true,
								threadTag: user.username,
								modifiedDate: new Date().toISOString()
							};
							
							initThread(thread);
							$scope.messageThreads.push(thread);
							$scope.activateThread(thread, true);
						} else {
							$scope.messageAlert.error = {
								title: user.type,
								message: 'Unable to create thread. ' + user.message,
								show: true
							}
						}
					});
				}
			}
			
			var initInbox = function() {
				$scope.$watch(function () { return $location.url(); }, function (url) {
					if (url && /^\/inbox/.test(url)) {

						activeThreadId = undefined;
						$scope.activeThread = undefined;

						if ($location.search().threadId) {
							activeThreadId = $location.search().threadId;

							if ($location.search().archived) {
								if ($scope.archivedThreads.length == []) {
									$scope.loadArchived();
								} else {
									$scope.activeThread = _.findWhere($scope.archivedThreads, {threadId: activeThreadId});
									$scope.getMessages(true);
								}
								
								$scope.showArchive = true;
							} else {
								$scope.activeThread = _.findWhere($scope.messageThreads, {threadId: activeThreadId});
								
								if ($scope.activeThread) {
									var index = $scope.messageThreads.indexOf($scope.activeThread);
									$scope.page.threadLimit = Math.max($scope.page.threadLimit, index + 1);
									$scope.showArchive = false;
								}
								
								$scope.getMessages(true);
							}
							return;
						}

						if ($location.search().userId) { // Open/Init message
							var attachments = MessageService.getAttachments();
							
							$scope.createThread($location.search().userId);
							
							if (attachments.length) {
								$scope.userMessage = 'Hi! I am interested in the following disc' + (attachments.length > 1 ? '(s):' : ':');
								attachments.forEach(function(attachment) {
									$scope.userMessage += '\r\n' + $location.host() + '/' + attachment.type + '/' + attachment.id;
								});
							}
						}
					}
				});
			}
			
			$scope.incThreadLimit = function(arr, limit) {
				$scope.page.threadLimit = Math.min($scope.messageThreads.length, $scope.page.threadLimit + 10);
			}
			
			$scope.incAThreadLimit = function(arr, limit) {
				$scope.page.aThreadLimit = Math.min($scope.archivedThreads.length, $scope.page.aThreadLimit + 10);
			}
			
			$scope.$watch('init', function(newVal) {
				if (newVal === true) {
					initInbox();
				}
			});
			
			angular.element(window).bind('resize', resizeInbox);

			$scope.$on('$destroy', function() {
					angular.element(window).unbind('resize', resizeInbox);
					SocketUtils.unregisterForNotification('MessageNotification', handleIncMessage);
			});
			
			SocketUtils.registerForNotification('MessageNotification', handleIncMessage);
			
			resizeInbox();
			
			APIService.Get('/threads', function(success, threads) {
				if (success) {
					$scope.messageThreads = threads;
					initThreads($scope.messageThreads);
					$scope.init = true;
				} else {
					$scope.messageAlert.error = {
						title: threads.type,
						message: 'Unable to load message threads. ' + threads.message,
						show: true
					}
				}
			});
    }
])

/******************************************************************************
* Name:         AccountController
* Description:  Handles account preferences and settings. 
*******************************************************************************/
.controller('AccountController', ['$scope', '$location', '$window', '$timeout', '$compile', '$ocLazyLoad', 'AccountService', 'APIService', 'FacebookUtils', 'ImageService', 'TempStore', 
    function($scope, $location, $window, $timeout, $compile, $ocLazyLoad, AccountService, APIService, FacebookUtils, ImageService, TempStore) {
		if (!AccountService.isLoggedIn()) {
			var curPath = $location.path();
			return $location.path('/login').search('redirect', curPath);
		}
		
		$location.search({}); // clear search params

		$scope.page = {
			active: 'account'
		}
		$scope.accountAlert = {};
		$scope.promo = {};
		$scope.account = AccountService.getAccount();
		$scope.tempAccount = {};
		$scope.location = {};
		$scope.notifications = {};
		$scope.breadcrumbs = [
			{links: [{text: 'My Account'}]}
		];
		
		if (TempStore.hasKey('seenAccount')) {
			$scope.skip = true;
		} else {
			TempStore.setTempKey('seenAccount', true);
		}

		var dropzoneTemplate = '<div class="image-template">' +
				'<div class="image-item no-border">' +
					'<div class="image-entity">' +
						'<img data-dz-thumbnail />' +
					'</div>' +
					'<div class="image-progress" data-dz-uploadprogress></div>' +
					'<div class="image-overlay show-always">' +
						'<div class="image-title handle-overflow"><span data-dz-name></span></div>' +
						'<div class="image-size handle-overflow" data-dz-size></div>' +
					'</div>' +
				'</div>' +
			'</div>';

		var updateProfilePic = function(imageObj) {
			AccountService.putAccountImage(imageObj, function(success, account) {
				if (success) {
					$scope.account = account;
					$scope.accountAlert.success = {
						title: 'Success',
						message: 'Account profile image updated successfully.',
						show: true,
						timeout: 3000
					}
					$scope.cloneAccount();
				} else {
					$scope.accountAlert.error = {
						title: 'Updated Failed',
						message: account.type + ': ' + account.message,
						show: true
					}
				}
			});
		}
		
		$scope.activatePromo = function() {
			if (!$scope.promo.code || !$scope.promo.code.length)
				return;
			
			$scope.promo.activation = undefined;
			$scope.promo.loading = true;
			
			AccountService.activatePromo($scope.promo.code, function(success, retVal) {
				$scope.promo.activation = {
					success: success
				}
				
				if (!success) {
					$scope.promo.activation.error = retVal;
				} else {
					$scope.promo.activation.retPromo = retVal.promo;
					$scope.account = retVal.account;
				}
				
				$scope.promo.loading = false;
			});
			
		}
		
		$scope.deleteAccount = function() {
			$scope.globalModalOpts = {
				type: 'dz-delete-account-modal',
				show: true,
				data: {
					account: $scope.account
				}
			}
		}

		$scope.dropzoneConfig = {
			options: {
				url: '/api/images',
				method: "POST",
				thumbnailWidth: 150,
				thumbnailHeight: 150,
				parallelUploads: 1,
				maxFiles: 1,
				paramName: 'accountImage',
				previewTemplate: dropzoneTemplate,
				acceptedFiles: "image/*",
				autoProcessQueue: false,
				previewsContainer: '#profile-img',
				clickable: '#profile-trigger',
				accept: function(file, done) {
					if (this.files[1] != null) {
						return this.removeFile(this.files[1]);
					}

					if (file.cropped || file.width < 200) {
						$timeout(function() {
							$scope.discImageCropper.cropperLoading = false;
							$scope.page.dropzoneImage = true;
						});
						return done();
					}

					$timeout(function() {
						$scope.discImageCropper.cropperLoading = true;
					});
					$scope.dropzoneConfig.getDropzone().removeFile(file);
					ImageService.getDataUri(file, function(dataUri) {
						$scope.discImageCropper.showCropper(file.name, dataUri);
					});

					return done('Processing');
				},
				success: function(file, response) {
					if (typeof response._id !== 'undefined') {
						updateProfilePic(response);
					} else if (response.error) {
						$scope.accountAlert.error = {
							title: 'Upload Failed',
							message: 'Unable to upload profile picture. Please try again. ' + response.error.title + ': ' + response.error.message,
							show: true,
							timeout: 3000
						}
					}
					this.removeFile(file);
					$scope.page.dropzoneImage = false;
				},
				queuecomplete: function() {
					$timeout(function() {
						$scope.page.dropzoneProcessing = false;
					});
				},
				removedallfiles: function() {
					$scope.page.dropzoneImage = false;
				}
			}
		};

		$scope.discImageCropper = {
			onFinish: function(file) {
				$scope.safeApply(function() {
					$scope.discImageCropper.cropperLoading = false;
				});
				if (file) {
					$scope.dropzoneConfig.getDropzone().addFile(file);
				}
			},
			cropperLoading: false
		}

		$scope.triggerDropzone = function() {
			 $scope.dropzoneConfig.getDropzone().processQueue();
		}

		$scope.clearDropzone = function() {
			$scope.dropzoneConfig.getDropzone().removeAllFiles();
		}

		$scope.deleteAccountImage = function() {
			AccountService.deleteAccountImage(function(success, account) {
			if (success) {
				$scope.account = account;
				$scope.accountAlert.success = {
					title: 'Success',
					message: 'Account profile image updated successfully.',
					show: true,
					timeout: 3000
				}
				$scope.cloneAccount();
			} else {
				$scope.accountAlert.error = {
					title: 'Updated Failed',
					message: account.type + ': ' + account.message,
					show: true
				}
			}
		});
		}
		
		$scope.getJoinDays = function() {
			return Math.round(Math.abs(((new Date($scope.account.dateJoined)).getTime() - (new Date()).getTime())/(24*60*60*1000)));
		}

		$scope.countVerifications = function() {
			var count = 0;

			if ($scope.account.fbId) {
				count++;
			}

			if ($scope.account.pdgaNumber) {
				count++;
			}

			return count;
		}

		$scope.updateAccount = function() {
			AccountService.putAccount($scope.tempAccount, function(success, account) {
				if (success) {
					$scope.account = account;
					$scope.accountAlert.success = {
						title: 'Success',
						message: 'Account updated successfully.',
						show: true,
						timeout: 3000
					}
					$scope.cloneAccount();
				} else {
					$scope.accountAlert.error = {
						title: 'Updated Failed',
						message: account.type + ': ' + account.message,
						show: true
					}
				}
			})
		}

		$scope.doFbLink = function() {
			FacebookUtils.link(function(success, account) {
				if (success) {
					$scope.account = account;
					$scope.accountAlert.success = {
						title: 'Success',
						message: 'Facebook linked successfully.',
						show: true,
						timeout: 3000
					}
				} else {
					$scope.accountAlert.error = {
						title: 'Link Failed',
						message: 'Unable to link to Facebook account. ' + account.type + ': ' + account.message,
						show: true
					}
				}
			});
		}

		var doFbUnlink = function() {
			FacebookUtils.unlink(function(success, account) {
				if (success) {
					$scope.account = account;
					$scope.accountAlert.success = {
						title: 'Success',
						message: 'Facebook unlinked successfully.',
						show: true,
						timeout: 3000
					}
				} else {
					$scope.accountAlert.error = {
						title: 'Unlink Failed',
						message: 'Unable to unlink to Facebook account. ' + account.type + ': ' + account.message,
						show: true
					}
				}
			});
		}
		
		$scope.warnFbUnlink = function() {
			$scope.globalModalOpts = {
				type: 'dz-acknowledgement-modal',
				show: true,
				data: {
					message1: 'Do you wish to unlink your Facebook account?',
					message2: 'You will no longer be able to login to disc|zump via Facebook, and your Facebook verification will automatically be disabled if it exists.',
					onClose: function(confirmed) {
						if (confirmed) doFbUnlink();
					}
				}
			}
		}

		$scope.doDelete = function() {
			AccountService.doAccountDelete(function(success, data) {
				if (success) {

				}
			});
		}

		$scope.locSelected = function(result) {
			$scope.location.curLocation = result.address;
			$scope.tempAccount.geoLat = result.latitude;
			$scope.tempAccount.geoLng = result.longitude;
		}

		$scope.cloneAccount = function() {
			$scope.location.search = '';
			$scope.location.curLocation = $scope.account.longLocation;
			$scope.tempAccount = {
				firstName: $scope.account.firstName,
				lastName: $scope.account.lastName,
				bio: $scope.account.bio,
				geoLat: undefined,
				geoLng: undefined
			}
		}

		$scope.cloneAccount();

		$scope.initDropzone = function() {
			if (typeof Dropzone === 'undefined' || typeof EXIF === 'undefined' || 
				typeof Cropper === 'undefined') {
				$ocLazyLoad.load(
					['https://cdn.rawgit.com/exif-js/exif-js/master/exif.js',
					'/static/src/js-dist/dropzone.min.js'
					]).then(function() {
						$ocLazyLoad.load([
							'/static/src/js-dist/cropper.min.js',
							{type: 'css', path: 'https://cdn.rawgit.com/fengyuanchen/cropperjs/master/dist/cropper.min.css'}
						]).then(function() {
								$scope.page.dropzoneReady = true;
							});
					});
			} else {
				$scope.page.dropzoneReady = true;
			}
		}

		$scope.getNotifications = function(reload) {
			if ($scope.page.notificationReady && !reload)
				return;

			$scope.page.notificationReady = false;
			AccountService.getNotifications(function(success, notifications) {
				if (success) {
					$scope.notifications = notifications;
				} else {
					$scope.accountAlert.error = {
						title: 'Notification Load Failed',
						message: 'Unable to load notifications. ' + notifications.type + ': ' + notifications.message,
						show: true
					}
				}
				$scope.page.notificationReady = true;
			})
		}

		$scope.setNotifications = function(reload) {
			$scope.page.notificationReady = false;
			AccountService.putNotifications($scope.notifications, function(success, notifications) {
				if (success) {
					$scope.notifications = notifications;
					$scope.accountAlert.success = {
						title: 'Update Successful',
						message: 'Notification settings have been updated successfully.',
						show: true,
						timeout: 3000
					}
				} else {
					$scope.accountAlert.error = {
						title: 'Update Failed',
						message: 'Unable to save notifications settings. ' + notifications.type + ': ' + notifications.message,
						show: true
					}
				}
				$scope.page.notificationReady = true;
			})
		}

		$scope.$watch('page.active', function(newVal) {
			switch(newVal) {
				case 'profile-pic': return $scope.initDropzone();
				case 'notification': return $scope.getNotifications();
			}
		});
		
		$scope.updateTarget = function(target) {
			$scope.page.active = target;
			$location.url($location.path() + '#' + target);
		}
		
		$scope.$watch(function() {
			return location.hash;
		}, function(newVal) {
			var target = newVal.replace('#','');
			if (['account', 'profile-pic', 'membership', 'notification'].indexOf(target) > -1) {
				$scope.skip = true;
				$scope.page.active = target;
			}
		});
		
		APIService.Get('/account/count', function(success, data) {
			if (success) {
				$scope.count = data.count;
				$scope.page.ready = true;
			}
		});
    }
])

/******************************************************************************
* Name:         AccountController
* Description:  Handles account preferences and settings. 
*******************************************************************************/
.controller('AccountChangeSelController', ['$scope', '$location', '$window', 'AccountService', 'APIService', 'MembershipService', 'TempStore', 
    function($scope, $location, $window, AccountService, APIService, MembershipService, TempStore) {
		if (!AccountService.isLoggedIn()) {
			var curPath = $location.path();
			return $location.path('/login').search('redirect', curPath);
		}
		
		$location.search({}); // clear search params
		$scope.account = AccountService.getAccount();
		
		$scope.breadcrumbs = [
			{links: [{text: 'My Account', href:'/account'}]},
			{links: [{text: 'Membership', href: '/account/membership'}]}
		]
		
		$scope.selUpgrade = function(type) {
			$location.path('/account/membership/process').search('key', TempStore.setTemp(type));
		}
		
		$scope.getAccountType = function(type) {
			return MembershipService.getAccountName(type);
		}
		
		$scope.getAccountCost = function(type) {
			return MembershipService.getAccountCost(type);
		}
    }
])

/******************************************************************************
* Name:         AccountController
* Description:  Handles account preferences and settings. 
*******************************************************************************/
.controller('AccountAdjustController', ['$scope', '$location', '$window', '$timeout', 'smoothScroll', 'AccountService', 'APIService', 'MembershipService', 'TempStore', 
    function($scope, $location, $window, $timeout, smoothScroll, AccountService, APIService, MembershipService, TempStore) {
		if (!AccountService.isLoggedIn()) {
			var curPath = $location.path();
			return $location.path('/login').search('redirect', curPath);
		}

		$location.search({}); // clear search params
		$scope.account = AccountService.getAccount();
		
		$scope.breadcrumbs = [
			{links: [{text: 'My Account', href:'/account'}]},
			{links: [{text: 'Membership', href: '/account/membership'}]}
		]
		
		$scope.billing = {};
		$scope.paypalConfig = {};
		$scope.upgradeAlert = {};
		$scope.form = {
			showBilling: true
		}
		
		$scope.showPayment = function() {
			$scope.upgradeAlert = {};
			$scope.paypalLoading = true;
			MembershipService.createHostedPageAdj($scope.billing, function(success, request) {
				if (success) {
					$scope.request = request.request;
					$scope.paypalConfig.params = {
						src: 'https://payflowlink.paypal.com?SECURETOKENID=' + request.hostedPage.secureTokenId + '&SECURETOKEN=' + request.hostedPage.secureToken,
// 						src: 'https://payflowlink.paypal.com?MODE=TEST&SECURETOKENID=' + request.hostedPage.secureTokenId + '&SECURETOKEN=' + request.hostedPage.secureToken,
						width: '490',
						height: '380',
						border: '0',
						frameborder: '0',
						scrolling: 'no',
						allowtransparency: 'true'
					}
					$scope.paypalConfig.create = true;
					
					$scope.form = {
						showPayment: true
					};

					$timeout(function() {
						var payment = document.getElementById('payment-container');

						var options = {
							duration: 200,
							easing: 'easeInQuad',
							offset: 50
						}

						smoothScroll(payment, options);
					});
				} else {
					$scope.upgradeAlert.error = {
						title: request.type,
						message: request.message,
						show: true
					};
				}
				$scope.paypalLoading = false;
			});
		}
	}])

/******************************************************************************
* Name:         AccountController
* Description:  Handles account preferences and settings. 
*******************************************************************************/
.controller('AccountChangeController', ['$scope', '$location', '$window', '$timeout', 'smoothScroll', 'AccountService', 'APIService', 'MembershipService', 'TempStore', 
    function($scope, $location, $window, $timeout, smoothScroll, AccountService, APIService, MembershipService, TempStore) {
		if (!AccountService.isLoggedIn()) {
			var curPath = $location.path();
			return $location.path('/login').search('redirect', curPath);
		}

		$scope.account = AccountService.getAccount();
		
		$scope.breadcrumbs = [
			{links: [{text: 'My Account', href:'/account'}]},
			{links: [{text: 'Membership', href: '/account/membership'}]}
		]
		
		$scope.form = {
			showConfirm: true
		};
		$scope.confirm = {
			opAct: false,
			paymentMethod: $scope.account.profile.exists ? 'useExisting' : 'createNew'
		}
		$scope.promo = {};
		$scope.billing = {};
		$scope.paypalConfig = {};
		$scope.upgradeAlert = {};
		
		$scope.type = TempStore.getTemp($location.search().key);
		if (typeof($scope.type) === 'undefined') {
			return $location.path('/account/membership').replace();
		}
		
		$scope.accountMethod = MembershipService.getChangeType($scope.account.profile.type, $scope.type);
		
		$scope.hasPromoValue = function(request) {
			return request && request.promo && (request.promo.config.alternateCost || request.promo.config.promoMonthsBefore);
		}
		
		$scope.getPromoValue = function(request) {
			if (!request)
				return 0;
			
			if (!request.promo)
				return request.immediateCharge || 0;
			
			var config = request.promo.config;
			
			if (config.promoMonthsBefore)
				return 0;
			
			if (config.alternateCost)
				return config.alternateCost;
			
			return request.immediateCharge || 0;
		}
		
		$scope.navBack = function() {
			if ($scope.form.showConfirm)
				return;
			
			if ($scope.form.showBilling) {
				$scope.showConfirm();
			}
			
			if ($scope.form.showPayment) { 
				$scope.showBilling();
			}
		}
		
		$scope.showConfirm = function() {
			$scope.form = {
				showConfirm: true
			};
			
			$timeout(function() {
				var billing = document.getElementById('confirm-container');

				var options = {
					duration: 200,
					easing: 'easeInQuad',
					offset: 50
				}

				smoothScroll(billing, options);
			});
		}
		
		$scope.showBilling = function() {
			$scope.form = {
				showBilling: true
			};
			
			$timeout(function() {
				var billing = document.getElementById('billing-container');

				var options = {
					duration: 200,
					easing: 'easeInQuad',
					offset: 50
				}

				smoothScroll(billing, options);
			});
		}
		
		$scope.showPayment = function() {
			$scope.upgradeAlert = {};
			$scope.paypalLoading = true;
			MembershipService.createHostedPage($scope.type, $scope.billing, $scope.promo.code, function(success, request) {
				if (success) {
					$scope.request = request.request;
					$scope.paypalConfig.params = {
						src: 'https://payflowlink.paypal.com?SECURETOKENID=' + request.hostedPage.secureTokenId + '&SECURETOKEN=' + request.hostedPage.secureToken,
						width: '490',
						height: '380',
						border: '0',
						frameborder: '0',
						scrolling: 'no',
						allowtransparency: 'true'
					}
					$scope.paypalConfig.create = true;
					
					$scope.form = {
						showPayment: true
					};

					var payment = document.getElementById('payment-container');

					var options = {
						duration: 200,
						easing: 'easeInQuad',
						offset: 50
					}

					smoothScroll(payment, options);
				} else {
					$scope.upgradeAlert.error = {
						title: request.type,
						message: request.message,
						show: true
					};
				}
				$scope.paypalLoading = false;
			});
		}
		
		$scope.confirmChange = function() {
			if ($scope.accountMethod == 'upgrade-profile' || $scope.accountMethod == 'downgrade-profile') {
				$scope.confirmLoading = true;
				MembershipService.modifyExisting($scope.type, $scope.promo.code, function(success, request) {
					if (success) {
						$location.url('/account/membership/result?req=' + request.req);
					} else {
						$location.url('/account/membership/result?err_type=' + request.type + '&err_msg=' + request.message);
					}
					$scope.confirmLoading = false;
				});
			} else if ($scope.accountMethod == 'clear-profile') {
				$scope.confirmLoading = true;
				MembershipService.clearExisting(function(success, request) {
					if (success) {
						$location.url('/account/membership/result?req=' + request.req);
					} else {
						$location.url('/account/membership/result?err_type=' + request.type + '&err_msg=' + request.message);
					}
					$scope.confirmLoading = false;
				});
			} else if ($scope.accountMethod == 'no-profile' && $scope.account.profile.exists) {
				$scope.confirmLoading = true;
				MembershipService.reactivate($scope.type, $scope.promo.code, function(success, request) {
					if (success) {
						$location.url('/account/membership/result?req=' + request.req);
					} else {
						$location.url('/account/membership/result?err_type=' + request.type + '&err_msg=' + request.message);
					}
					$scope.confirmLoading = false;
				});
			}
		}
		
		if (typeof($scope.accountMethod) === 'undefined')
			return $location.path('/account/change').replace();
		
		$scope.getAccountType = function(type) {
			return MembershipService.getAccountName(type);
		}
		
		$scope.getAccountCost = function(type) {
			return MembershipService.getAccountCost(type);
		}
    }
])

/******************************************************************************
* Name:         AccountController
* Description:  Handles account preferences and settings. 
*******************************************************************************/
.controller('AccountChangeResultController', ['$scope', '$location', '$window', '$timeout', 'AccountService', 'APIService', 'MembershipService', 'TempStore', 
    function($scope, $location, $window, $timeout, AccountService, APIService, MembershipService, TempStore) {
		if (!AccountService.isLoggedIn()) {
			var curPath = $location.path();
			return $location.path('/login').search('redirect', curPath);
		}
		
		$scope.breadcrumbs = [
			{links: [{text: 'My Account', href:'/account'}]},
			{links: [{text: 'Membership', href: '/account/membership'}]}
		]
		
		$scope.loading = true;
		$scope.error = {
			message: $location.search().err_msg,
			type: $location.search().err_type
		}
		
		$scope.getAccountType = function(type) {
			return MembershipService.getAccountName(type);
		}
		
		$scope.getAccountCost = function(type) {
			return MembershipService.getAccountCost(type);
		}
		
		AccountService.getAccount(function(success, account) {
			if (success) {
				$scope.account = account;
				$scope.accountType = account.profile ? account.profile.type : account.accountType;
				$scope.pending = $scope.accountType != account.accountType;
				
				if ($location.search().req) {
					APIService.GetExt('/membership', '/request/' + $location.search().req, function(success, request) {
						if (success) {
							$scope.request = request;
							
							if (request.error) {
								$scope.error = request.error;
							}
						} else {
							$scope.error = request;
						}
						
						$scope.loading = false;
					});
				} else {
					$scope.loading = false;
				}
			} else {
				return $location.path('/account/change').replace();
			}
		});
		
    }
])

/******************************************************************************
* Name:         VerifyPDGAController
* Description:  Handles verification of pdga account
*******************************************************************************/
.controller('VerificationsController', ['$scope', '$location', 'AccountService', 'APIService', 'VerificationService', 
    function($scope, $location, AccountService, APIService, VerificationService) {
		if (!AccountService.isLoggedIn()) {
			var curPath = $location.path();
			return $location.path('/login').search('redirect', curPath);
		}
		
		$location.search({}); // clear search params
		$scope.account = AccountService.getAccount();
		
		$scope.pdga = {
			toggle: true,
			alert: {}
		};
		
		$scope.fb = {
			toggle: true,
			alert: {},
			active: typeof($scope.account.fbId) !== 'undefined'
		}
		
		$scope.breadcrumbs = [
			{links: [{text: 'My Account', href:'/account'}]},
			{links: [{text: 'Verifications'}]}
		];
		
		$scope.$watch('fb.active', function(newVal) {
			$scope.fb.pristine = newVal === (typeof($scope.account.fbId) !== 'undefined');
		});
		
		$scope.setFBVerification = function() {
			AccountService.putVerifications({
				facebook: $scope.fb.active
			}, function(success, data) {
				if (success) {
					$scope.account = data;
					
					var msg = data.fbId ? 'made public.' : 'hidden from the public.';
					
					$scope.fb.alert.success = {
						title: 'Success',
						message: 'Your Facebook account has been ' + msg,
						show: true
					}
				} else {
					$scope.fb.alert.error = {
						title: data.type,
						message: data.message,
						show: true
					}
				}
			});
		}
		
		$scope.resetPDGA = function() {
			$scope.pdga.alert = {};
			$scope.pdga.loading = true;
			AccountService.resetPDGA(function(success, data) {
				if (success) {
					$scope.account = data;
					$scope.pdga.alert.success = {
						title: 'Success',
						message: 'Your PDGA Number has been reset.',
						show: true
					}
				} else {
					$scope.pdga.alert.error = {
						title: data.type,
						message: data.message,
						show: true
					}
				}
				$scope.pdga.loading = false;
			});
		}

		$scope.verifyPDGA = function() {
			$scope.pdga.alert = {};
			$scope.pdga.loading = true;
			AccountService.verifyPDGA($scope.pdga.username, $scope.pdga.password, function(success, data) {
				if (success) {
					$scope.account = data;
					$scope.pdga.alert.success = {
						title: 'Success',
						message: 'Your PDGA Number has been verified as (#' + $scope.account.pdgaNumber + ').',
						show: true
					}
				} else {
					$scope.pdga.alert.error = {
						title: data.type,
						message: data.message,
						show: true
					}
				}
				$scope.pdga.loading = false;
			});
		}
    }
])

/******************************************************************************
* Name:         LoginController
* Description:  Handles verification of pdga account
*******************************************************************************/
.controller('LoginController', ['$scope', '$location', '$window', 'AccountService', 'APIService', 'FacebookUtils', 
	function($scope, $location, $window, AccountService, APIService, FacebookUtils) {
		var redirect = $location.search().redirect;
		
		if (AccountService.isLoggedIn()) {
			return $location.path('/account');
		}
		
		$scope.loading = false;
		$scope.cred = {
			username: '',
			password: ''
		}
		
		$scope.loginAlert = {};
		
		$scope.doFbLogin = function() {
			FacebookUtils.login(function(success, err) {
				if (success) {
					return typeof(redirect) !== 'undefined' ? $location.path(redirect).search({}) : $location.path('/explore').search({});
				}
				
				if (err) {
					if (err.type == 'Inactive') {
						err.message = {
							smartConfig: {
								text: err.message + ' To resend a confirmation email, <!click here>.',
								links: ['/confirm']
							}
						}
					}
					
					$scope.loginAlert.error = {
						title: err.type,
						message: err.message,
						show: true
					}
				}
			});
		}
		
		$scope.doLogin = function() {
			$scope.loading = true;
			$scope.loginAlert = {};
			AccountService.doLogin($scope.cred.username, $scope.cred.password, function(success, err) {
				if (success) {
					return typeof(redirect) !== 'undefined' ? $location.path(redirect).search({}) : $location.path('/explore').search({});
				}
				
				$scope.loading = false;
				if (err) {
					$scope.loginAlert.error = {
						title: err.type,
						message: err.message,
						show: true
					}
				}
			});
		}
	}
])

/******************************************************************************
* Name:         SignupController
* Description:  Handles verification of pdga account
*******************************************************************************/
.controller('SignupController', ['$scope', '$location', '$window', '$timeout', 'AccountService', 'APIService', 'LocalStorage', 'LocationService', 'FacebookUtils', 
	function($scope, $location, $window, $timeout, AccountService, APIService, LocalStorage, LocationService, FacebookUtils) {
		if (AccountService.isLoggedIn()) {
			return $location.path('/account').replace();
		}
		
		if (!LocalStorage.itemExists('dz-signup')) {
			LocalStorage.addItem('dz-signup', true);
			return $location.path('/about').replace();
		}
		
		var formats = {
			userLength: /^.{6,15}$/,
			userChars: /^[a-zA-Z0-9\_]+$/,
			pwLength: /^.{6,}$/
		}
		
		$scope.loading = false;
		$scope.signup = {
			user: {}
		};
		$scope.signupAlert = {};
		$scope.location = {
			results: [],
			loading: false,
			locSet: false,
			geo: {}
		};
		
		$scope.locSelected = function(result) {
			$scope.location.curLocation = result.address;
			$scope.location.geo = {
				latitude: result.latitude,
				longitude: result.longitude
			}
		}
		
		$scope.getFBAccount = function() {
			FacebookUtils.getFBAccount(function(success, data) {
				if (success) {
					APIService.Post('/validate/facebook', {userID: data.token.userID}, function(success, user) {
						if (success) {
							if (!user._id) {
								$timeout(function() {
									$scope.signup.user.firstName = data.account.first_name;
									$scope.signup.form.firstName.$setDirty();

									$scope.signup.user.lastName = data.account.last_name;
									$scope.signup.form.lastName.$setDirty();

									$scope.signup.user.email = data.account.email;
									$scope.signup.form.email.$setDirty();
									$scope.facebook = {
										userID: data.token.userID,
										accessToken: data.token.accessToken
									}
								});
							} else {
								$scope.signupAlert.error = {
									title: 'Validation Error',
									message: 'The Facebook account is already associated with another user.',
									show: true
								}
							}
							
						} else {
							$scope.signupAlert.error = {
								title: 'Validation Error',
								message: 'Unable to validate Facebook credentials. Please try again.',
								show: true
							}
						}
					});
				} else {
					console.log('no success');
				}
			});
		}
		
		$scope.clearForm = function() {
			$scope.signupAlert = {};
			$scope.location = {
				results: [],
				loading: false,
				locSet: false,
				geo: {}
			};
			$scope.facebook = undefined;
			$scope.signup.user = {};
			$scope.signup.form.$setPristine();
		}
		
		$scope.matchFormat = function(param, format) {
			if (!$scope.signup[param]) return false;
			if (!formats[format]) return false;
			
			return formats[format].test($scope.signup[param]);
		}
		
		$scope.doSignUp = function() {
			$scope.loading = true;
			$scope.signupAlert = {};
			APIService.Post('/users', {
				username: $scope.signup.user.username,
				email: $scope.signup.user.email,
				firstName: $scope.signup.user.firstName,
				lastName: $scope.signup.user.lastName,
				password: $scope.signup.user.password,
				geoLat: $scope.location.geo.latitude,
				geoLng: $scope.location.geo.longitude,
				facebook: $scope.facebook
			}, function(success, data) {
				$scope.loading = false;
				
				if (success) {					
					$scope.signupAlert.success = {
						title: 'Signup Successful',
						message: 'A confirmation email has been sent to ' + data.email + '.',
						show: true
					}
					$scope.signupComplete = true;
				} else {
					$scope.signupAlert.error = {
						title: data.type,
						message: data.message,
						show: true
					}
				}
			});
		}
	}
])

/******************************************************************************
* Name:         TrunkLookupController
* Description:  Handles verification of pdga account
*******************************************************************************/
.controller('TrunkLookupController', ['$scope', '$location', 'RedirectService', '$routeParams', 'CacheService',
	function($scope, $location, RedirectService, $routeParams, CacheService) {
		$location.search({}); // clear search params
		
		CacheService.getUser($routeParams.userId, function(success, user) {
			if (success) {
				RedirectService.setRedirect('t/' + user.username);
			} else {
				RedirectService.setRedirect();
			}
		});
	}
])

/******************************************************************************
* Name:         ConfirmController
* Description:  Handles verification of pdga account
*******************************************************************************/
.controller('ConfirmController', ['$scope', '$location', '$timeout', '$routeParams', 'AccountService',
	function($scope, $location, $timeout, $routeParams, AccountService) {
		if (AccountService.isLoggedIn()) {
			return $location.path('/account').search({});
		}
		
		$location.search({}); // clear search params
		$scope.confirmAlert = {};
		$scope.loading = true;
		
		$scope.confirmAlert.error = {}
		
		AccountService.doAccountConfirm($routeParams.authorizationId, function(success, err) {
			if (success) {
				return $location.path('/t/' + AccountService.getAccount().username).replace();
			}
			
			$scope.loading = false;
				if (err) {
					$scope.confirmAlert.error = {
						title: err.type,
						message: err.message,
						show: true
					}
				}
		});
		
	}
])

/******************************************************************************
* Name:         DeleteController
* Description:  Handles verification of pdga account
*******************************************************************************/
.controller('DeleteController', ['$scope', '$location', '$timeout', '$routeParams', 'AccountService',
	function($scope, $location, $timeout, $routeParams, AccountService) {
		if (!AccountService.isLoggedIn()) {
			var curPath = $location.path();
			return $location.path('/login').search('redirect', curPath);
		}
		
		$location.search({}); // clear search params
		$scope.deleteAlert = {};
		$scope.loading = true;
		$scope.deleteSuccess = false;
		
		$scope.deleteAlert.error = {}
		
		AccountService.doAccountDeleteConfirm($routeParams.authorizationId, function(success, err) {
			$scope.loading = false;
			$scope.deleteSuccess = success;
			
			if (!success) {
				$scope.deleteAlert.error = {
					title: err.type,
					message: err.message,
					show: true
				}
			}
			
		});
		
	}
])

/******************************************************************************
* Name:         RecoverController
* Description:  Handles verification of pdga account
*******************************************************************************/
.controller('RecoverController', ['$scope', '$location', '$timeout', '$routeParams', 'AccountService', 'APIService', 
	function($scope, $location, $timeout, $routeParams, AccountService, APIService) {
		if (AccountService.isLoggedIn()) {
			return $location.path('/account').replace();
		}
		
		$location.search({}); // clear search params
		$scope.recoverAlert = {};
		$scope.cred = {};
		$scope.loading = false;
		
		$scope.doRecover = function() {
			$scope.loading = true;
			APIService.Post('/account/recover', {
				email: $scope.cred.username
			}, function(success, result) {
				$scope.loading = false;
				if (success) {
					$scope.recoverAlert.success = {
						title: 'Success',
						message: 'A confirmation email has been sent the above email address with instructions on how to recover your account.',
						show: true
					}
				} else {
					$scope.recoverAlert.error = {
						title: result.type,
						message: result.message,
						show: true
					}
				}
			});
		}
	}
])

/******************************************************************************
* Name:         ConfirmInitController
* Description:  Handles verification of pdga account
*******************************************************************************/
.controller('ConfirmInitController', ['$scope', '$location', '$timeout', '$routeParams', 'AccountService', 'APIService', 
	function($scope, $location, $timeout, $routeParams, AccountService, APIService) {
		if (AccountService.isLoggedIn()) {
			return $location.path('/account').replace();
		}
		
		$location.search({}); // clear search params
		$scope.confirmAlert = {};
		$scope.cred = {};
		$scope.loading = false;
		
		$scope.doConfirmInit = function() {
			$scope.loading = true;
			APIService.Post('/account/confirm', {
				email: $scope.cred.username
			}, function(success, result) {
				$scope.loading = false;
				if (success) {
					$scope.confirmAlert.success = {
						title: 'Success',
						message: 'A confirmation email has been sent the above email address with instructions on how to activate your account.',
						show: true
					}
				} else {
					$scope.confirmAlert.error = {
						title: result.type,
						message: result.message,
						show: true
					}
				}
			});
		}
	}
])

/******************************************************************************
* Name:         UnsubscribeController
* Description:  Handles unsubscribing from notifications
*******************************************************************************/
.controller('UnsubscribeController', ['$scope', '$location', '$timeout', '$routeParams', 'APIService',
	function($scope, $location, $timeout, $routeParams, APIService) {
		$scope.subscribeAlert = {};
		$scope.loading = true;
		$scope.success = false;
		
		if (!$routeParams.hashId || !$routeParams.type) {
			$scope.subscribeAlert.error = {
				title: 'Invalid Request',
				message: 'Please try again.',
				show: true
			}
			
			$scope.loading = false;
		} else {
			APIService.Post('/account/unsubscribe', {
				hashId: $routeParams.hashId,
				notification: $routeParams.type
			}, function(success, data) {
				if (success) {
					$scope.loading = false;
					$scope.success = true;
				} else {
					$scope.subscribeAlert.error = {
						title: data.type,
						message: data.message,
						show: true
					}

					$scope.loading = false;
				}
			});
		}
		
	}
])

/******************************************************************************
* Name:         ResetController
* Description:  Handles verification of pdga account
*******************************************************************************/
.controller('ResetController', ['$scope', '$location', '$timeout', '$routeParams', 'AccountService', 'APIService', 
	function($scope, $location, $timeout, $routeParams, AccountService, APIService) {
		
		$scope.isReset = typeof($routeParams.authorizationId) === 'undefined';
		$location.search({}); // clear search params
		
		if ((!$scope.isReset && AccountService.isLoggedIn()) ||
			($scope.isReset && !AccountService.isLoggedIn())){
			return $location.path('/redirect');
		}
		
		if ($scope.isReset) {
			$scope.breadcrumbs = [
				{links: [{text: 'My Account', href: '/account'}]},
				{links: [{text: 'Reset Password'}]}
			];
		}
		
		$scope.resetAlert = {};
		$scope.cred = {};
		$scope.loading = false;
		$scope.validating = true;
		$scope.isValid = false;
		
		$scope.matchLen = function(val) {
			return val && /^.{6,}$/.test(val);
		}
		
		$scope.doReset = function() {
			$scope.resetAlert = {};
			if ($scope.isReset) {
				APIService.Post('/account/reset', {
					currentPw: $scope.cred.cpassword,
					newPw: $scope.cred.password
				}, function(success, result) {
					if (success) {
						$scope.cred = {};
						$scope.resetAlert.success = {
							title: 'Password Reset',
							message: 'Your password has been reset successfully.',
							show: true
						}
					} else {
						$scope.resetAlert.error = {
							title: result.type,
							message: result.message,
							show: true
						}
					}
				});
			} else {
				APIService.Post('/account/recover/' + $routeParams.authorizationId, {
					password: $scope.cred.password
				}, function(success, result) {
					if (success) {
						$scope.cred = {};
						$scope.resetAlert.success = {
							title: 'Password Reset',
							message: 'Your password has been reset successfully. Please login to continue.',
							show: true
						}
					} else {
						$scope.resetAlert.error = {
							title: result.type,
							message: result.message,
							show: true
						}
					}
				});
			}
		}
		
		if (!$scope.isReset) {
			APIService.Get('/account/recover/' + $routeParams.authorizationId, function(success, result) {
				$scope.validating = false;

				if (!success) {
					return $scope.resetAlert.error = {
						title: result.type,
						message: result.message,
						show: true
					}
				}

				$scope.isValid = true;
			});
		} else {
			$scope.validating = false;
			$scope.isValid = true;
		}
	}
])

/******************************************************************************
* Name:         AboutController
* Description:  Handles verification of pdga account
*******************************************************************************/
.controller('AboutController', ['$scope', '$location', '$compile', '$timeout', 'AccountService', 'MembershipService', 
	function($scope, $location, $compile, $timeout, AccountService, MembershipService) {
		$scope.account = AccountService.getAccount();
		$location.search({}); // clear search params
		
		$scope.hiwImage = '/static/img/anim/upload.mp4';
		
		$scope.getAccountType = function(type) {
			return MembershipService.getAccountName(type);
		}
		
		$scope.getAccountCost = function(type) {
			return MembershipService.getAccountCost(type);
		}
	}
])

/******************************************************************************
* Name:         FAQController
* Description:  Handles FAQ page
*******************************************************************************/
.controller('FAQController', ['$scope', '$location', '$timeout', 'smoothScroll', 'PageUtils', 
	function($scope, $location, $timeout, smoothScroll, PageUtils) {
		
		var parseTarget = function(target) {
			var elem = document.getElementById(target);
			if (elem) {
				$scope.activeTarget = target;
				
				if (PageUtils.getTop(elem) < PageUtils.getScrollPos() || PageUtils.getFullHeight(elem) > (PageUtils.getScrollPos() + PageUtils.getWindowHeight())) {
					smoothScroll(elem, {
						duration: 300,
						easing: 'easeInQuad',
						offset: 60
					});
				}
			}
		}
		
		$scope.updateUrl = function(target) {
			if (location.hash === '#' + target) {
				parseTarget('faq-' + target);
			} else {
				$location.url($location.path() + '#' + target);
			}
		}
		
		
		$scope.$watch(function () {
			return location.hash;
		}, function (value) {
			if (value !== 'undefined')
				parseTarget('faq-' + value.replace('#',''));
		});
	}
])

/******************************************************************************
* Name:         LogoutController
* Description:  Handles verification of pdga account
*******************************************************************************/
.controller('LogoutController', ['$location', '$timeout', 'AccountService', 
	function($location, $timeout, AccountService) {
		var search = $location.search();
		
		if (!AccountService.isLoggedIn()) {
			return $location.path('/login').replace();
		}
		
		$timeout(function() {
			AccountService.doLogout(function() {
				if (search.redirectURI) {
					$location.path('/' + search.redirectURI).replace();
				} else {
					$location.path('/login').replace();
				}
			});
		}, 500);
	}
])

