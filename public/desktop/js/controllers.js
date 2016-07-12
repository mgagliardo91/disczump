angular.module('disczump.controllers', ['disczump.services'])

.filter('startFrom', function() {
    return function(input, start) {
        if(input) {
            start = +start; //parse to int
            return input.slice(start);
        }
        return [];
    }
})

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

.directive('dzAutoComplete', ['$compile', 'QueryService', '$timeout', function($compile, QueryService, $timeout) {
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
				ac.innerHTML = '<li ng-repeat="result in results track by $index" ng-class="{\'active\':activeIndex == $index}" ng-click="setInput(result.val)">{{result.val}}</li>';
				elem[0].parentNode.insertBefore(ac, elem[0].nextSibling);
				ac = angular.element(ac);
				ac.attr('ng-show', 'results.length && active');
				$compile(ac)(scope);
				resizeAC();
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
                        scope.results = response.facets.dynFilters[attrs.dzAutoComplete].filters;
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
				}
				
			}
			
			var inputBlur = function() {
				$timeout(function() {
					scope.active = false;
				}, 100);
			}
			
			var handleKey = function(evt) {
				switch(evt.keyCode) {
					case 13: {
						if (scope.activeIndex > -1) {
							scope.setInput(scope.results[scope.activeIndex].val);
							evt.stopPropagation();
						}
						break;
					}
					case 38: {
						$timeout(function() {
							scope.activeIndex = Math.max(-1, scope.activeIndex - 1);
							console.log(scope.activeIndex);
						});
						break;
					}
					case 40: {
						$timeout(function() {
							scope.activeIndex = Math.min(scope.results.length - 1, scope.activeIndex + 1);
							console.log(scope.activeIndex);
						});
						break;
					}
				}
			}
			
			angular.element(window).bind('resize', resizeAC);
			elem.bind('focus', inputFocus);
			elem.bind('blur', inputBlur);
			elem.bind('keyup', handleKey);
			
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
					'<img img-load directive-on="init" directive-set="{\'ng-src\':\'{{image}\}\'}"/>{{title}}' +
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
.directive('dzHeader', ['$window', '$location', 'PageUtils', function($window, $location, PageUtils) {
    return {
        restrict: 'E',
        scope: {
            user: "="
        },
        replace: true,
        template: '<div class="dz-navbar min-window-width" ng-class="{\'fixed\':fixed}" ng-style="{\'background-color\':\'rgba(74,74,74,\' + (alphaValue/ 100) +\')\'}">' +
                        '<div class="dz-navbar-btn-container float-left">' +
                            '<div class="dz-navbar-btn-list">' +
                                '<a href="/" ng-style="{\'opacity\': alphaValue}"><img src="/static/logo/logo_text.svg" class="dz-navbar-logo"></a>' +
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
                                    '<li><a href="#" id="menu-tutorial"><span><i class="fa fa-info-circle fa-tools"></i></span>Tutorial</a></li>' +
                                    '<li><a href="#"><span><i class="fa fa-question-circle fa-tools"></i></span>FAQ</a></li>' +
                                    '<li><a href="#" id="menu-feedback"><span><i class="fa fa-comment fa-tools"></i></span>Feedback</a></li>' +
                                    '<li><a href="/logout" data-ajax="false"><span><i class="fa fa-sign-out fa-tools"></i></span>Logout</a></li>' +
                                '</ul>' +
                                '<div class="dz-navbar-links">' +
                                    '<a class="dz-navbar-item dz-navbar-btn" href="/portal/explore" ng-class="{\'active\':isItemActive(\'explore\')}">Explore</a>' +
                                    '<a class="dz-navbar-item dz-navbar-btn" ng-if="user" ng-href="/portal/trunk/{{user._id}}" ng-class="{\'active\':isItemActive(\'trunk/{{user._id}}\')}">My Trunk</a>' +
                                    '<a class="dz-navbar-item dz-navbar-btn" ng-if="user" ng-href="/portal/inbox" ng-class="{\'active\':isItemActive(\'inbox\')}">Inbox</a>' +
                                    '<a class="dz-navbar-item dz-navbar-btn" href="/login" ng-if="!user">Sign In</a>' +
                                    '<a class="dz-navbar-item dz-navbar-btn" href="/signup" ng-if="!user">Sign Up</a>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="clearfix"></div>' +
                    '</div>',
        link: function(scope, element, attrs) {
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
                return scope.user.image || '/static/logo/logo_small_faded.svg';
            }
            
            scope.isItemActive = function(item) {
                return $location.url().indexOf(item) >= 0;
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
            
        }
    }
}])

.directive('dzProfile', ['$window', '$timeout', 'CacheService', function($window, $timeout, CacheService) {
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
														'<div class="p-icon-text align-vmid">' +
															'<div class="p-icon-style"><i class="fa fa-envelope"></i></div>' +
															'<div class="p-icon-label">Message</div>' +
														'</div>' +
													'</div>' +
												'</div>' +
												 '<div class="profile-card p-icon-button" ng-if="currentUser != userId">' +
													'<div class="p-container">' +
														'<div class="p-icon-text align-vmid">' +
															'<div class="p-icon-style"><i class="fa fa-user-plus"></i></div>' +
															'<div class="p-icon-label">Follow</div>' +
														'</div>' +
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
											'<div ng-style="contStyle" class="card-list">' + 
												'<div class="profile-card p-loc scale-fade" ng-show="(start < 1 && (showCount + start) >= 1)">' +
													'<div class="p-container">' +
														'<div class="align-vmid" id="map-parent">' +
															'<div id="map"></div>' +
														'</div>' +
													'</div>' +
												'</div>' +
												'<div class="profile-card p-count scale-fade" ng-show="start < 2 && (showCount + start) >= 2">' +
													'<div class="p-container">' +
														'<div class="p-count-text align-vmid">' +
															'<div class="p-count-data">{{user.discCount}}</div>' +
															'<div class="p-count-label">Public Discs</div>' +
														'</div>' +
													'</div>' +
												'</div>' +
												'<div class="profile-card p-icon p-cal scale-fade" ng-show="start < 3 && (showCount + start) >= 3">' +
													'<div class="p-container">' +
														'<div class="p-icon-text align-vmid">' +
															'<div class="p-icon-style shadow"><i class="fa fa-calendar"></i></div>' +
															'<div class="p-icon-label">Member Since {{user.dateJoined | date:\'MM/dd/yyyy\'}}</div>' +
														'</div>' +
													'</div>' +
												'</div>' +
												'<div class="profile-card p-icon p-pdga scale-fade" ng-if="user.pdgaNumber" ng-show="start < 4 && (showCount + start) >= 4">' +
													'<div class="p-container">' +
														'<div class="p-icon-text align-vmid">' +
															'<div class="p-icon-style shadow"><i class="fa fa-slack"></i></div>' +
															'<div class="p-icon-label"><a class="dz-blue-hover" target="_blank" ng-href="http://www.pdga.com/player/{{user.pdgaNumber}}">PDGA #{{user.pdgaNumber}}</a></div>' +
														'</div>' +
													'</div>' +
												'</div>' +
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
					var remainContainer = angular.element(document.getElementById('card-remain'));
					var map, marker;
					var init, loadTimer;
					
					scope.showCount = 0;
					scope.navArr = new Array(0);
					scope.start = 0;
					scope.contStyle = {};
					
					
					var setMarker = function() {
						marker = new google.maps.Marker({
							position: {lat: parseFloat(scope.user.locLat), lng: parseFloat(scope.user.locLng)},
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
					
					var initMap = function() {
						var mapContainer = document.getElementById('map');
						map = new google.maps.Map(mapContainer, {
							center: {lat: parseFloat(scope.user.locLat), lng: parseFloat(scope.user.locLng)},
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
								map.setCenter(new google.maps.LatLng(parseFloat(scope.user.locLat),  parseFloat(scope.user.locLng)));
								clearMarker();
								setMarker();
							});
						}
					}
					
					scope.navIndex = function(index) {
						scope.start = index;
						refreshMap();
					}
					
					scope.pageBack = function() {
						scope.start = Math.max(scope.start - 1, 0);
						refreshMap();
					}
					
					scope.pageNext = function() {
						scope.start = Math.min(scope.start + 1, scope.navArr.length - 1);
						refreshMap();
					}

					var resizeProfile = function() {
						$timeout(function(){
							scope.showCount = Math.floor((element[0].clientWidth - remainContainer[0].clientWidth) / 220);
							scope.navArr = new Array(Math.max(5 - scope.showCount, 0));
							scope.contStyle = { 'maxWidth': (scope.showCount * 220) + 'px' };
						});
					}

					if (typeof(scope.userId) !== 'undefined') {
							CacheService.getUser(scope.userId, function(success, user) {
									if (success) {
											scope.user = user;
										
										scope.$watch(function() { return remainContainer[0].clientWidth;}, function(val) {
											if (typeof(val) !== 'undefined') {
												resizeProfile();
											}
										});
										
										scope.$watch('showCount', function(newVal) {
											if (!init && newVal >= 1 && scope.start == 0) {
												loadTimer = $timeout(function() {
													initMap();
													init = true;
												}, 500);
												return;
											}
											
											if (!newVal && typeof(loadTimer) !== 'undefined') {
												$timeout.cancel(loadTimer);
											}
										});
									}
							});
					}

					scope.getAccountImage = function() {
							return scope.user ? scope.user.image : '/static/logo/logo_small_faded.svg';
					}
					
					angular.element($window).bind('resize', resizeProfile);

					scope.$on('$destroy', function() {
							angular.element($window).unbind('resize', resizeProfile);
							map = undefined;
							var mapParentContainer = document.getElementById('map-parent');
							mapParentContainer.removeChild(mapParentContainer.childNodes[0]);
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
            activeFilters: '=',
            onFilter: '&',
            hideOn: '='
        },
        template: '<div class="breadcrumb-container">' +
                    '<div class="pagination-container" title="Showing {{showCount}} of {{totalCount}} results" ng-show="$def(showCount)">' +
                        '{{showCount}} | <span class="dz-blue">{{totalCount}}</span>' +
                    '</div>' +
                    '<div class="breadcrumb-trail" ng-show="!hideOn">' +
                        '<span class="hover-underline" title="Explore Home" ng-show="activeFilters.length"><a href="/portal/explore"><i class="fa fa-home" style="font-size: 1.1em; color: #008edd"></i></a></span>' +
                        '<span class="breadcrumb-item-container" ng-repeat="filter in activeFilters">' +
                            '<span ng-if="!$def(filter.fields)">' + 
                                '<i class="fa fa-chevron-right" style="margin-right: 5px"></i>' +
                                '<span class="dz-blue hover-underline" ng-if="filter.href"><a href="{{filter.href}}">{{filter.text}}</a></span>'  +  
                                '<span ng-if="!filter.href">{{filter.text}}</span>' + 
                            '</span>' +
                            '<span ng-if="$def(filter.fields)"><i class="fa fa-chevron-right" style="margin-right: 5px"></i>{{filter.text}}:</span>' +
                            '<span ng-if="$def(filter.fields)" class="breadcrumb-item" ng-repeat="field in filter.fields">' +
                                '<span ng-if="$index > 0">|</span>' +
                                '<span class="dz-blue hover-underline" ng-click="callOnFilter(filter, field)">{{getFormattedField(field)}}</span>' +
                            '</span>' +
                        '</span>' +
                    '</div>' +
                    '<div class="clearfix"></div>' +
                '</div>',
        link: function(scope, element, attrs) {
            
            scope.$def = function(elem) {
                return (typeof(elem) !== 'undefined');
            }
            
            scope.callOnFilter = function(filter, field) {
                scope.onFilter({filter: filter, field: field});
            }
            
            scope.getFormattedField = function(field) {
                if (field === 'true') {
                    return 'Active';
                }
                
                return field;
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
            currentUser: '='
        },
        template: '<div class="grid-item">' +
                    '<div class="grid-item-icon top-left for-sale" ng-show="disc[\'marketplace.forSale\']">' +
                        '<i class="fa fa-usd"></i>' +
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
                                        '<div class="qi-item" ng-if="disc.type"><div>Type:</div><div class="handle-overflow">{{disc.type}}</div></div>' + 
                                        '<div class="qi-item" ng-if="disc.material"><div>Material:</div><div class="handle-overflow">{{disc.material}}</div></div>' + 
                                        '<div class="qi-item" ng-if="disc.color"><div>Color:</div><div class="handle-overflow">{{disc.color}}</div></div>' + 
                                        '<div class="qi-item" ng-if="disc.weight"><div>Weight:</div><div class="handle-overflow">{{disc.weight}}g</div></div>' + 
                                        '<div class="qi-item" ng-if="disc.condition"><div>Condition:</div><div class="handle-overflow">{{disc.condition}}/10</div></div>' + 
                                        '<div class="qi-item" ng-if="disc.speed"><div>Speed:</div><div class="handle-overflow">{{disc.speed}}</div></div>' + 
                                        '<div class="qi-item" ng-if="disc.glide"><div>Glide:</div><div class="handle-overflow">{{disc.glide}}</div></div>' + 
                                        '<div class="qi-item" ng-if="disc.turn"><div>Turn:</div><div class="handle-overflow">{{disc.turn}}</div></div>' + 
                                        '<div class="qi-item" ng-if="disc.fade"><div>Fade:</div><div class="handle-overflow">{{disc.fade}}</div></div>' + 
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
                            '<a ng-href="/portal/trunk/{{disc.user._id}}">{{disc.user.username}}</a>' +
                        '</div>' +
                        '<div class="grid-item-text float-right" ng-if="disc.weight">' +
                            '{{disc.weight}}g' +
                        '</div>' +
                        '<div class="clearfix"></div>' +
                    '</div>' +
                '</div>',
        link: function(scope, element, attrs) {
            scope.getSolrPrimaryImage = function(disc) {
                return QueryService.getSolrPrimaryImage(disc);
            }
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
			template:   '<div class="lb-backdrop no-select" ng-show="showLightbox">' +
											'<div class="lb-container">' +
												'<div id="lb-content" class="lb-image-block no-focus" tabindex="0">' +
													'<div id="lb-image-list" class="lb-image-list float-left fancy-scroll lite">' +
														'<img class="image-preview" ng-src="/files/{{img.thumbnailId}}" ng-repeat="img in imageList track by $index" ng-class="{active: index == $index}" ng-click="setImage($index)">' +
													'</div>' +
													'<img class="fit-parent" img-load ng-src="/files/{{imageList[index].fileId}}">' +
												'</div>' +
											'</div>' +
											'<div class="lb-x absolute-top-right">' +
												'<p class="lb-close" ng-click="trigger=false">×</p>' +
											'</div>' +
									'</div>',
			link: function(scope, element, attrs) {
				var lbContent = angular.element(document.getElementById('lb-content'));
				var lbImageList = angular.element(document.getElementById('lb-image-list'));
				var pad = 100;
				var padList = 85;
				var width = 0;
				var height = 0;
				scope.index = 0;
				scope.showLightbox = false;
				
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
						} else { //portrait
							width = $window.innerWidth - pad;
							height = width - padList;
							lbContent.css('height', height + 'px');
							lbContent.css('width', width + 'px');
							lbImageList.css('max-height', height + 'px');
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
                            '<strong>{{alertData.success.title}}! </strong>' +
                            '{{alertData.success.message}}' +
                        '</div>' +
                    '</div>' +
                    '<div class="alert alert-info" ng-show="alertData.info.show" ng-class="{\'slide-down\': dock == \'top\', \'slide-top\': dock == \'bottom\'}">' +
                        '<button type="button" class="close" aria-label="Close" ng-click="alertData.info.show=false;"><span aria-hidden="true">×</span></button>' +
                        '<div class="alert-body">' +
                            '<strong>{{alertData.info.title}}! </strong>' +
                            '{{alertData.info.message}}' +
                        '</div>' +
                    '</div>' +
                    '<div class="alert alert-danger" ng-show="alertData.error.show" ng-class="{\'slide-down\': dock == \'top\', \'slide-top\': dock == \'bottom\'}">' +
                        '<button type="button" class="close" aria-label="Close" ng-click="alertData.error.show=false;"><span aria-hidden="true">×</span></button>' +
                        '<div class="alert-body">' +
                            '<strong>{{alertData.error.title}}! </strong>' +
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
            var startLoad = function() {
                var src = attrs.src;
                if (src.indexOf('/logo/') > 0) return; 
                var imageObj = new Image();
                imageObj.src = src;
                imageObj.addEventListener('load', function() {
                    attrs.$set('src', imageObj.src);
                });
            }
            
            if (attrs.src) {
                    startLoad();
            } else {
                attrs.$set('src', attrs.imgLoad || '/static/logo/logo_small_faded.svg');
                var stopObserving = attrs.$observe('src', function() {
                    stopObserving();
                    startLoad();
                });
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
                                '<img ng-src="{{getSolrPrimaryImage(disc)}}" img-load />' + 
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
.controller('MainController', ['$rootScope', '$scope', '$location', 'AccountService', '_', 'APIService', 'QueryService', 'SocketUtils', 
    function($rootScope, $scope, $location, AccountService, _, APIService, QueryService, SocketUtils) {
        $scope.pgSettings = {
					hasFooter: false,
					scrollLock: false
        };
        
        $scope.account = {
            user: undefined
        };
        
        $scope.nav = function(url, replace) {
            console.log($location.path());
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
        
            return user.image ? user.image : '/static/logo/logo_small_faded.svg';
        }
        
        $scope.getPrimaryImage = function(disc) {
            if (disc.primaryImage) {
                var imgObj = _.findWhere(disc.imageList, {_id: disc.primaryImage});
                if (imgObj) {
                    return '/files/' + imgObj.fileId;
                }
            }
            return '/static/logo/logo_small_faded.svg';
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
				
        $rootScope.$on('AccountInit', function(event, data) {
            if (data.success) {
                $scope.account.user = AccountService.getAccount();
                // Handle account logged in
            }
        });
        
        $scope.init = function(uId) {
            AccountService.init(uId);
						if (uId) {
							SocketUtils.init();
						}
        }
        
        
    }
])

.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
 
                event.preventDefault();
            }
        });
    };
})


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

/******************************************************************************
* Name:         ExploreController
* Description:  Controller for explore functionality. 
*******************************************************************************/
.controller('ExploreController', ['$scope', '$location', '$routeParams', '$window', '_', '$timeout', 'QueryService', 'CacheService', 'AccountService', 
    function($scope, $location, $routeParams, $window, _, $timeout, QueryService, CacheService, AccountService) {
        var init = true;
        var sortSet = false;
        var reqSize = 20;
        $scope.curUser = AccountService.getAccount();
        $scope.activeFilters = [];
        $scope.resultList = [];
        $scope.resultFilters = [];
        $scope.trunk = {
            userId: $routeParams.userId
        };
        $scope.pagination = { start: 0, total: 0 };
        
        $scope.searchParam = '';
        $scope.sortParam = 'createDate';
        
        $scope.loading = true;
        $scope.loadingMore = false;
        
        $scope.loadMore = function() {
            if ($scope.loading || init) return;
            
            if ($scope.resultList.length < $scope.pagination.total) {
                var nextStart = $scope.pagination.start + Math.min($scope.pagination.total - $scope.resultList.length, reqSize);
                $scope.pagination.start = nextStart;
                $scope.performSearch(true);
            }
        }
        
        $scope.updateUrl = function() {
            $scope.pagination.start = 0;
            $location.url($location.path() + QueryService.getQueryString({
                    query: $scope.searchParam,
                    sort: sortSet ? $scope.sortParam : undefined,
                    filter: $scope.activeFilters
                }));
        }
        
        $scope.marketMode = function() {
            return _.some($scope.activeFilters, function(filter) {
                return filter.name == 'forSale' || filter.name == 'forTrade';
            });
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
        
        $scope.hasActiveFilters = function(facet) {
            var prop = _.find($scope.activeFilters, {name: facet.prop});
            
            return prop && prop.fields.length;
        }
        
        $scope.clearActiveFilters = function(facet, silent) {
            $scope.activeFilters = _.filter($scope.activeFilters, function(filter) { return filter.name != facet.prop });
            if (!silent) $scope.updateUrl();
        }
        
        $scope.navFilter = function(filter, field) {
            if (!filter) { // handle home
                $scope.activeFilters = [];
                $scope.updateUrl();
            } else {
                var filterIndex = $scope.activeFilters.indexOf(filter);
                
                if (filterIndex > -1) {
                    var fieldIndex = filter.fields.indexOf(field);
                    
                    if (fieldIndex > -1) {
                        filter.fields.splice(fieldIndex + 1, filter.fields.length - (fieldIndex + 1));
                    }
                    
                    $scope.activeFilters.splice(filterIndex + 1, $scope.activeFilters.length - (filterIndex + 1));
                    
                    $scope.updateUrl();
                }
            }
        }
        
        $scope.getFacets = function() {
            QueryService.queryFacet({
                query: $scope.searchParam,
                sort: $scope.sortParam,
                filter: $scope.activeFilters,
                userId: $scope.trunk.userId || undefined,
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
        
        $scope.$watch(function () { return $location.url(); }, function (url) {
            if (url && /^\/(trunk|explore)/.test(url)) {
                var ret = QueryService.parseUrlQuery($location.search());
                
                $scope.activeFilters = ret.filters;
                $scope.searchParam = ret.search;
                
                if (ret.sort) {
                    $scope.sortParam = ret.sort;
                } else if (ret.search.length) {
                    $scope.sortParam = 'rel';
                }
                
                if (!init) $scope.performSearch();
            }
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
			
        angular.element($window).bind('resize', $scope.resizeRes);
        
        if ($routeParams.userId) {
            CacheService.getUser($scope.trunk.userId, function(success, user) {
                if (!success) {
                    return $scope.nav();
                }
                
                $scope.trunk.user = user;
								
                init = false;
                $scope.performSearch();
            });
        } else {
            init = false;
        }
    }
])

.controller('RedirectController', ['$scope', '$timeout', 'RedirectService',
    function($scope, $timeout, RedirectService) {
        $timeout(function() {
            $scope.nav(RedirectService.getRedirectPath());
        }, 1000);
    }
])

/******************************************************************************
* Name:         TrunkController
* Description:  Controller for trunk (profile) functionality. 
*******************************************************************************/
.controller('TrunkController', ['$scope', '$location', '$routeParams', '$window', '_', 'APIService', 'QueryService', 'CacheService',
    function($scope, $location, $routeParams, $window, _, APIService, QueryService, CacheService) {
        var resCont = document.getElementById('results-container');
        var resList = document.getElementById('results-list');
        var userId = $routeParams.userId;
        var init = true;
        var sortSet = false;
        
        $scope.activeFilters = [];
        $scope.resultList = [];
        $scope.resultFilters = [];
        $scope.pagination = { start: 0, total: 0 };
        
        $scope.searchParam = '';
        $scope.sortParam = 'dAsc';
        $scope.ms = { mode: false, count: 0};
        
        $scope.trunk = {};
        
        $scope.loading = true;
        
        $scope.loadMore = function() {
            if ($scope.loading || init) return;
            
            if ($scope.resultList.length < $scope.pagination.total) {
                var nextStart = $scope.pagination.start + Math.min($scope.pagination.total - $scope.resultList.length, 20);
                $scope.pagination.start = nextStart;
                $scope.performSearch(true);
            }
        }
        
        $scope.toggleMS = function() {
            $scope.ms.mode = !$scope.ms.mode;
            
            if (!$scope.ms.mode) {
                $scope.ms.count = 0;
                var results = _.where($scope.resultList, {selected: true});
                _.each(results, function(result) {
                    result.selected = false;
                });
            }
        }
        
        $scope.toggleSelected = function(disc) {
            disc.selected = !disc.selected;
            
            if (disc.selected) {
                $scope.ms.count += 1;
            } else {
                $scope.ms.count -= 1;
            }
        }
        
        angular.element($window).bind('resize', function() {
            $timeout(function() {
                $scope.resizeRes();
            });
        });
        
        $scope.updateUrl = function() {
            $scope.pagination.start = 0;
            $location.url($location.path() + QueryService.getQueryString({
                    query: $scope.searchParam,
                    sort: sortSet ? $scope.sortParam : undefined,
                    filter: $scope.activeFilters
                }));
        }
        
        $scope.performSearch = function(appendOnly) {
            $scope.loading = true;
            QueryService.queryTrunk({
                query: $scope.searchParam,
                sort: $scope.sortParam,
                filter: $scope.activeFilters,
                start: $scope.pagination.start,
                limit: 20,
                userId: $scope.trunk.user._id
            }, function(success, response) {
                    if (success) {
                        $scope.pagination.start = response.start;
                        $scope.pagination.total = response.total;
                        
                        if (appendOnly) {
                            Array.prototype.push.apply($scope.resultList, response.results);
                        } else {
                            $scope.resultList = response.results;
                            
                            var i = 0;
                            for (var facetName in response.facets) {
                                var facet = response.facets[facetName];
                                
                                if (facet.filters.length) {
                                    if (i < 4) facet.open = true;
                                    
                                    var limit = 5;
                                    var prop = _.find($scope.activeFilters, {name: facetName});
                                    if (prop) {
                                        _.each(prop.fields, function(field) {
                                            limit = Math.max(limit, _.findIndex(facet.filters, function(filter) { return filter.val == field }) + 1);
                                        });
                                        prop.text = facet.text;
                                    }
                                    facet.limit = limit;
                                    i++;
                                }
                            }
                            
                            $scope.resultFilters = response.facets;
                        }
                        $scope.getUsers();
                    }
                    $scope.loading = false;
                });
        }
        
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
             angular.element(resList).css('width',  Math.floor(resCont.clientWidth / 206) * 206 + 'px');
        }
        
        $scope.isFilterActive = function(facet, filter) {
            var prop = _.find($scope.activeFilters, {name: facet.prop});
            
            return prop && _.contains(prop.fields, filter.val);
        }
        
        $scope.hasActiveFilters = function(facet) {
            var prop = _.find($scope.activeFilters, {name: facet.prop});
            
            return prop && prop.fields.length;
        }
        
        $scope.clearActiveFilters = function(facet) {
            $scope.activeFilters = _.filter($scope.activeFilters, function(filter) { return filter.name != facet.prop });
            $scope.updateUrl();
        }
        
        $scope.navFilter = function(filter, field) {
            if (!filter) { // handle home
                $scope.activeFilters = [];
                $scope.updateUrl();
            } else {
                var filterIndex = $scope.activeFilters.indexOf(filter);
                
                if (filterIndex > -1) {
                    var fieldIndex = filter.fields.indexOf(field);
                    
                    if (fieldIndex > -1) {
                        filter.fields.splice(fieldIndex + 1, filter.fields.length - (fieldIndex + 1));
                    }
                    
                    $scope.activeFilters.splice(filterIndex + 1, $scope.activeFilters.length - (filterIndex + 1));
                    
                    $scope.updateUrl();
                }
            }
        }
        
        $scope.getFacets = function() {
            QueryService.queryFacet($scope.searchParam, $scope.sortParam, $scope.activeFilters,
                {
                    name: 'tag',
                    limit: 2,
                    offset: 2
                },
                function(success, response) {
                    if (success) {
                        console.log(response);
                    }
                });
        }
        
        $scope.updateSort = function() {
            sortSet = true;
            $scope.updateUrl();
        }
        
        $scope.$watch(function () { return $location.url(); }, function (url) {
            if (url) {
                var ret = QueryService.parseUrlQuery($location.search());
                
                $scope.activeFilters = ret.filters;
                $scope.searchParam = ret.search;
                
                if (ret.sort) {
                    $scope.sortParam = ret.sort;
                } else if (ret.search.length) {
                    $scope.sortParam = 'rel';
                }
                
                if ($scope.ms.mode) $scope.toggleMS();
                
                if (!init) $scope.performSearch();
            }
        });
        
        $scope.toggleFilter = function(facet, filter) {
            var prop = _.find($scope.activeFilters, {name: facet.prop});
            
            if (prop) {
                if (_.contains(prop.fields, filter.val)) {
                    prop.fields = _.without(prop.fields, filter.val);
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
        
        CacheService.getUser(userId, function(success, user) {
            if (!success) {
                return $scope.nav();
            }
            
            $scope.trunk.user = user;
            init = false;
            $scope.performSearch();
        });
        
    }
])

/******************************************************************************
* Name:         DiscController
* Description:  Controller for disc page functionality. 
*******************************************************************************/
.controller('DiscController', ['$scope', '$location', '$routeParams', '$window', '_', 'APIService', 'CacheService',
    function($scope, $location, $routeParams, $window, _, APIService, CacheService) {
        var discId = $routeParams.discId;
        $scope.breadcrumbList = [];
        
        $scope.loading = true;
        
        APIService.Get('/discs/' + discId, function(success, disc) {
            if (!success) {
                return $scope.nav();
            } else {
                $scope.disc = disc;
                $scope.imageBlock = _.findWhere(disc.imageList, {_id: disc.primaryImage});
                $scope.discInit = true;
                CacheService.getUser(disc.userId, function(success, user) {
                    if (!success) {
                        return $scope.nav();
                    }
                    $scope.user = user;
                    $scope.userInit = true;
                    $scope.breadcrumbList = [
                        {text: user.username + '\'s Trunk', href: '/portal/trunk/' + user._id},
                        {text: 'Disc View'}
                    ];
                });
            }
            $scope.loading = false;
        });
        
        $scope.setImage = function(img) {
            $scope.imageBlock = img;
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
.controller('ModifyDiscController', ['$compile', '$scope', '$routeParams', '$location', '$timeout', '_', 'smoothScroll', '$ocLazyLoad', 'APIService', 'ImageService', 'AccountService', 
    function($compile, $scope, $routeParams, $location, $timeout, _, smoothScroll, $ocLazyLoad, APIService, ImageService, AccountService) {
        if (!AccountService.hasAccountId()) {
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
                APIService.Put('/discs/' + $scope.disc._id, $scope.disc, function(success, disc) {
                    if (success) {
                        console.log(disc);
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
                APIService.Post('/discs/', $scope.disc, function(success, disc) {
                    if (success) {
                        console.log(disc);
                        $scope.disc = disc;
                        $scope.editAlert.success = {
                            title: 'Success',
                            message: disc.brand + ' ' + disc.name + ' has been created successfully.',
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
        
        if (typeof(discId) !== 'undefined') { // Edit Mode
            APIService.Get('/discs/' + discId, function(success, disc) {
                if (!success) {
                    return $scope.nav();
                } else {
					console.log(disc);
                    if (disc.userId != AccountService.getAccountId()) {
                        return $scope.nav();
                    }
                    
                    $scope.disc = disc;
                    $scope.settings.discReady = true;
                }
            });
        } else { // Create Mode
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
.controller('MessageController', ['$scope', '$location', '$timeout', '_', 'smoothScroll', 'APIService', 'AccountService', 'SocketUtils', 'PageUtils', 
    function($scope, $location, $timeout, _, smoothScroll, APIService, AccountService, SocketUtils, PageUtils) {
			if (!AccountService.hasAccountId()) {
					return $location.path('/login');
			}
			
			var messageTextArea = angular.element(document.getElementById('message-text-area'));
			var messageList = document.getElementById('message-list');
			var activeThreadId
			var init = false;
			
			$scope.messageThreads = [];
			$scope.archivedThreads = [];
			$scope.messages = [];
			$scope.activeThread = undefined;
			$scope.sendOnEnter = true;
			$scope.messageAlert = {}
			
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
					return user != $scope.account.user._id;
				});
				APIService.Get('/users/' + userId, function(success, user) {
					if (success && user.image) {
						thread.image = user.image;
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
						// HANDLE ERROR
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
			
			var handleIncMessage = function(message) {
				$timeout(function() {
					if ($scope.activeThread && $scope.activeThread.threadId == message.threadId && $scope.activeThread.active) {
						$scope.messages.push(message);
						$scope.activeThread.messages.push(message);
						APIService.Put('/threads/' + $scope.activeThread.threadId, {messageCount: $scope.activeThread.currentMessageCount + 1}, function(success, thread) {
							if (success) {
								cloneThread($scope.activeThread, thread);
							} else {
								// HANDLE ERROR
							}
						});
					} else {
						var thread = _.findWhere($scope.messageThreads, {threadId: message.threadId});
						if (typeof(thread) !== 'undefined') {
							if (thread.messages.length) {
								thread.messages.push(message);
							}
						} else {
							reloadThread(message.threadId);
						}
					}
				});
			}
			
			var buildMessageReq = function() {
				return '?count=20' + ($scope.activeThread.refId ? '&refId=' + $scope.activeThread.refId : '');
			}
			
			$scope.unarchiveThread = function() {
				if ($scope.activeThread) {
					APIService.Put('/threads/' + $scope.activeThread.threadId, {active: true}, function(success, localThread) {
						if (success) {
							var index = _.findIndex($scope.archivedThreads, function(thread) {return thread._id == localThread._id; });
							if (index > -1) {
								$scope.archivedThreads.splice(index, 1);
								$scope.messages = [];
								reloadThread(localThread.threadId, true);
							} else {
								$location.url($location.path());
							}
						} else {
							// HANDLE ERROR
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
								$scope.messages = [];
								$location.url($location.path());
							}
						} else {
							// HANDLE ERROR
						}
					});
				}
			}
			
			$scope.getMessageImage = function(message) {
				if (message.userId == $scope.account.user._id) {
					return $scope.account.user.image;
				} else {
					return $scope.activeThread.image;
				}
			}
			
			$scope.getMessages = function(firstLoad) {
				if (typeof($scope.activeThread) !== 'undefined') {
					if (firstLoad) {
						if ($scope.activeThread.messages.length) {
							$scope.messages = $scope.activeThread.messages;
							return;
						}
						
						$scope.activeThread.refId = undefined;
					}
					
					APIService.Get('/threads/' + $scope.activeThread.threadId + '/messages' + buildMessageReq(), function(success, messages) {
						if (success) {
							$scope.messages.push.apply($scope.messages, messages);
							
							$scope.activeThread.messages.push.apply($scope.activeThread.messages, messages);
							$scope.activeThread.refId = messages[messages.length - 1]._id;
							
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
							// HANDLE ERROR
						}
					});
				} else {
					$location.url($location.path());
				}
			}
			
			$scope.sendMessage = function() {
				if ($scope.userMessage && $scope.userMessage.length) {
					$scope.lockout = true;
					APIService.Post('/threads/' + $scope.activeThread.threadId + '/messages', {content: $scope.userMessage}, function(success, message) {
						if (success) {
							$scope.messages.push(message);
							reloadThread(message.threadId);
							$scope.userMessage = '';
						} else {
							// HANDLE ERROR
						}
						
						$scope.lockout = false;
					});
				}
			}
			
			$scope.activateThread = function(thread) {
				$location.url($location.path() + '?threadId=' + thread.threadId + (!thread.active ? '&archived=true' : ''));
			}
			
			$scope.loadArchived = function() {
				APIService.Get('/threads?archived=true', function(success, threads) {
					if (success) {
						$scope.archivedThreads = threads;
						initThreads($scope.archivedThreads);
					} else {
						// HANDLE ERROR
					}
				});
			}
			
			$scope.$watch(function () { return $location.url(); }, function (url) {
				if (url && /^\/inbox/.test(url)) {
					
					$scope.messages = [];
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
						} else if (init) {
							$scope.activeThread = _.findWhere($scope.messageThreads, {threadId: activeThreadId});
							$scope.getMessages(true);
						}
					}
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
					init = true;
				} else {
					// HANDLE ERROR
				}
			});
    }
])

/******************************************************************************
* Name:         AccountController
* Description:  Handles account preferences and settings. 
*******************************************************************************/
.controller('AccountController', ['$scope', '$location', 'AccountService', 'APIService', 
    function($scope, $location, AccountService, APIService) {
			$scope.tempAccount = {};
			var account = {};
			
			if (!AccountService.hasAccountId()) {
					return $location.path('/login');
			}
			
			$scope.cloneAccount = function() {
				$scope.tempAccount = {
					_id: account._id,
					username: account.username,
					firstName: account.firstName,
					lastName: account.lastName,
					linked: account.linked,
					lastAccess: account.lastAccess,
					dateJoined: account.dateJoined,
					zipcode: account.zipcode,
					location: account.location,
					image: account.image,
					shortLocation: account.shortLocation,
					locLat: account.locLat,
					locLng: account.locLng,
					pdgaNumber: account.pdgaNumber
				}
			}
			
			APIService.Get('/account', function(success, user) {
				if (!success) {
					return $location.path('/login');
				}
				
				account = user;
				$scope.cloneAccount();
			});
    }
])