var siteUrl = 'https://disczumpserver-mgagliardo.c9.io';
var dzID = '1433417853616595';

angular.module('disczump.controllers', ['disczump.services'])

// Directives

// .directive('dropzone', function() {
//     return function(scope, element, attrs) {
//         var config, dropzone;

//         config = scope[attrs.dropzone];

//         // create a Dropzone for the element with the given options
//         dropzone = new Dropzone(element[0], config.options);

//         // bind the given event handlers
//         angular.forEach(config.eventHandlers, function(handler, event) {
//             dropzone.on(event, handler);
//         });
//     };
// })

// Controllers

.controller('MainController', ['$rootScope', '$scope', '$location', '$window', 'DataService',
    function($rootScope, $scope, $location, $window, DataService) {
        
        $rootScope.init = function() {
            DataService.initialize(function(isLoggedIn) {
                $rootScope.isLoggedIn = isLoggedIn;
                
                if (!$rootScope.isLoggedIn) {
                    $window.location.href = '/login';
                }
                
                console.log('Initialized');
            });
        }

        $scope.goBack = function() {
            $window.history.back();
        }

        $scope.nav = function(url) {
            $location.path('/' + url);
        }

        $scope.$def = function(obj) {
            return typeof obj !== 'undefined';
        }

        $rootScope.init();
    }
])

.controller('DashboardController', ['$scope', '$location', '$routeParams', 'DataService', 'FilterService', 'SearchService',
    function($scope, $location, $routeParams, DataService, FilterService, SearchService) {
        $scope.discList = undefined;
        $scope.userPrefs = DataService.userPrefs;
        $scope.filterDisc = FilterService.filterObj;
        $scope.query = SearchService.lastQuery.valueOf();
        $scope.searchFocus = $scope.searchActive = SearchService.lastQuery.valueOf().length > 0;
        $scope.loadSize = 20;
        $scope.title = 'Loading...';

        $scope.$on("$destroy", function() {
            SearchService.lastQuery = $scope.query.valueOf();
        });

        $scope.searchDisc = function(obj) {
            return SearchService.search($scope.query, obj);
        }

        $scope.$watch('discList', function() {
            $scope.loadSize = 20;
        });

        $scope.getPrimaryImage = function(disc) {
            return DataService.getPrimaryImage(disc, true);
        }

        $scope.getColorize = function(disc) {
            return DataService.getColorize(disc);
        }

        $scope.showDisc = function(discId) {
            $location.path('/disc/' + discId);
        }

        $scope.loadMore = function() {
            $scope.loadSize = Math.min($scope.discList.length, $scope.loadSize + 20);
        }

        $scope.loading = true;
        if ($routeParams.userId) {
            DataService.getPublicDiscs($routeParams.userId, function(discs, account) {
                if (!DataService.isPublic()) {
                    DataService.setPublicState(true);
                    FilterService.clearFilters();
                }

                $scope.discList = discs;
                $scope.title = (account ? account.username + '\'s Discs' : 'Unknown');
                $scope.loading = false;
            });
        }
        else {
            if (DataService.isPublic()) {
                DataService.setPublicState(false);
                FilterService.clearFilters();
            }
            $scope.discList = DataService.discs;
            $scope.title = 'My Dashboard';
            $scope.loading = false;
        }
    }
])

.directive('infiniteScroll', function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var raw = element[0];

            element.bind('scroll', function() {
                if (raw.scrollTop + raw.offsetHeight >= raw.scrollHeight) {
                    scope.$apply(attrs.infiniteScroll);
                }
            });
        }
    };
})

.directive('focusOn', ['$timeout', function($timeout) {
    return {
        scope: {
            trigger: '=focusOn'
        },
        link: function(scope, element) {
            scope.$watch('trigger', function(value) {
                if (value === true) {
                    $timeout(function() {
                        element[0].focus();
                        scope.trigger = false;
                    }, 300);
                }
            });
        }
    };
}])

.directive('dzFill', ['$compile', 'AutoFillService', function($compile, AutoFillService){
    return {
        restrict: 'A',
        scope : {
            ngModel: "="
        },
        replace: false,
        link: function(scope, element, attrs) {
            scope.fill = {
                results: [],
                interact: false,
                selected: false,
                onSelect: false
            }
            
            var input = angular.element(element[0]);
            var resultList = angular.element('<ul ng-show="fill.results.length && fill.interact && !fill.selected" class="auto-fill-list"><li ng-repeat="result in fill.results | limitTo:20" ng-click="setValue(result)">{{result}}</li></ul>');
            
            
            scope.setValue = function(result) {
                scope.fill.selected = true;
                scope.fill.onSelect = true;
                element[0].focus();
                scope.ngModel = result;
            }
            
            scope.$watch('ngModel', function(newValue, oldValue) {
                if (oldValue == newValue) return;
                
                if (scope.fill.onSelect) {
                    scope.fill.onSelect = false;
                    return;
                }
                
                scope.fill.selected = false;
                scope.fill.results = AutoFillService.getOptions(attrs.dzFill, newValue);
            });
            
            
            input.bind('focus', function() {
                scope.fill.interact = true;
            });
            
            input.bind('blur', function() {
                scope.fill.interact = false;
            });
            
            input.after(resultList);
            $compile(resultList)(scope);
        }
    }
}])

