angular.module('disczump.controllers', ['disczump.services'])

.filter('startFrom', [function() {
    return function(input, start) {
        if(input) {
            start = +start; //parse to int
            return input.slice(start);
        }
        return [];
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

.directive('filterDropdown', ['$window', '$compile', '$location', 'AccountService', 'PageUtils', function($window, $compile, $location, AccountService, PageUtils) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			var opts, dropdown, backdrop;
			var buffer = 5;
			
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
			
			scope.doFilter = function(global) {
				var filter = opts.prop + ':' + opts.val;
				hideFilter();
				if (global) {
					$location.url('/explore?s=rel&f_0=' + filter);
				} else {
					$location.url('/t/' + AccountService.getAccount().username + '?s=rel&f_0=' + filter);
				}
			}
			
			var handleClick = function() {
				backdrop = angular.element('<div class="full-backdrop" ng-click="hideFilter($event)"></div>');
				
				dropdown = angular.element('<div class="filter-dropdown">' + 
										   		'<div class="filter-marker"></div>' + 
										   		'<div class="filter-dd-title">' + (opts.text ? opts.text : opts.prop) + ': ' + opts.val + (opts.suffix ? opts.suffix : '') + '</div>' +
										   		'<div class="filter-dd-opt"><span class="hover-underline" ng-click="doFilter(true);"><span><i class="fa fa-filter"></i></span>Filter globally</span></div>' + 
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
			var ac;
			
			var resizeAC = function() {
				ac.css('width', elem[0].clientWidth + 'px');
				ac.css('marginTop', elem[0].clientHeight + 'px');
			}
			
			var initAC = function() {
				ac = document.createElement('ul');
				ac.classList.add('ac-container');
				ac.innerHTML = '<li style="text-align:left;" ng-repeat="result in results track by $index" ng-class="{\'active\':activeIndex == $index}" ng-click="setInput(result.val)">{{result.val}}</li>';
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
						scope.activeIndex = -1;
                    }
                });
			}
			
			scope.setInput = function(val) {
				$timeout(function() {
					scope.ngModel = val;
					elem[0].focus();
				});
			}
			
			var inputFocus = function() {
				$timeout(function() {
					scope.active = true;
				});
				
				if (!scope.init && ngModel.$modelValue && ngModel.$modelValue.length) {
					queryField();
					scope.init = true;
				} else {
					scope.results = [];
				}
				
			}
			
			var inputBlur = function() {
				$timeout(function() {
					scope.active = false;
				}, 100);
			}
			
			var handleEnter = function(evt) {
				if (evt.keyCode == 13 && scope.activeIndex > -1) {
					evt.stopImmediatePropagation();
					scope.setInput(scope.results[scope.activeIndex].val);
				}
			}
			
			var handleKey = function(evt) {
				switch(evt.keyCode) {
					case 38: {
						$timeout(function() {
							scope.activeIndex = Math.max(-1, scope.activeIndex - 1);
						});
						break;
					}
					case 40: {
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
			elem.bind('keydown', handleEnter);
			
			scope.$watch(function () {
				return ngModel.$modelValue;
			}, function(newValue) {
				if (typeof(newValue) === 'undefined' || newValue == '') {
					scope.results = [];
				} else {
					queryField();
				}
			});
			
			scope.$on('$destroy', function() {
				angular.element(window).unbind('resize', resizeAC);
				elem.unbind('focus', inputFocus);
				elem.unbind('blur', inputBlur);
				elem.unbind('keyup', handleKey);
				elem.unbind('keydown', handleEnter);
			})
			
			initAC();
		}
	}
}])

.directive('parseText', ['$compile', function($compile) {
	return {
		restrict: 'A',
		scope: {
			parseText: '='
		},
		link: function(scope, elem, attrs) {
			var toReplace = [];
			var inner = scope.parseText;
			
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
				var discRegex = /(?:https?:\/\/)?(?:www\.)?(?:ec2-54-218-32-190\.us-west-2\.compute\.amazonaws\.com\/portal)?\/d\/[a-zA-Z0-9-_]+/g;
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
			elem[0].innerHTML = '<span>' + inner + '</span>';
			$compile(angular.element(elem[0].firstChild))(scope.$parent);
		}
	}
}])

.directive('inlineDisc', ['_', '$timeout', 'APIService', function(_, $timeout, APIService) {
	return {
		restrict: 'E',
		replace: true,
		scope: {
			discUrl: '@'
		},
		template: '<a class="inline-disc hover-underline" ng-href="/portal/d/{{discId}}">' +
					'<img img-load directive-on="init" directive-set="{\'img-src\':\'{{image}\}\'}"/>{{title}}' +
				'</a>',
		link: function(scope, elem, attrs) {
			var discRegex = /(?:https?:\/\/)?(?:www\.)?(?:ec2-54-218-32-190\.us-west-2\.compute\.amazonaws\.com\/portal)?\/d\/([a-zA-Z0-9-_]+)/g;
			var match = discRegex.exec(scope.discUrl);
			if (match) {
				scope.discId = match[match.length - 1];
				APIService.Get('/discs/' + scope.discId, function(success, disc) {
					if(success) {
						$timeout(function() {
							scope.image = disc.primaryImage ? '/files/' + _.findWhere(disc.imageList, {_id: disc.primaryImage}).fileId : undefined;
							scope.init = typeof(scope.image) !== 'undefined';
							scope.title = disc.brand + ' ' + disc.name;
						});
					} else {
						scope.title = 'Unknown';
					}
				});
			} else {
				scope.title = 'Unknown';
			}
		}		
	}
}])

/******************************************************************************
* 
* DIRECTIVES
* 
*******************************************************************************/
.directive('dzHeader', ['$window', '$location', 'PageUtils', 'AccountService', function($window, $location, PageUtils, AccountService) {
    return {
        restrict: 'E',
        replace: true,
		scope: true,
        template: '<div class="dz-navbar min-window-width" ng-class="{\'fixed\':fixed}" ng-style="{\'background-color\':\'rgba(74,74,74,\' + (alphaValue/ 100) +\')\'}">' +
                        '<div class="dz-navbar-btn-container float-left">' +
                            '<div class="dz-navbar-btn-list">' +
                                '<a href="/portal" ng-style="{\'opacity\': alphaValue}"><img src="/static/logo/logo_text.png" class="dz-navbar-logo"></a>' +
                            '</div>' +
                        '</div>' +
                        '<div class="dz-navbar-btn-container float-right">' +
                            '<div class="dz-navbar-btn-list">' + 
                                '<div class="dz-navbar-item dz-navbar-dropdown" ng-if="user" ng-click="toggleDropdown()">' +
                                    '<img ng-src="{{getAccountImage()}}">' +
                                    '<span>' +
                                        '<i class="fa fa-angle-double-down fa-lg"></i>' +
                                    '</span>' +
                                '</div>' +
                                '<div class="backdrop" ng-show="showOptions" ng-click="toggleDropdown(false)" ng-if="user"></div>' +
                                '<ul class="dz-dropdown-menu" ng-show="showOptions" ng-if="user">' +
                                    '<li><a href="/portal/account"><span><i class="fa fa-tools fa-cogs"></i></span>Settings</a></li>' +
									'<li class="menu-sep"></li>' +
                                    '<li><a href="#" id="menu-feedback"><span><i class="fa fa-comment fa-tools"></i></span>Feedback</a></li>' +
                                    '<li><a href="/portal/faq"><span><i class="fa fa-tools fa-question-circle"></i></span>FAQ</a></li>' +
                                    '<li><a href="/portal/about"><span><i class="fa fa-tools fa-info-circle"></i></span>About</a></li>' +
									'<li class="menu-sep"></li>' +
                                    '<li><a href="/portal/logout" data-ajax="false"><span><i class="fa fa-sign-out fa-tools"></i></span>Logout</a></li>' +
                                '</ul>' +
                                '<div class="dz-navbar-links">' +
                                    '<a class="dz-navbar-item dz-navbar-btn" href="/portal/explore" ng-class="{\'active\':isItemActive(\'explore\')}">Explore</a>' +
                                    '<a class="dz-navbar-item dz-navbar-btn" href="/portal/trunks" ng-class="{\'active\':isItemActive(\'trunks\')}">Trunks</a>' +
                                    '<a class="dz-navbar-item dz-navbar-btn" ng-if="!user" href="/portal/about" ng-class="{\'active\':isItemActive(\'about\')}">About</a>' +
                                    '<a class="dz-navbar-item dz-navbar-btn" ng-if="user" ng-href="/portal/t/{{user.username}}" ng-class="{\'active\':isItemActive(\'t/{{user.username}}\')}">My Trunk</a>' +
                                    '<a class="dz-navbar-item dz-navbar-btn" ng-if="user" ng-href="/portal/inbox" ng-class="{\'active\':isItemActive(\'inbox\')}">Inbox</a>' +
                                    '<a class="dz-navbar-item dz-navbar-btn" href="/portal/login" ng-if="!user" ng-class="{\'active\':isItemActive(\'login\')}">Sign In</a>' +
                                    '<a class="dz-navbar-item dz-navbar-btn" href="/portal/signup" ng-if="!user" ng-class="{\'active\':isItemActive(\'signup\')}">Sign Up</a>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="clearfix"></div>' +
                    '</div>',
        link: function(scope, element, attrs) {
			scope.user = AccountService.getAccount();
			scope.showOptions = false;
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
                return scope.user.image || '/static/img/dz_disc.png';
            }
            
            scope.isItemActive = function(item) {
				var urlTest = new RegExp(item + '(\\?.*)?$');
                return urlTest.test($location.url());
            }
            
            scope.$on('$destroy', function() {
                angular.element(document).unbind('scroll', blendHeader);
            });
					
					scope.toggleDropdown = function(forceTo) {
						if (typeof(forceTo) !== 'undefined') {
							scope.showOptions = forceTo;
						} else {
							scope.showOptions = !scope.showOptions;
						}
						
						console.log('changing state: ' + scope.showOptions);
						
					}
            
        }
    }
}])

.directive('dzFooter', ['$timeout', 'PageUtils', function($timeout, PageUtils) {
    return {
        restrict: 'E',
        replace: true,
        template: '<div class="footer-bar" ng-init="pgSettings.hasFooter=true;">' + 
                    '<div>' + 
                        '<span class="footer-copyright">' + 
                            '<span class="cr-main">' + 
                            'Copyright <i class="fa fa-copyright"></i> disc|zump, LLC' + 
                            '</span>' + 
                            '<span class="cr-links">' + 
                            '<a href="mailto:support@disczump.com">Contact Us</a>' + 
                            '<a href="/portal/faq">FAQ</a>' + 
                            '<a href="/portal/privacy">Privacy Policy</a>' + 
                            '<a href="/portal/terms">Terms and Conditions</a>' + 
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
            
        }
    }
}])

.directive('dzProfile', ['$window', '$timeout', 'CacheService', '$compile', function($window, $timeout, CacheService, $compile) {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            userId: '@',
			currentUser: '='
        },
        template: '<div class="profile-container">' +
					'<div class="card-container">' +
						'<div id="card-remain" style="display: inline-block">' +
							'<div class="profile-card p-info">' +
								'<div class="p-info-img">' +
									'<img ng-src="{{getAccountImage()}}"/>' +
								'</div>' +
								'<div class="p-info-content p-container">' +
									'<div class="p-info-text">' +
										'<div class="p-username">{{user.username}}</div>' +
										'<div class="p-name">{{user.firstName}} {{user.lastName}}</div>' +
									'</div>' +
									'<div class="p-info-bio fancy-scroll" ng-class="{\'has-ph\':!user.bio}">' +
										'<span class="placeholder" ng-if="!user.bio">Hello, welcome to my trunk...<span>' + 
									'</div>' +
								'</div>' +
							'</div>' +
							 '<div class="profile-card p-icon-button" ng-if="currentUser != userId">' +
								'<div class="p-container">' +
									'<a class="p-icon-text align-vmid" ng-href="/portal/inbox?userId={{user._id}}">' +
										'<div class="p-icon-style"><i class="fa fa-envelope"></i></div>' +
										'<div class="p-icon-label">Message</div>' +
									'</a>' +
								'</div>' +
							'</div>' +
							'<div class="profile-card p-icon-button" ng-if="currentUser == userId">' +
								'<div class="p-container">' +
									'<a class="p-icon-text align-vmid" href="/portal/d/create/templates">' +
										'<div class="p-icon-style"><i class="fa fa-plus-circle"></i></div>' +
										'<div class="p-icon-label">Add Disc</div>' +
									'</a>' +
								'</div>' +
							'</div>' +
						'</div>' +
						'<div ng-style="contStyle" class="card-list" id="card-list">' + 
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

					var resizeProfile = function() {
						$timeout(function(){
							var remainContainer = angular.element(document.getElementById('card-remain'));
							scope.showCount = Math.floor((element[0].clientWidth - remainContainer[0].clientWidth) / 220);
							scope.navArr = new Array(Math.ceil(scope.cards.length / scope.showCount));
							scope.contStyle = { 'maxWidth': (scope.showCount * 220) + 'px' };
							console.log('resized profile');
							scope.$apply();
						});
					}
					
					function setCards() {
						scope.cards.push({type: 'dz-map-card'});
						if (scope.user.pdgaNumber) scope.cards.push({type: 'dz-pdga-card'});
						if (scope.user.fbId) scope.cards.push({type: 'dz-facebook-card'});
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
						CacheService.getUser(scope.userId, function(success, user) {
							if (success) {
								$timeout(function() {
									scope.user = user;
									setCards();
									
									
								var remainContainer = angular.element(document.getElementById('card-remain'));
									scope.$watch(function() { return remainContainer[0].clientWidth;}, function(val) {
										if (typeof(val) !== 'undefined') {
											resizeProfile();
											scope.init = true;
										}
									});
								});
							}
						});
					}
					
					angular.element($window).bind('resize', resizeProfile);

					scope.$on('$destroy', function() {
						angular.element($window).unbind('resize', resizeProfile);
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
								'<div class="p-icon-label">Member Since {{user.dateJoined | date:\'MM/dd/yyyy\'}}</div>' +
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
						console.log('showing map');
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
        template: '<div class="breadcrumb-container">' +
                    '<div class="pagination-container" title="Showing {{showCount}} of {{totalCount}} results" ng-show="$def(showCount)">' +
                        '{{showCount}} | <span class="dz-blue">{{totalCount}}</span>' +
                    '</div>' +
                    '<div class="breadcrumb-trail" ng-show="!hideOn">' +
                        '<span class="hover-underline" title="Explore Home" ng-show="breadcrumbs.length"><a ng-href="/portal/{{homeUrl}}"><i class="fa fa-home" style="font-size: 1.1em; color: #008edd"></i></a></span>' +
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
        template: '<div class="grid-item">' +
                    '<div class="grid-img-container">' +
                        '<div class="grid-img-inner">' +
                            '<div class="grid-img-content">' + 
                                '<div>' + 
                                    '<a class="grid-item-nav"></a>' +
                                    '<img ng-src="{{getPrimaryImage(disc)}}">' +
                                '</div>' +
                            '</div>' + 
                        '</div>' + 
                    '</div>' +
                    '<div class="grid-item-info">' +
                        '<div class="grid-item-label handle-overflow">' +
                            '<a class="hover-underline" ng-href="/portal/d/{{disc._id}}">{{disc.brand}} | <span class="dz-blue">{{disc.name}}</span></a>' +
                        '</div>' +
                        '<div class="clearfix"></div>' +
                    '</div>' +
                '</div>',
    }
})

.directive('discItem', ['QueryService', function(QueryService) {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            disc: '=',
            currentUser: '=',
			msOpts: '='
        },
        template: '<div class="grid-item">' +
                    '<div class="grid-item-icon top-left for-sale" ng-show="disc[\'marketplace.forSale\']">' +
                        '<i class="fa fa-usd"></i>' +
						'<span ng-if="disc[\'marketplace.value\']">{{disc[\'marketplace.value\'] | currency:"":2}}</span>' +
                    '</div>' +
                    '<div class="grid-item-icon top-right for-trade" ng-show="disc[\'marketplace.forTrade\']">' +
                        '<i class="fa fa-refresh"></i>' +
                    '</div>' +
                    '<div class="grid-img-container flip" ng-mouseenter="displayHoverIcon=true;" ng-mouseleave="displayHoverIcon=false;">' +
                        '<div class="grid-img-inner">' + 
                            '<div class="grid-hover-icon grid-info-icon" ng-show="displayHoverIcon" ng-click="flip=!flip;" ng-class="{\'show\': displayHoverIcon, \'remain\': flip}" title="More Info">' + 
                                '<span class="fa-stack">' +
                                  '<i class="fa fa-circle fa-stack-2x"></i>' +
                                  '<i class="fa fa-info fa-stack-1x fa-inverse"></i>' +
                                '</span>' +
                            '</div>' + 
                            '<a ng-href="/portal/d/{{disc._id}}/edit" class="grid-hover-icon grid-edit-icon" ng-show="displayHoverIcon" ng-class="{\'show\': displayHoverIcon && !flip}" ng-if="currentUser && currentUser._id == disc.userId" title="Edit Disc">' + 
                                '<span class="fa-stack">' +
                                  '<i class="fa fa-circle fa-stack-2x"></i>' +
                                  '<i class="fa fa-pencil fa-stack-1x fa-inverse"></i>' +
                                '</span>' +
                            '</a>' +
                            '<div class="grid-img-content flip-card" ng-class="{\'flipped\':flip}">' + 
                                '<div class="flip-face flip-front">' + 
                                    '<a class="grid-item-nav" ng-href="/portal/d/{{disc._id}}"></a>' +
                                    '<img ng-src="{{getSolrPrimaryImage(disc)}}">' +
                                '</div>' +
                                '<div class="grid-quick-info flip-face flip-back">' +
                                    '<div class="qi-content fancy-scroll">' + 
                                        '<div class="qi-title">Disc Info</div>' + 
                                        '<div class="qi-item"><div>Brand:</div><div class="handle-overflow">{{disc.brand}}</div></div>' + 
                                        '<div class="qi-item"><div>Name:</div><div class="handle-overflow">{{disc.name}}</div></div>' + 
                                        '<div class="qi-item" ng-if="isDef(disc.type)"><div>Type:</div><div class="handle-overflow">{{disc.type}}</div></div>' + 
                                        '<div class="qi-item" ng-if="isDef(disc.material)"><div>Material:</div><div class="handle-overflow">{{disc.material}}</div></div>' + 
                                        '<div class="qi-item" ng-if="isDef(disc.color)"><div>Color:</div><div class="handle-overflow">{{disc.color}}</div></div>' + 
                                        '<div class="qi-item" ng-if="isDef(disc.weight)"><div>Weight:</div><div class="handle-overflow">{{disc.weight}}g</div></div>' + 
                                        '<div class="qi-item" ng-if="isDef(disc.condition)"><div>Condition:</div><div class="handle-overflow">{{disc.condition}}/10</div></div>' + 
                                        '<div class="qi-item" ng-if="isDef(disc.speed)"><div>Speed:</div><div class="handle-overflow">{{disc.speed}}</div></div>' + 
                                        '<div class="qi-item" ng-if="isDef(disc.glide)"><div>Glide:</div><div class="handle-overflow">{{disc.glide}}</div></div>' + 
                                        '<div class="qi-item" ng-if="isDef(disc.turn)"><div>Turn:</div><div class="handle-overflow">{{disc.turn}}</div></div>' + 
                                        '<div class="qi-item" ng-if="isDef(disc.fade)"><div>Fade:</div><div class="handle-overflow">{{disc.fade}}</div></div>' + 
                                    '</div>' +
                                '</div>' +
                            '</div>' + 
                        '</div>' + 
                    '</div>' +
                    '<div class="grid-item-info">' +
                        '<div class="grid-item-label handle-overflow">' +
                            '<a class="hover-underline" ng-href="/portal/d/{{disc._id}}">{{disc.brand}} | <span class="dz-blue">{{disc.name}}</span></a>' +
                        '</div>' +
                        '<div class="grid-item-text float-left hover-underline" ng-show="!disc.user">' +
                            '{{disc.userId}}' +
                        '</div>' +
                        '<div class="grid-item-text float-left hover-underline" ng-show="disc.user">' +
                            '<a ng-href="/portal/t/{{disc.user.username}}">{{disc.user.username}}</a>' +
                        '</div>' +
                        '<div class="grid-item-text float-right" ng-if="disc.weight">' +
                            '{{disc.weight}}g' +
                        '</div>' +
                        '<div class="clearfix"></div>' +
                    '</div>' +
					'<div class="overlay-container" ng-show="msOpts.active">' +
                        '<div class="overlay" ng-class="{\'selected\': disc.selected}" ng-click="msOpts.toggleSelected(disc)" ng-init="disc.selected = false">' +
                            '<i class="fa fa-check-circle-o no-animate" ng-show="!disc.selected"></i>' +
                            '<i class="fa fa-check-circle no-animate selected" ng-show="disc.selected"></i>' +
                        '</div>' +
                    '</div>' +
                '</div>',
        link: function(scope, element, attrs) {
            scope.getSolrPrimaryImage = function(disc) {
                return QueryService.getSolrPrimaryImage(disc);
            }
			
			scope.isDef = function(x) {
				return typeof(x) !== 'undefined';
			}
        }
    }
}])