.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(attrs.ngEnter);
                event.preventDefault();
            }
        });
    };
})

.controller('ModifyDiscController', ['$scope', '$window', '$location', '$routeParams', '_', 'AutoFillService', 'DataService', 
    function($scope, $location, $window, $routeParams, _, AutoFillService, DataService) {
        $scope.imgSize = Math.floor(($window.innerWidth - 48) / 4);    //Subtracted 48 for 20px padding on each side of screen and 1px padding on each side of img.
        console.log($scope.imgSize);
        $scope.loading = true;
        $scope.disc = {
            visible: true,
            tagList: []
        };
        $scope.temp = {
            tag: '',
            tagOptions: [],
            focus: false,
        };
        $scope.forms = {};
        
        $scope.settings = {
            page: 2,
            editMode: typeof $routeParams.discId !== 'undefined'
        }

        $scope.dropzoneConfig = {
            'options': { // passed into the Dropzone constructor
                'url': 'upload.php'
            },
            'eventHandlers': {
                'sending': function(file, xhr, formData) {},
                'success': function(file, response) {}
            }
        };
        
        $scope.$watch('temp.tag', function(newValue, oldValue) {
            if (!$scope.temp.tag.length) {
                $scope.temp.tagOptions = [];
                return;
            }
            
            $scope.temp.tagOptions = AutoFillService.getOptions('tagList', newValue);
        });
        
        $scope.appendTag = function(tag, reset) {
            if (!tag.length) return;
            
            if (!_.contains($scope.disc.tagList, tag)) {
                $scope.disc.tagList.push(tag);
            }
            
            if (reset) $scope.temp.tag = '';
            
            $scope.temp.focus = true;
        }
        
        $scope.toggleTag = function(tag) {
            if (tag == $scope.temp.activeTag) {
                $scope.temp.activeTag = undefined;
            } else {
                $scope.temp.activeTag = tag;
            }
        }
        
        $scope.resetDisc = function() {
            $scope.disc = {
                visible: true,
                tagList: []
            };
            $scope.settings.page = 0;
        }
        
        $scope.removeTag = function() {
            if ($scope.temp.activeTag) {
                $scope.disc.tagList = _.without($scope.disc.tagList, $scope.temp.activeTag);
                $scope.temp.activeTag = undefined;
            }
        }
        
        $scope.toggleImage = function(id) {
            if (id == $scope.temp.activeImage) {
                $scope.temp.activeImage = undefined;
            } else {
                $scope.temp.activeImage = id;
            }
        }
        
        AutoFillService.initialize(function() {
            if ($scope.settings.editMode) {
                DataService.getDisc($routeParams.discId, function(disc, user) {
                    if (typeof disc === 'undefined') {
                        $location.path('/');
                    } else {
                        $scope.disc = disc;
                    }
                    $scope.loading = false;
                });
            } else {
                $scope.loading = false;  
            }
        });
    }
])

.controller('DiscController', ['$rootScope', '$scope', '$routeParams', '$window', '$location', 'DataService',
    function($rootScope, $scope, $routeParams, $window, $location, DataService) {
        $scope.disc = undefined;
        $scope.user = undefined;
        $scope.dropdown = false;
        $scope.title = 'Loading...';

        $scope.getPrimaryImage = function() {
            return DataService.getPrimaryImage($scope.disc);
        }

        $scope.showImageList = function() {
            if (!$scope.disc.imageList.length) return;
            $location.path('/disc/' + $scope.disc._id + '/images');
        }

        $scope.shareLink = function() {
            if ($scope.disc) {
                return encodeURI('https://www.facebook.com/dialog/share?app_id=' +
                    dzID + '&display=popup&href=' + siteUrl + '/disc/' +
                    $scope.disc._id + '&redirect_uri=' + siteUrl);
            }

            return '#';

        }

        $scope.loading = true;
        DataService.getDisc($routeParams.discId, function(disc, user) {
            if (typeof disc === 'undefined') {
                $location.path('/');
            }
            else {
                $scope.disc = disc;
                $scope.user = user;
                $scope.title = $scope.disc.name;
            }
            $scope.loading = false;
        });

    }
])

.controller('DiscImageController', ['$location', '$scope', '$routeParams', '$window', 'DataService',
    function($location, $scope, $routeParams, $window, DataService) {
        $scope.disc = undefined;
        $scope.title = 'Loading...';
        $scope.windowWidth = $window.innerWidth - 20;

        $scope.showImage = function(fileId) {
            $window.open(siteUrl + '/files/' + fileId);
        }

        $scope.loading = true;
        DataService.getDisc($routeParams.discId, function(disc) {
            if (typeof disc === 'undefined') {
                $location.path('/');
            }
            else {
                $scope.disc = disc;
                $scope.title = $scope.disc.name + ': Images';
            }
            $scope.loading = false;
        });
    }
])

.controller('SettingsController', ['$window', '$scope', 'DataService',
    function($window, $scope, DataService) {

        $scope.viewItems = [{
            text: 'List',
            value: 'list'
        }, {
            text: 'Gallery',
            value: 'gallery'
        }, {
            text: 'Dashboard',
            value: 'dashboard'
        }, ];


        $scope.defaults = {
            view: $scope.viewItems[0]
        }
    }
])

.controller('FilterListController', ['$location', '$scope', '$routeParams', '$window', 'DataService', 'FilterService',
    function($location, $scope, $routeParams, $window, DataService, FilterService) {
        $scope.filterProps = FilterService.filterProps;

        $scope.clearFilters = function() {
            FilterService.clearFilters();
        }

        $scope.showFilterItems = function(property) {
            $location.path('/filter/' + property);
        }
    }
])

.controller('FilterPropController', ['$scope', '$routeParams', '_', 'FilterService',
    function($scope, $routeParams, _, FilterService) {
        $scope.items = [];
        $scope.item = FilterService.getFilterItem($routeParams.filterProp);

        $scope.clearFilters = function() {
            _.each($scope.items, function(item) {
                FilterService.clearOption($scope.item.property, item.name);
                item.active = false;
            });
        }

        $scope.setOption = function(item) {
            if (!item.active) {
                FilterService.setOption($scope.item.property, item.name);
            }
            else {
                FilterService.clearOption($scope.item.property, item.name);
            }

            item.active = !item.active;
        }

        var options = _.sortBy(FilterService.getFilterOptions($scope.item.property), function(i) {
            if (_.isNumber(i)) {
                return parseInt(i);
            }
            if (_.isString(i)) {
                if (i == '') {
                    return undefined;
                }
                else {
                    return i.toLowerCase();
                }
            }
            return i;
        });

        _.each(options, function(option) {
            var text = typeof(option) === 'undefined' || option == '' ? '- None -' : option;
            $scope.items.push({
                name: option,
                active: FilterService.isOptionActive($scope.item.property, option),
                text: text
            });
        })
    }
])

.controller('SortListController', ['$location', '$scope', '$routeParams', '$window', 'SortService',
    function($location, $scope, $routeParams, $window, SortService) {
        $scope.sortItems = SortService.sortItems;

        $scope.filterSort = function(obj) {
            return obj.sortOn;
        }

        $scope.toggleDirection = function(sortItem) {
            sortItem.sortAsc = !sortItem.sortAsc;
        }

        $scope.toggleDirection = function(sortItem) {
            sortItem.sortAsc = !sortItem.sortAsc;
        }

        $scope.removeSort = function(sortItem) {
            SortService.clearSort(sortItem.property);
        }

        $scope.addSort = function() {
            $location.path('/sort/add');
        }

        $scope.dragControlListeners = {
            orderChanged: function(event) {
                SortService.updateSortOrder(event.source.itemScope.modelValue.property, event.source.index, event.dest.index);
            },
            containment: '#sort-prop-list'
        }
    }
])

.controller('SortPropController', ['$window', '$scope', '$routeParams', 'SortService',
    function($window, $scope, $routeParams, SortService) {
        $scope.sortAsc = true;

        $scope.sortOptions = _.where(SortService.sortItems, {
            sortOn: false
        });

        $scope.data = {
            sortItem: $scope.sortOptions[0]
        };

        $scope.setSortAsc = function(val) {
            $scope.sortAsc = val;
        }

        $scope.acceptSort = function() {
            SortService.addSortItem($scope.data.sortItem.property, $scope.sortAsc);
            $window.history.back();
        }
    }
])

.filter('discSort', ['SortService', function(SortService) {
    return function(array) {
        return SortService.executeSort(array);
    }
}]);