.directive('userItem', ['CacheService', function(CacheService) {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            user: '='
        },
        template: '<div class="grid-item">' +
                    '<div class="grid-item-icon top-left location handle-overflow" ng-show="location">' +
						'<span><i class="fa fa-street-view"></i>{{location}}</span>' +
                    '</div>' +
                    '<div class="grid-img-container">' +
                        '<div class="grid-img-inner">' +
                            '<div class="grid-img-content">' + 
                                '<div>' + 
                                    '<a class="grid-item-nav" ng-href="/portal/t/{{user[\'local.username\']}}"></a>' +
                                    '<img img-load="/static/img/dz_profile.png" directive-on="init" directive-set="{\'img-src\':\'{{user.image}\}\'}">' +
                                '</div>' +
                            '</div>' +
                        '</div>' + 
                    '</div>' +
                    '<div class="grid-item-info">' +
                        '<div class="grid-item-label handle-overflow">' +
                            '<a class="hover-underline" ng-href="/portal/t/{{user[\'local.username\']}}">{{user[\'local.username\']}}</a>' +
                        '</div>' +
                        '<div class="grid-item-text float-left">' +
                            '{{user[\'local.firstName\']}}<span ng-if="user[\'local.firstName\']"> </span>{{user[\'local.lastName\']}}' +
                        '</div>' +
                        '<a class="grid-item-text float-right hover-underline" ng-if="user[\'local.pdgaNumber\']" target="_blank" ng-href="http://www.pdga.com/player/{{user[\'local.pdgaNumber\']}}">' +
                            '#{{user[\'local.pdgaNumber\']}}' +
                        '</a>' +
                        '<div class="clearfix"></div>' +
                    '</div>' +
                '</div>',
        link: function(scope, element, attrs) {
			CacheService.getUser(scope.user._id, function(success, user) {
				if (success) {
					scope.location = user.shortLocation;
					scope.user.image = user.image;
					scope.init = true;
				}
			});
        }
    }
}])

.directive('lightbox', ['_', '$window', '$timeout', function(_, $window, $timeout) {
    return {
			restrict: 'E',
			replace: true,
			scope: {
				imageBlockId: '=',
				imageList: '=',
				trigger: '=',
				scrollLock: '='
			},
			template:   '<div class="full-screen-backdrop no-select" ng-show="showLightbox" ng-click="backdropExit($event);">' +
							'<div class="lb-container">' +
								'<div id="lb-content" class="lb-image-block no-focus" tabindex="0">' +
									'<div id="lb-image-list" class="lb-image-list float-left fancy-scroll lite">' +
										'<img class="image-preview" ng-src="/files/{{img.thumbnailId}}" ng-repeat="img in imageList track by $index" ng-class="{active: index == $index}" ng-click="setImage($index)">' +
									'</div>' +
									'<div id="lb-image" class="lb-image">' +
										'<div style="display:table-cell; vertical-align:middle;">' +
											'<img class="fit-parent" img-load img-src="/files/{{imageList[index].fileId}}">' +
										'</div>' +
									'</div>' +
								'</div>' +
							'</div>' +
							'<div class="lb-x absolute-top-right">' +
								'<p class="lb-close" ng-click="trigger=false">×</p>' +
							'</div>' +
						'</div>',
			link: function(scope, element, attrs) {
				var lbContent = angular.element(document.getElementById('lb-content'));
				var lbImageList = angular.element(document.getElementById('lb-image-list'));
				var lbImage = angular.element(document.getElementById('lb-image'));
				var pad = 100;
				var padList = 85;
				var width = 0;
				var height = 0;
				scope.index = 0;
				scope.showLightbox = false;
				
				scope.backdropExit = function(evt) {
					if (evt.target == element[0]) {
						scope.trigger = false;
					}
				}
				
				var preloadImages = function() {
					angular.forEach(scope.imageList, function(img) {
						var imgObj = new Image();
						imgObj.src = '/files/' + img.fileId;
					});
				}
				
				var resize = function() {
					$timeout(function() {
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
					});
				}
				
				var handleKeyup = function(e) {
					if (e.keyCode == 39 || e.keyCode == 40) { //right or down
						$timeout(function() {
							scope.index = Math.min(scope.imageList.length - 1, scope.index + 1);
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
				
				scope.$watch('trigger', function(val) {
					if (val === true) {
						preloadImages();
						scope.index = _.findIndex(scope.imageList, function(img) {
							return img._id == scope.imageBlockId;
						});
						scope.scrollLock = true;
						scope.showLightbox = true;
						resize();
					} else if (val === false) {
						scope.showLightbox = false;
						scope.scrollLock = false;
					}
				})
				
				scope.setImage = function(imgIndex) {
					$timeout(function() {
						scope.index = imgIndex;
					});
				}
				
				angular.element($window).bind('resize', resize);
				lbContent.bind('keyup', handleKeyup);
				
				scope.$on('$destroy', function() {
					angular.element($window).unbind('resize', resize);
					lbContent.unbind('keyup', handleKeyup);
				})
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
            return dropzone
        };
    };
})

.directive('imageCropper', ['$window', 'ImageService', 'PageUtils', 
    function($window, ImageService, PageUtils) {
        return {
            restrict: 'E',
            scope: {
                cropperOptions: "="
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
                
                var resizeCropper = function() {
                    var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
                    var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
                    scope.safeApply(function() {
                        scope.topInnerMarg = ($window.innerHeight - 500) / 2;
                        scope.leftInnerMarg = (width - 500) / 2;
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
                    });
                    var parent = document.getElementById('image-parent');
                    parent.innerHTML = '<img src="' + src + '" id="test-crop"' + 
                        ' filename="' + name + '"/>';
                    initCropper();
                }
    
                scope.cancel = function(e) {
                    e.preventDefault();
                    cropper.destroy();
                    scope.safeApply(function() {
                        scope.show = false;
                    });
                }
    
                scope.finish = function(e) {
                    e.preventDefault();
                    scope.safeApply(function() {
                        scope.cropperOptions.cropperLoading = true;
                        scope.show = false;
                    });
                    setTimeout(function() {
                        var blob = cropper.getCroppedCanvas().toDataURL();
                        var newFile = ImageService.dataURItoBlob(blob);
                        cropper.destroy();
                        newFile.cropped = true;
                        newFile.name = imageName;
                        scope.cropperOptions.onFinish(newFile);
                        
                    }, 100);
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
    
.directive('dzAlert', ['$timeout', function($timeout){
    return {
        restrict: 'E',
        scope: {
            alertData: '=',
			dock: '@'
        },
        replace: true,
        template: '<div class="message-alert" ng-class="{\'dock\':dock, \'dock-top\': dock == \'top\', \'dock-bottom\': dock == \'bottom\'}">' +
                    '<div class="alert alert-success" ng-show="alertData.success.show" ng-class="{\'slide-down\': dock == \'top\', \'slide-top\': dock == \'bottom\'}">' +
                        '<button type="button" class="close" aria-label="Close" ng-click="alertData.success.show=false;"><span aria-hidden="true">×</span></button>' +
                        '<div class="alert-body">' +
                            '<strong ng-if="alertData.success.title">{{alertData.success.title}}! </strong>' +
                            '{{alertData.success.message}}' +
                        '</div>' +
                    '</div>' +
                    '<div class="alert alert-info" ng-show="alertData.info.show" ng-class="{\'slide-down\': dock == \'top\', \'slide-top\': dock == \'bottom\'}">' +
                        '<button type="button" class="close" aria-label="Close" ng-click="alertData.info.show=false;"><span aria-hidden="true">×</span></button>' +
                        '<div class="alert-body">' +
                            '<strong ng-if="alertData.info.title">{{alertData.info.title}}! </strong>' +
                            '{{alertData.info.message}}' +
                        '</div>' +
                    '</div>' +
                    '<div class="alert alert-danger" ng-show="alertData.error.show" ng-class="{\'slide-down\': dock == \'top\', \'slide-top\': dock == \'bottom\'}">' +
                        '<button type="button" class="close" aria-label="Close" ng-click="alertData.error.show=false;"><span aria-hidden="true">×</span></button>' +
                        '<div class="alert-body">' +
                            '<strong ng-if="alertData.error.title">{{alertData.error.title}}! </strong>' +
                            '{{alertData.error.message}}' +
                        '</div>' +
                    '</div>' +
                '</div>',
        link: function(scope, element, attrs) {
			var timer;

			var startTimer = function(timeout) {
				var time = timeout || 3000;
				timer = $timeout(function() {
					scope.alertData = {};
				}, time);
			}

			var handleChange = function(val) {
				if (val.show === true && typeof (val.timeout) !== 'undefined') {
					startTimer(val.timeout);
				} else {
					if (timer) $timeout.cancel(timer);
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

.directive('fitPage', ['$window', function($window) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var offset = attrs.offset ? parseInt(attrs.offset) | 0 : 0;
            
            var resize = function() {
                angular.element(element).css('height', ($window.innerHeight + offset) + 'px');
            }
            
            
            angular.element($window).bind('resize', resize);
            
            scope.$on('$destroy', function() {
                angular.element($window).unbind('resize', resize);
            })
            
            resize();
        }
    }
}])

.directive('dzWrapper', ['$window', function($window) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.addClass('wrapper');
            
            var resize = function() {
                angular.element(element).css('min-height', $window.innerHeight + 'px');
            }
            
            
            angular.element($window).bind('resize', resize);
            
            scope.$on('$destroy', function() {
                angular.element($window).unbind('resize', resize);
            })
            
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
			function handleUrl() {
				var imageObj = new Image();
				imageObj.addEventListener('load', function() {
					attrs.$set('src', imageObj.src);
				});
				imageObj.src = attrs.imgSrc;
				if (!imageObj.complete) {
					attrs.$set('src', attrs.imgLoad || '/static/img/dz_disc.png');
				}
			}
			
			function startObs() {
				attrs.$set('src', attrs.imgLoad || '/static/img/dz_disc.png');
                var stopObserving = attrs.$observe('imgSrc', function() {
                    stopObserving();
                    handleUrl();
                });
			}
			
			if (attrs.imgSrc) {
				handleUrl();
			} else {
				startObs();
			}
        }
    }    
}])

.directive('exploreCategory', ['$window', '$location', '_', 'QueryService', 
    function($window, $location, _, QueryService) {
        return {
            restrict: 'E',
            scope: true,
            template: '<div class="explore-category">' + 
                        '<div class="explore-cat-label dz-label">' + 
                            'Explore | <span class="dz-blue">{{fvalue}} Discs</span><span class="dz-blue hover-underline" style="float: right; cursor: pointer"><a ng-href="{{getLink()}}">See More...</a></span>' + 
                        '</div>' + 
                        '<div class="explore-cat-list">' + 
                            '<div class="explore-item" ng-repeat="disc in exploreList | startFrom:start | limitTo:dispCount" ng-click="navDisc(disc._id)">' +
								'<div class="explore-item-icon top-left for-sale"><i class="fa fa-usd"></i>{{disc[\'marketplace.value\'] | currency:"":2}}</div>' +
								'<div class="explore-item-icon top-right for-trade"><i class="fa fa-refresh"></i></div>' +
                                '<img img-src="{{getSolrPrimaryImage(disc)}}" img-load />' + 
                                '<div class="explore-item-title handle-overflow">{{disc.brand}} | <span class="dz-blue">{{disc.name}}</span></div>' + 
                            '</div>' + 
                            '<div class="clearfix"></div>' + 
                        '</div>' + 
                        '<div class="explore-nav" ng-show="$def(navArr) && navArr.length > 1" ng-init="page = 0">' + 
                            '<span>' + 
                                '<i class="fa fa-angle-double-left nav-list-arrow" ng-click="pageBack()" ng-class="{inactive: page == 0}"></i>' + 
                                '<i class="fa" ng-repeat="i in navArr track by $index" ng-click="navIndex($index)" ng-class="{active: start == $index * dispCount, \'fa-circle\': start == $index * dispCount, \'fa-circle-thin\': start != $index * dispCount}"></i>' + 
                                '<i class="fa fa-angle-double-right nav-list-arrow" ng-click="pageNext()" ng-class="{inactive: page == navArr.length - 1}"></i>' + 
                            '</span>' + 
                        '</div>' +
                    '</div>',
            replace: true,
            link: function(scope, element, attrs) {
                scope.fvalue = attrs.fvalue;
                scope.start = 0;
                scope.dispCount = Math.floor(element[0].clientWidth / 156);
                scope.exploreList = [];
                var filter = [];
                filter.push({
                    name: attrs.field,
                    fields: [attrs.fvalue]
                });
                
                scope.navDisc = function(id) {
                    $location.path('/d/' + id);
                }
                
                scope.getLink = function() {
                    return '/portal/explore?s=rel&f_0=' + attrs.field + ':' + attrs.fvalue;
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
                
                scope.getDisplayCount = function(){
                   scope.safeApply(function() {
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
                
                QueryService.queryAll({
                    query: '*',
                    sort: 'dAsc',
                    filter:filter,
                    limit: 20,
					marketplace: {
						forSale: true,
						forTrade: true
					},
                    group: {
                        limit: 20,
                        field: 'userId'
                    },
                }, function(success, response) {
                    if (success) {
                        for (var group in response.results) {
                            Array.prototype.push.apply(scope.exploreList, response.results[group]);
                        }
                        
                        scope.navArr = new Array(Math.ceil(scope.exploreList.length / scope.dispCount));
                    }
                });
            }
        }
    }])

.directive('dzModal', ['$compile', function($compile) {
	return {
		restrict: 'E',
		scope: {
			scrollLock: '=',
			modalOpts: '='
		},
		replace: true,
		template: '<div class="full-screen-backdrop no-select" ng-show="showModal">' +
					'<div class="dz-modal-container">' +
						'<i class="dz-modal-close fa fa-times" aria-hidden="true" ng-click="!childOpts.lock && (modalOpts.show = false)"></i>' +
						'<div id="dz-modal-inner"></div>' +
					'</div>' +
				  '</div>',
		link: function(scope, elem, attrs) {
			scope.childOpts = {
				lock: false,
				reload: false
			};
			
			scope.$watch('modalOpts.show', function(newVal) {
				if (typeof(newVal) === 'undefined')
					return;
				
				var inner = document.getElementById('dz-modal-inner');
				inner.innerHTML = '';
				
				if (!newVal) {
					scope.scrollLock = false;
					scope.showModal = false;
					if (typeof(scope.modalOpts.data.onClose) !== 'undefined') {
						scope.modalOpts.data.onClose(scope.childOpts.reload);
					}
					return;
				}
				
				var newModal = angular.element('<' + scope.modalOpts.type + ' data="modalOpts.data" show="modalOpts.show" lock="childOpts.lock" reload="childOpts.reload"></' + scope.modalOpts.type + '>');
				inner.appendChild(newModal[0]);
				$compile(newModal)(scope);
				scope.scrollLock = true;
				scope.showModal = true;
			});
		}
	}
}])

.directive('dzBumpModal', [function() {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '=',
			lock: '=',
			reload: '='
		},
		replace: true,
		template: '<div>' +
					'<div class="dz-modal-content">' +
						'<div class="dz-modal-title-sm">Bump Discs</div>' +
						'<div style="text-align:left;margin-bottom:5px;">The table below shows each bump status of the selected discs. Clicking "Bump" will automatically bump all available discs in the table below.</div>' +
						'<dz-alert class="full-width" alert-data="modalAlert"></dz-alert>' +
						'<modal-disc-table discs="data.discs" success-text="\'Bumped\'" default-text="\'Bump Ready\'" table-opts="tableOpts"></modal-disc-table>' +
					'</div>' +
					'<div class="dz-modal-btn-container" style="background-color: #BEBEBE">' +
						'<div class="dz-modal-triangle"></div>' +
						'<div class="dz-modal-btn loading" ng-show="opts.loading"><i class="fa fa-spinner fa-spin fa-lg"></i></div>' +
						'<div class="dz-modal-btn cancel" ng-show="!opts.loading" ng-click="show = false">Close</div>' +
						'<div class="dz-modal-btn btn-blue" ng-click="confirm()" ng-show="!opts.loading">Bump</div>' +
					'</div>' +
				'</div>',
		link: function(scope, elem, attrs) {
			scope.tableOpts = {
				isCounter: true
			};
			scope.opts = {};
			scope.modalAlert = {};
			
			scope.confirm = function() {
				
			}
		}
	}
}])

.directive('dzTagModal', ['_', '$timeout', 'APIService', function(_, $timeout, APIService) {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '=',
			lock: '=',
			reload: '='
		},
		replace: true,
		template: '<div>' +
					'<div class="dz-modal-content">' +
						'<div class="dz-modal-title-sm">Multi-select Tag Manager</div>' +
						'<div style="text-align:left;margin-bottom:5px;">Tags shown below are common to all selected discs. Use this window to add and remove tags to/from multiple discs at once. When saved, all tags in this list will be added to the discs below.</div>' +
						'<dz-alert class="full-width" alert-data="tagAlert"></dz-alert>' +
						'<div ng-show="opts.loading" style="line-height:105px;"><i class="fa fa-spinner fa-spin fa-3x"></i></div>' +
						'<div ng-show="!opts.loading">' +
							'<div style="position:relative;">' +
								'<input type="text" class="dz-modal-tag-input" placeholder="Enter tag and press enter..." ng-model="tempTag" ng-model-options="{\'updateOn\':\'default blur\',\'debounce\':{\'default\':0,\'blur\':0}}" ng-enter="pushTempTag();" directive-on="opts.isShowing" directive-set="{\'dz-auto-complete\':\'tag\'}" user-id="data.user" dz-multi="true" >' +
							'</div>' +
							'<div class="dz-modal-tag-container">' +
								'<li class="tag-item" ng-repeat="tag in newTags">' +
									'<div>{{tag}}<span class="tag-item-remove" ng-click="removeNewTag($index)"><i class="fa fa-times"></i></span></div>' +
								'</li>' +
							'</div>' +
							'<div style="text-align:left;">' +
								'<span style="margin-right:5px;">' +
									'<i class="fa fa-square-o hover-pointer" ng-show="!opts.overwrite" aria-hidden="true" ng-click="opts.overwrite = !opts.overwrite"></i>' +
									'<i class="fa fa-check-square-o hover-pointer" ng-show="opts.overwrite" aria-hidden="true" ng-click="opts.overwrite = !opts.overwrite"></i>' +
								'</span>' +
								'<span class="hover-pointer" ng-click="opts.overwrite = !opts.overwrite">Overwrite Tags</span>' +
								'<span><i class="fa fa-question-circle hover-pointer" aria-hidden="true" style="margin-left:4px;" ng-click="showOverwriteAlert()"></i></span>' +
							'</div>' +
						'</div>' +
						'<dz-alert class="full-width" alert-data="overwriteAlert" style="text-align:left;"></dz-alert>' +
						'<modal-disc-table discs="data.discs" success-text="\'Saved\'" default-text="\'Unchanged\'"></modal-disc-table>' +
					'</div>' +
					'<div class="dz-modal-btn-container" style="background-color: #BEBEBE">' +
						'<div class="dz-modal-triangle"></div>' +
						'<div class="dz-modal-btn loading" ng-show="opts.loading"><i class="fa fa-spinner fa-spin fa-lg"></i></div>' +
						'<div class="dz-modal-btn cancel" ng-show="!opts.loading" ng-click="show = false">Close</div>' +
						'<div class="dz-modal-btn btn-blue" ng-click="opts.allowSave && confirm()" ng-show="!opts.loading" ng-class="{disabled:!opts.allowSave}">Save</div>' +
					'</div>' +
				'</div>',
		link: function(scope, elem, attrs) {
			var tempCommon = _.intersection.apply(_, (_.pluck(scope.data.discs, 'tag')));
			scope.newTags = tempCommon.slice();
			scope.tempTag = '';
			
			scope.opts = {};
			scope.modalAlert = {};
			scope.tagAlert = {};
			scope.overwriteAlert = {};
			
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
			
			scope.showOverwriteAlert = function() {
				scope.overwriteAlert.info = {
					message: 'Enabling this option will REPLACE all tags across all selected discs with the tag list shown above!',
					show: true
				}
			}
			
			scope.confirm = function() {
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
					
					APIService.Put('/discs/' + disc._id, {tagList: curList}, function(success, data) {
						if (success) {
							disc.success = true;
						} else {
							disc.error = true;
						}
						
						if (i < discs.length - 1) {
							updateDiscs(discs, i+1, finish);
						} else {
							finish();
						}
					});
				}
				
				scope.opts.loading = true;
				scope.reload = true;
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
				if (typeof(newVal) !== 'undefined' && newVal === true) {
					scope.opts.allowSave = true;
					scope.showOverwriteAlert();
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

.directive('dzDeleteDiscModal', ['DiscService', function(DiscService) {
	return {
		restrict: 'E',
		scope: {
			data: '=data',
			show: '=',
			lock: '=',
			reload: '='
		},
		replace: true,
		template: '<div>' +
					'<div class="dz-modal-content">' +
						'<i class="fa fa-5x fa-exclamation-triangle" style="color:#e85947"></i>' +
						'<div class="dz-modal-title-lg">Warning!</div>' +
						'<div class="dz-modal-message">Are you sure you want to permanently delete the selected discs?</div>' +
						'<dz-alert class="full-width" alert-data="modalAlert"></dz-alert>' +
						'<modal-disc-table discs="data.discs" success-text="\'Deleted\'" default-text="\'Unchanged\'"></modal-disc-table>' +
					'</div>' +
					'<div class="dz-modal-btn-container" style="background-color:#BEBEBE">' +
						'<div class="dz-modal-triangle"></div>' +
						'<div class="dz-modal-btn loading" ng-show="opts.loading"><i class="fa fa-spinner fa-spin fa-lg"></i></div>' +
						'<div class="dz-modal-btn cancel" ng-show="!opts.loading" ng-click="show = false">' +
							'<span ng-show="!reload">Cancel</span>' +
							'<span ng-show="reload">Close</span>' +
						'</div>' +
						'<div class="dz-modal-btn" ng-show="!opts.loading && !reload" ng-click="!opts.loading && confirm()" style="background-color: #e85947">Delete</div>' +
					'</div>' +
				'</div>',
		link: function(scope, elem, attrs) {
			scope.opts = {};
			scope.modalAlert = {};
			
			scope.confirm = function() {
				var deleteDiscs = function(discs, i, finish) {
					var disc = discs[i];
					
					DiscService.deleteDisc(disc, function(success, data) {
						if (success) {
							disc.success = true;
						} else {
							disc.error = true;
						}
						
						if (i < discs.length - 1) {
							deleteDiscs(discs, i+1, finish);
						} else {
							finish();
						}
					});
				}
				
				scope.opts.loading = true;
				scope.reload = true;
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

.directive('modalDiscTable', ['_', 'QueryService', 'APIService', function(_, QueryService, APIService) {
	return {
		restrict: 'E',
		scope: {
			discs: '=',
			successText: '=',
			defaultText: '=',
			tableOpts: '='
		},
		replace: true,
		template: '<div class="dz-modal-table">' +
					'<div class="dz-modal-row header">' +
						'<div class="dz-modal-row-item header">Disc</div>' +
						'<div class="dz-modal-row-item header">Status</div>' +
						'<div class="clearfix"></div>' +
					'</div>' +
					'<div class="dz-modal-row" ng-repeat="disc in discs">' +
						'<div class="dz-modal-row-item handle-overflow disc">' +
							'<img ng-src="{{getSolrPrimaryImage(disc)}}" />' +
							'{{disc.brand}} {{disc.name}}' +
						'</div>' +
						'<div class="dz-modal-row-item handle-overflow">' +
							'<span ng-if="tableOpts.isCounter" directive-on="disc.countdown.init" directive-set="{countdown:\'\'}" sec-left="disc.countdown.bumpRemaining" counts="disc.countdown.counts" done="disc.countdown.bumpReady" show="disc.countdown.show">' +
								'<span ng-show="disc.countdown.show && !disc.countdown.bumpReady"><span ng-bind="disc.countdown.counts.hours"></span> : <span ng-bind="disc.countdown.counts.minutes"></span> : <span ng-bind="disc.countdown.counts.seconds"></span></span>' +
								'<span ng-show="disc.countdown.loading"><i class="fa fa-spinner fa-spin fa-lg"></i></span>' +
								'<span ng-show="disc.countdown.bumpReady" style="font-weight:bold;">{{defaultText}}</span>' +
								'<span ng-show="!disc[\'marketplace.forSale\'] && !disc[\'marketplace.forTrade\']" style="font-style:italic;">Not In Marketplace</span>' +
							'</span>' +
							'<span ng-if="!tableOpts.isCounter" ng-show="!disc.success && !disc.error">{{defaultText}}</span>' +
							'<span ng-show="disc.success"><i style="color:#4FC74F;" class="fa fa-check fa-tools" aria-hidden="true"></i>{{successText}}</span>' +
							'<span ng-show="disc.error"><i style="color:#E85947;" class="fa fa-times fa-tools" aria-hidden="true"></i>Error</span>' +
						'</div>' +
						'<div class="clearfix"></div>' +
					'</div>' +
				'</div>',
		link: function(scope, elem, attrs) {
			
			scope.getSolrPrimaryImage = function(disc) {
                return QueryService.getSolrPrimaryImage(disc);
            }
			
			scope.$watch('tableOpts.isCounter', function(newVal) {
				if (typeof(newVal) !== 'undefined' && newVal === true) {
					_.each(scope.discs, function(disc) {
						if (disc['marketplace.forSale'] || disc['marketplace.forTrade']) {
							disc.countdown = {};
							disc.countdown.loading = true;
							APIService.Get('/discs/' + disc._id, function(success, data) {
								if (!success) {
									disc.error = true;
								} else {
									disc.countdown.bumpRemaining = data.marketplace.bumpRemaining;
									disc.countdown.init = true;
								}
								disc.countdown.loading = false;
							});
						}
					});
				}
			});

// 				$scope.bumpDisc = function() {
// 					APIService.Put('/discs/' + $scope.disc._id + '/bump', {}, function(success, data) {
// 						if (success) {
// 							$scope.disc = data;
// 							updateTempMarket(data);
// 						} else {
// 							$scope.discAlert.error = {
// 								title: data.type,
// 								message: data.message,
// 								show: true
// 							}
// 						}
// 					});
// 				}
		}
	}
}])

.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keyup", function (event) {
            if(event.which === 13) {
				console.log('in ngenter');
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
 
                event.preventDefault();
            }
        });
    };
})

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
        $scope.pgSettings = {
			hasFooter: false,
			scrollLock: false
        };
        
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
.controller('PortalController', ['$scope', '$location', '$window', 'smoothScroll', 'PageUtils',
    function($scope, $location, $window, smoothScroll, PageUtils) {
        $scope.transform = 'rotate(0deg)';
        var topExplore = document.getElementById('explore-start');
        
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
            $scope.safeApply(function() {
                $scope.transform = 'rotate(' + x + 'deg)';
            });
        }
        
        angular.element(document).bind('scroll', updatePageIcon);
        
        $scope.$on('$destroy', function() {
            angular.element(document).unbind('scroll', updatePageIcon);
        });
    }
])

.controller('TrunksController', ['$scope', '$location', '$routeParams', '$window', '_', '$timeout', 'smoothScroll', 'QueryUserService', 'CacheService', 'AccountService', 'LocationService',
	function($scope, $location, $routeParams, $window, _, $timeout, smoothScroll, QueryUserService, CacheService, AccountService, LocationService) {
		var init = true;
        var reqSize = 20;
		var sortSet = false;
		var locationSearch = angular.element(document.getElementById('location-search'));
		var locationResults = document.getElementById('location-results');
		
        $scope.curUser = AccountService.getAccount();
        $scope.activeFilters = [];
		$scope.breadcrumbs = [];
        $scope.resultList = [];
        $scope.resultFilters = [];
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
						{text: $scope.geo.distance + ' ' + $scope.units}
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
						text: field,
						href: '/portal' + $location.path() + QueryService.getQueryString({
							query: $scope.searchParam,
							sort: sortSet ? $scope.sortParam : undefined,
							filter: filters,
							marketplace: $scope.marketplace
						})
					});
				});
				
				$scope.breadcrumbs.push(item);
			});
		}
        
        $scope.loadMore = function() {
            if ($scope.loading || init) return;
            
            if ($scope.resultList.length < $scope.pagination.total) {
                var nextStart = $scope.pagination.start + Math.min($scope.pagination.total - $scope.resultList.length, reqSize);
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
						console.log(results);
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
            }
            
            QueryUserService.queryAll({
                query: $scope.searchParam,
                sort: $scope.sortParam,
                start: $scope.pagination.start,
                limit: reqSize,
				geo: $scope.geo
            }, function(success, response) {
                    if (success) {
                        $scope.pagination.start = response.start;
                        $scope.pagination.total = response.total;
                        console.log(response);
                        
                        if (appendOnly) {
                            Array.prototype.push.apply($scope.resultList, response.results);
                        } else {
                            $scope.resultList = response.results;
                            $scope.resultFilters = response.facets;
                            console.log($scope.resultFilters);
                        }
                    }
					$scope.updateLocation();
                    $scope.loading = false;
                    $scope.loadingMore = false;
                });
        }
        
        $scope.resizeRes = function(){
            var resCont = document.getElementById('results-container');
            var resList = document.getElementById('results-list');
            $timeout(function() {
             angular.element(resList).css('width',  Math.floor(resCont.clientWidth / 206) * 206 + 'px');
            });
        }
		
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
		
		$scope.getLocation = function(distance) {
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
					$scope.sortParam = 'rel';
				}
				
				$scope.performSearch();
			});
		}
		
        $scope.$watch(function () { return $location.url(); }, function (url) {
            if (url && /^\/(trunks)/.test(url)) {
                var ret = QueryUserService.parseUrlQuery($location.search());
				var distanceSet = ret.geo && typeof(ret.geo.distance) !== 'undefined';
				var latSet = ret.geo && ret.geo.latitude && ret.geo.longitude;
                
                $scope.activeFilters = ret.filters;
                $scope.searchParam = ret.search;
                
                if (ret.sort) {
                    $scope.sortParam = ret.sort;
                } else if (ret.search.length) {
                    $scope.sortParam = 'rel';
                } else if (distanceSet || latSet) {
					$scope.sortParam = 'proximity';
				} else {
					$scope.sortParam = 'rel';
				}
				
				if (ret.geo) {
					if (ret.geo.latitude && ret.geo.longitude) {
						$scope.geo = {
							latitude: ret.geo.latitude,
							longitude: ret.geo.longitude,
							distance: ret.geo.distance
						}
						$scope.location.locSet = true;
						$scope.performSearch();
					} else if (distanceSet) {
						$scope.getLocation(ret.geo.distance);
					}
				} else {
					$scope.getLocation(undefined);
				}
            }
        });
        
        $scope.$on('$destroy', function() {
            angular.element($window).unbind('resize', $scope.resizeRes);
        });
		
		angular.element($window).bind('resize', $scope.resizeRes);
		
		init = true;
		
	}])

/******************************************************************************
* Name:         ExploreController
* Description:  Controller for explore functionality. 
*******************************************************************************/
.controller('ExploreController', ['$scope', '$location', '$routeParams', '$window', '$q', '_', '$timeout', 'QueryService', 
								  'CacheService', 'AccountService', 'DiscService', 'RedirectService',
    function($scope, $location, $routeParams, $window, $q, _, $timeout, QueryService, CacheService, AccountService, DiscService, RedirectService) {
        var init = true;
        var sortSet = false;
        var reqSize = 20;
        $scope.curUser = AccountService.getAccount();
        $scope.activeFilters = [];
		$scope.breadcrumbs = [];
        $scope.resultList = [];
        $scope.resultFilters = [];
        $scope.trunk = {};
		$scope.marketplace = {
			forSale: typeof($routeParams.username) === 'undefined',
			forTrade: typeof($routeParams.username) === 'undefined',
			all: typeof($routeParams.username) !== 'undefined'
		}
        $scope.pagination = { start: 0, total: 0 };
        
        $scope.searchParam = '';
        $scope.sortParam = 'createDate';
        
        $scope.loading = true;
        $scope.loadingMore = false;
		
		$scope.msOpts = {
			active: false,
			count: 0
		};
		
		$scope.alertOpts = {};
		
		$scope.msOpts.selectAll = function() {
			$scope.msOpts.count = 0;
			_.each($scope.resultList, function(result) {
				result.selected = true;
				$scope.msOpts.count += 1;
			});
		}
		
		$scope.msOpts.deselectAll = function() {
			$scope.msOpts.count = 0;
			var results = _.where($scope.resultList, {selected: true});
			_.each(results, function(result) {
				result.selected = false;
			});
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
							if (reload) $scope.handleUrl();
							// delete all added properties from disc objects;
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
							if (reload) $scope.handleUrl();
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
							if (reload) $scope.handleUrl();
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
					{text: $scope.marketplace.forSale ? ($scope.marketplace.forTrade ? 'For Sale and Trade' : 'For Sale') : ($scope.marketplace.forTrade ? 'For Trade' : 'All Public')}
				]
			});
			
			var filters = [];
			_.each($scope.activeFilters, function(filter) {
				var item = { title: filter.text, links: []};
				var tempFilter = {name: filter.name, fields: []};
				filters.push(tempFilter);
				
				_.each(filter.fields, function(field) {
					tempFilter.fields.push(field);
					item.links.push({
						text: field,
						href: '/portal' + $location.path() + QueryService.getQueryString({
							query: $scope.searchParam,
							sort: sortSet ? $scope.sortParam : undefined,
							filter: filters,
							marketplace: $scope.marketplace
						})
					});
				});
				
				$scope.breadcrumbs.push(item);
			});
		}
        
        $scope.loadMore = function() {
            if ($scope.loading || init) return;
            
            if ($scope.resultList.length < $scope.pagination.total) {
                var nextStart = $scope.pagination.start + Math.min($scope.pagination.total - $scope.resultList.length, reqSize);
                $scope.pagination.start = nextStart;
                $scope.performSearch(true);
            }
        }
		
		$scope.startSearch = function() {
			$scope.activeFilters = [];
			$scope.updateUrl();
		}
        
        $scope.updateUrl = function() {
            $scope.pagination.start = 0;
            $location.url($location.path() + QueryService.getQueryString({
				query: $scope.searchParam,
				sort: sortSet ? $scope.sortParam : undefined,
				filter: $scope.activeFilters,
				marketplace: $scope.marketplace
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
        
        $scope.performSearch = function(appendOnly) {
            if (appendOnly) {
                $scope.loadingMore = true;
            } else {
                $scope.loading = true;
            }
            
            QueryService.queryAll({
                query: $scope.searchParam,
                sort: $scope.sortParam,
                filter: $scope.activeFilters,
                start: $scope.pagination.start,
                valueRange: true,
                limit: reqSize,
				marketplace: $scope.marketplace,
                userId: $scope.trunk.userId || undefined
            }, function(success, response) {
                    if (success) {
                        $scope.pagination.start = response.start;
                        $scope.pagination.total = response.total;
                        console.log(response);
                        
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
                            console.log($scope.resultFilters);
                        }
                        $scope.getUsers();
                    }
                    $scope.loading = false;
                    $scope.loadingMore = false;
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
        
        $scope.resizeRes = function(){
            var resCont = document.getElementById('results-container');
            var resList = document.getElementById('results-list');
            $timeout(function() {
             angular.element(resList).css('width',  Math.floor(resCont.clientWidth / 206) * 206 + 'px');
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
				facet: {
					name: 'tag',
                    limit: 2,
                    offset: 2
				}}, function(success, response) {
                    if (success) {
                        console.log(response);
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
        
		$scope.handleUrl = function() {
			var url = $location.url();
			
			if (url && /^\/(t\/|explore)/.test(url)) {
                var ret = QueryService.parseUrlQuery($location.search());
                
                $scope.activeFilters = ret.filters;
                $scope.searchParam = ret.search;
				if (ret.mode) {
					$scope.marketplace = {
						forSale: ret.mode == 'all-market' || ret.mode == 'sale',
						forTrade: ret.mode == 'all-market' || ret.mode == 'trade',
						all: ret.mode == 'all',
					}
				}
                
                if (ret.sort) {
                    $scope.sortParam = ret.sort;
                } else if (ret.search.length) {
                    $scope.sortParam = 'rel';
                }
				
				updateBreadcrumbs();
				
                if ($scope.msOpts && $scope.msOpts.active) $scope.msOpts.toggleMS();
				
                if (!init) $scope.performSearch();
            }
		}
		
        $scope.$watch(function () { return $location.url(); }, function (url) {
            $scope.handleUrl();
        });
        
        $scope.$on('$destroy', function() {
            angular.element($window).unbind('resize', $scope.resizeRes);
        })
    
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
        
        if ($routeParams.username) {
            CacheService.getUserByUsername($routeParams.username, function(success, user) {
                if (!success) {
                    return RedirectService.setRedirect('explore');
                }
                $scope.trunk.userId = user._id;
                $scope.trunk.user = user;
				$scope.statusHome = 't/' + user.username;
								
                init = false;
                $scope.performSearch();
            });
        } else {
            init = false;
			$scope.statusHome = 'explore';
        }
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
							   'APIService', 'CacheService', 'AccountService', 'DiscService', 'MessageService',
    function($scope, $location, $routeParams, $timeout, $window, _, APIService, CacheService, AccountService, DiscService, MessageService) {
        var discId = $routeParams.discId;
        $scope.breadcrumbs = [];
        
		$scope.bumpReady = false;
		$scope.isSaving = false;
        $scope.loading = true;
// 		$scope.editPrice = false;
		$scope.tempMarketplace = {};
		$scope.discAlert = {};
		
		var initUser = function() {
			$scope.breadcrumbs = [
				{title: 'Trunk', links: [{text: $scope.user.username, href:'/portal/t/' + $scope.user.username}]},
				{title: 'Disc', links: [{text: $scope.disc.brand + ' ' + $scope.disc.name}]},
			];
			$scope.userInit = true;
		}
		
		var refreshMarket = function() {
			AccountService.getAccountMarket(function(success, data) {
				if (success) {
					$scope.tempMarketplace.counts = data;
				} else {
					$scope.discAlert.error = {
						title: data.type,
						message: data.message,
						show: true
					}
				}
			});
		}
		
		var updateTempMarket = function(disc) {
			$scope.tempMarketplace.value = disc.marketplace.value;
			$scope.tempMarketplace.forSale = disc.marketplace.forSale;
			$scope.tempMarketplace.forTrade = disc.marketplace.forTrade;
			refreshMarket();
		}
		
        APIService.Get('/discs/' + discId, function(success, disc) {
            if (!success) {
                return $scope.nav();
            } else {
               	$scope.disc = disc;
				$scope.imageBlock = _.findWhere(disc.imageList, {_id: disc.primaryImage});
				$scope.discInit = true;
				
				if ($scope.givePermission()) {
					$scope.user = AccountService.getAccount();
					updateTempMarket(disc);
					initUser();
				} else{
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
            $scope.loading = false;
        });
		
		$scope.bumpDisc = function() {
			APIService.Put('/discs/' + $scope.disc._id + '/bump', {}, function(success, data) {
				if (success) {
					$scope.disc = data;
					updateTempMarket(data);
					$scope.bumpReady = false;
				} else {
					$scope.discAlert.error = {
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
					value: $scope.tempMarketplace.value,
					forSale: $scope.tempMarketplace.forSale,
					forTrade: $scope.tempMarketplace.forTrade
				}
			};
			
			DiscService.editDisc(tempDisc, function(success, disc) {
				if (success) {
					$scope.disc = disc;
					$scope.bumpReady = false;
					updateTempMarket(disc);
					$scope.discAlert.success = {
						title: 'Success',
						message: 'Marketplace options have been updated successfully.',
						show: true,
						timeout: 3000
					}
					$scope.isSaving = false;
				} else {
					$scope.discAlert.error = {
						title: 'Error',
						message: 'Unable to update marketplace options.',
						show: true
					}
					$scope.isSaving = false;
				}
			});
		}
		
		$scope.initMessage = function() {
			MessageService.setAttachment(MessageService.TypeDisc, $scope.disc._id);
			$location.path('/inbox').search('userId', $scope.user._id);
		}
		
        $scope.setImage = function(img) {
            $scope.imageBlock = img;
		}
		
		$scope.isDirty = function() {
			return $scope.tempMarketplace.value != $scope.disc.marketplace.value ||
					$scope.tempMarketplace.forSale != $scope.disc.marketplace.forSale ||
					$scope.tempMarketplace.forTrade != $scope.disc.marketplace.forTrade;
		}
		
        $scope.givePermission = function() {
            return AccountService.compareTo($scope.disc.userId);
        }
    }
])

/******************************************************************************
* Name:         DiscTemplateController
* Description:  Controller for disc template search
*******************************************************************************/
.controller('DiscTemplateController', ['$scope', '$window', '$routeParams', '$timeout', '_', 'APIService', 
    function($scope, $window, $routeParams, $timeout, _, APIService) {
        
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
             angular.element(resList).css('width',  Math.floor(resCont.clientWidth / 208) * 208 + 'px');
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
.controller('ModifyDiscController', ['$compile', '$scope', '$routeParams', '$location', '$timeout', '_', 'smoothScroll', '$ocLazyLoad', 'APIService', 'ImageService', 'AccountService', 'DiscService', 
    function($compile, $scope, $routeParams, $location, $timeout, _, smoothScroll, $ocLazyLoad, APIService, ImageService, AccountService, DiscService) {
        if (!AccountService.isLoggedIn()) {
            return $location.path('/login');
        }
        
        var discId = $routeParams.discId;
        var templateId = $routeParams.templateId;
        var topEdit = document.getElementById('disc-edit');
		var dropzoneTemplate = '<div class="image-item-container image-template">' +
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
                
        $scope.editAlert = {}
		$scope.account = AccountService.getAccount();
		
		$scope.clearForm = function() {
			$scope.disc = {_id: $scope.disc._id, visible: true, tagList: [], imageList: []};
			$scope.editAlert = {}
			$scope.discForm.$setPristine();
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
        
        $scope.dropzoneConfig = {
            options: {
                url: '/api/images',
                method: "POST",
                thumbnailWidth: 100,
                thumbnailHeight: 100,
                parallelUploads: 10,
                maxFiles: 10,
                paramName: 'discImage',
                previewTemplate: dropzoneTemplate,
                acceptedFiles: "image/*",
                autoProcessQueue: true,
                previewsContainer: '#dropzone-previews',
                clickable: '#add-image',
                accept: function(file, done) {
                    if (this.files[10] != null) {
                        return this.removeFile(this.files[10]);
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
                    ImageService.getDataUri(file, function(dataUri) {
                        $scope.discImageCropper.showCropper(file.name, dataUri);
                    });
                    
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
            }
        }
        
        var scrollTop = function() {
            var options = {
                duration: 300,
                easing: 'easeInQuad'
            }
            
            smoothScroll(topEdit, options);
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
			
            if ($scope.disc._id) {
				DiscService.editDisc($scope.disc, function(success, disc) {
                    if (success) {
                        $scope.disc = disc;
                        $scope.editAlert.success = {
                            title: 'Success',
                            message: disc.brand + ' ' + disc.name + ' has been updated successfully.',
                            show: true
                        }
                        scrollTop();
						$scope.discForm.$setPristine();
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
                        $scope.disc = undefined;
                        $scope.editAlert.success = {
                            title: 'Success',
                            message: disc.brand + ' ' + disc.name + ' has been created successfully.',
                            show: true
                        }
                        scrollTop();
						$scope.discForm.$setPristine();
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
                '/static/js/dropzone.js'
                ]).then(function() {
                    $ocLazyLoad.load([
                        '/static/js-dist/cropper.min.js',
                        {type: 'css', path: 'https://cdn.rawgit.com/fengyuanchen/cropperjs/master/dist/cropper.min.css'}
                    ]).then(function() {
                            $scope.settings.dropzoneReady = true;
                        });
                });
        } else {
            $scope.settings.dropzoneReady = true;
        }
		
		$scope.breadcrumbs = [
			{title: 'Trunk', links: [{text: $scope.account.username, href:'/portal/t/' + $scope.account.username}]}
		];
        
        if (typeof(discId) !== 'undefined') { // Edit Mode
            APIService.Get('/discs/' + discId, function(success, disc) {
                if (!success) {
                    return $scope.nav();
                } else {
					console.log(disc);
					if (!AccountService.compareTo(disc.userId)) {
                        return $scope.nav();
                    }
                    
                    $scope.disc = disc;
					
					$scope.breadcrumbs.push({title: 'Disc', links: [{text: disc.brand + ' ' +  disc.name + ' ' + '(#' + discId + ')', href: '/portal/d/' + discId}]});
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
								  'SocketUtils', 'PageUtils', 'CacheService', 'Random', 'MessageService',
    function($scope, $location, $timeout, $q, _, smoothScroll, APIService, AccountService, SocketUtils, PageUtils, CacheService, Random, MessageService) {
			if (!AccountService.isLoggedIn()) {
					return $location.path('/login');
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
				{title: 'Trunk', links: [{text: $scope.account.username, href:'/portal/t/' + $scope.account.username}]},
				{links: [{text: 'Inbox'}]},
			];
			
			$scope.scrollBottom = function() {
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
					var height = PageUtils.getWindowHeight();
					var rectTop = PageUtils.getTop(inboxArea);
					angular.element(inboxArea).css('height', (height - rectTop - 10) + 'px');
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
					if (success && user.image) {
						thread.image = user.image;
						thread.user = user;
						thread.imgInit = true;
					} else {
						// HANDLE ERROR
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
			
			var setThreadRead = function(thread) {
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
				return '?count=20' + ($scope.activeThread.refId ? '&refId=' + $scope.activeThread.refId : '');
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
				if (typeof($scope.activeThread) !== 'undefined') {
					if ($scope.activeThread.newThread) {
						return;
					}
					
					if (firstLoad) {
						if ($scope.activeThread.messages.length) {
							setThreadRead($scope.activeThread);
							return;
						}
						
						$scope.activeThread.refId = undefined;
					}
					
					APIService.Get('/threads/' + $scope.activeThread.threadId + '/messages' + buildMessageReq(), function(success, messages) {
						if (success) {
							$scope.activeThread.messages.push.apply($scope.activeThread.messages, messages);
							$scope.activeThread.refId = messages.length ? messages[messages.length - 1]._id : undefined;
							
							$scope.activeThread.messageCount = $scope.activeThread.currentMessageCount;
							
							if (firstLoad && !$scope.activeThread.active) {
								$scope.messageAlert.info = {
									title: 'Read-Only',
									message: 'Unarchive this conversation to continue sending messages.',
									show: true,
									timeout: 5000
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
								$scope.userMessage = '';
								attachments.forEach(function(attachment) {
									$scope.userMessage += $location.host() + '/portal/' + attachment.type + '/' + attachment.id + '\r\n';
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
.controller('AccountController', ['$scope', '$location', '$window', 'AccountService', 'APIService', 'FacebookUtils',  
    function($scope, $location, $window, AccountService, APIService, FacebookUtils) {
			if (!AccountService.isLoggedIn()) {
				return $location.path('/login');
			}
		
			$scope.account = AccountService.getAccount();
			$scope.tempAccount = {};
			$scope.location = {
				curLocation: $scope.account.longLocation
			}
		
			$scope.doFbLink = function() {
				FacebookUtils.link(function(success, data) {
					if (success) {
						console.log('linked!!');
						account = data;
					}
					
					console.log(data);
				});
			}
			
			$scope.doFbUnlink = function() {
				FacebookUtils.unlink(function(success, data) {
					if (success) {
						console.log('unlinked!!');
						account = data;
					}
					
					console.log(data);
				});
			}
			
			$scope.doDelete = function() {
				AccountService.doAccountDelete(function(success, data) {
					if (success) {
						
					}
					
					console.log(data);
				});
			}
			
			$scope.cloneAccount = function() {
				$scope.tempAccount = {
					firstName: $scope.account.firstName,
					lastName: $scope.account.lastName
				}
			}
			
			$scope.cloneAccount();
    }
])

/******************************************************************************
* Name:         AccountController
* Description:  Handles account preferences and settings. 
*******************************************************************************/
.controller('AccountUpgradeSelController', ['$scope', '$location', '$window', 'AccountService', 'APIService', 'MembershipService', 'TempStore', 
    function($scope, $location, $window, AccountService, APIService, MembershipService, TempStore) {
		if (!AccountService.isLoggedIn()) {
			return $location.path('/login');
		}

		$scope.account = AccountService.getAccount();
		
		$scope.selUpgrade = function(type) {
			$location.url('/account/upgrade/payment?key=' + TempStore.setTemp(type));
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
.controller('AccountUpgradeController', ['$scope', '$location', '$window', 'smoothScroll', 'AccountService', 'APIService', 'MembershipService', 'TempStore', 
    function($scope, $location, $window, smoothScroll, AccountService, APIService, MembershipService, TempStore) {
		if (!AccountService.isLoggedIn()) {
			return $location.path('/login');
		}

		$scope.account = AccountService.getAccount();
		$scope.form = {
			showConfirm: true
		};
		$scope.billing = {};
		$scope.paypalConfig = {};
		$scope.upgradeAlert = {};
		
		$scope.type = TempStore.getTemp($location.search().key);
		if (typeof($scope.type) === 'undefined') {
			return $location.path('/account/upgrade');
		}
		
		$scope.showBilling = function() {
			$scope.form = {
				showBilling: true
			};
			
			var billing = document.getElementById('billing-container');

			var options = {
				duration: 200,
				easing: 'easeInQuad',
				offset: 50
			}

			smoothScroll(billing, options);
		}
		
		$scope.showPayment = function() {
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
			
			$scope.paypalLoading = true;
			APIService.PostExt('/membership', '/create', {
				type: $scope.type,
				billing: $scope.billing
			}, function(success, request) {
				if (success) {
					console.log(request);
					$scope.paypalConfig.params = {
						src: 'https://payflowlink.paypal.com?MODE=TEST&SECURETOKENID=' + request.secureTokenId + '&SECURETOKEN=' + request.secureToken,
						width: '490',
						height: '565',
						border: '0',
						frameborder: '0',
						scrolling: 'no',
						allowtransparency: 'true'
					}
					$scope.paypalConfig.create = true;
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
		
// 		$scope.accountMethod = MembershipService.getChangeType($scope.account.accountType, $scope.type);
		$scope.accountMethod = 'no-profile';
		if (typeof($scope.accountMethod) === 'undefined')
			return $location.path('/account/upgrade');
		
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
.controller('AccountUpgradeResultController', ['$scope', '$location', '$window', '$timeout', 'AccountService', 'APIService', 'MembershipService', 'TempStore', 
    function($scope, $location, $window, $timeout, AccountService, APIService, MembershipService, TempStore) {
		if (!AccountService.isLoggedIn()) {
			return $location.path('/login');
		}
		
		console.log($location.search());
		
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
				return $location.path('/account/upgrade');
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
			return $location.path('/login');
		}
		
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
		
		var updateAccount = function(data) {
			AccountService.updateAccount(data);
			$scope.account = data;
		}
		
		$scope.$watch('fb.active', function(newVal) {
			$scope.fb.pristine = newVal === (typeof($scope.account.fbId) !== 'undefined');
		});
		
		$scope.setFBVerification = function() {
			APIService.Put('/account/permissions', {
				showFacebookId: $scope.fb.active
			}, function(success, data) {
				if (success) {
					updateAccount(data);
					
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
			VerificationService.resetPDGA(function(success, data) {
				if (success) {
					updateAccount(data);
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
			VerificationService.verifyPDGA($scope.pdga.username, $scope.pdga.password, function(success, data) {
				if (success) {
					AccountService.updateAccount(data);
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
					return $location.path('/explore');
				}
				
				if (err) {
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
					return $location.path('/explore');
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
.controller('SignupController', ['$scope', '$location', '$window', '$timeout', 'AccountService', 'APIService', 'LocationService', 'FacebookUtils', 
	function($scope, $location, $window, $timeout, AccountService, APIService, LocationService, FacebookUtils) {
		if (AccountService.isLoggedIn()) {
			return $location.path('/account');
		}
		
		var formats = {
			userLength: /^.{6,15}$/,
			userChars: /^[a-zA-Z0-9\_]+$/,
			pwLength: /^.{6,}$/
		}
		
		$scope.loading = false;
		$scope.signup = {};
		$scope.signupAlert = {};
		$scope.location = {
			results: [],
			loading: false,
			locSet: false,
			geo: {}
		};
		
		var updatePostalCode = function(lat, lng) {
			LocationService.getReverseGeo(lat, lng, function(success, results) {
				if (success && results.length) {
					$scope.location.curLocation = results[0].address;
					$scope.location.geo = {
						latitude: results[0].latitude,
						longitude: results[0].longitude
					}
				}
			}, true);
		}
		
		$scope.getFBAccount = function() {
			FacebookUtils.getFBAccount(function(success, data) {
				if (success) {
					APIService.Post('/validate/facebook', {userID: data.token.userID}, function(success, user) {
						if (success) {
							if (!user._id) {
								$timeout(function() {
									$scope.signup.firstName = data.account.first_name;
									$scope.signup.form.firstName.$setDirty();

									$scope.signup.lastName = data.account.last_name;
									$scope.signup.form.lastName.$setDirty();

									$scope.signup.email = data.account.email;
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
		
		$scope.itemSelected = function() {
			$scope.setLocation($scope.location.results[$scope.location.selResult]);
		}
		
		$scope.hideLocResults = function() {
			$timeout(function() {
				$scope.location.editable = false;
				$scope.location.loading = false;
				$scope.location.selResult = -1;
			}, 300);
		}
		
		$scope.setLocation = function(result) {
			$scope.location.editable = false;
			updatePostalCode(result.latitude, result.longitude);
		}
		
		$scope.$watch('location.search', function(newLoc) {
			$scope.location.selResult = -1;
			if (newLoc && newLoc.length > 3) {
				$scope.location.loading = true;
				LocationService.getGeoLocation(newLoc, function(success, results) {
					if (success) {
						console.log(results);
						$scope.location.results = results;
						$scope.location.selResult = -1;
					} else {
						$scope.location.results = [];
					}
					$scope.location.loading = false;
				}, ['postal_code']);
			} else {
				$scope.location.results = [];
			}
		});
		
		$scope.matchFormat = function(param, format) {
			if (!$scope.signup[param]) return false;
			if (!formats[format]) return false;
			
			return formats[format].test($scope.signup[param]);
		}
		
		$scope.doSignUp = function() {
			$scope.loading = true;
			$scope.signupAlert = {};
			APIService.Post('/users', {
				username: $scope.signup.username,
				email: $scope.signup.email,
				firstName: $scope.signup.firstName,
				lastName: $scope.signup.lastName,
				password: $scope.signup.password,
				locLat: $scope.location.geo.latitude,
				locLng: $scope.location.geo.longitude,
				facebook: $scope.facebook
			}, function(success, data) {
				$scope.loading = false;
				
				if (success) {					
					$scope.signupAlert.success = {
						title: 'Signup Successful',
						message: 'A confirmation email has been sent to ' + data.email + '.',
						show: true
					}
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
			return $location.path('/account');
		}
		
		$scope.confirmAlert = {};
		$scope.loading = true;
		
		$scope.confirmAlert.error = {}
		
		AccountService.doAccountConfirm($routeParams.authorizationId, function(success, err) {
			if (success) {
				return $location.path('/explore');
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
			return $location.path('/redirect');
		}
		
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
			return $location.path('/redirect');
		}
		
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
		if (AccountService.isLoggedIn()) {
			return $location.path('/redirect');
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
			APIService.Post('/account/recover/' + $routeParams.authorizationId, {
				password: $scope.cred.password
			}, function(success, result) {
				if (success) {
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
	}
])

/******************************************************************************
* Name:         AboutController
* Description:  Handles verification of pdga account
*******************************************************************************/
.controller('AboutController', ['$scope', '$location', '$compile', '$timeout', 'AccountService', 'MembershipService', 
	function($scope, $location, $compile, $timeout, AccountService, MembershipService) {
		$scope.account = AccountService.getAccount();
		
		$scope.getAccountType = function(type) {
			return MembershipService.getAccountName(type);
		}
		
		$scope.getAccountCost = function(type) {
			return MembershipService.getAccountCost(type);
		}
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

