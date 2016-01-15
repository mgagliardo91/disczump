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
            DataService.initialize(function() {
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
        $scope.searchActive = SearchService.lastQuery.valueOf().length > 0;
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
                    }, 200);
                }
            });
        }
    };
}])

.controller('CreateDiscController', ['$rootScope', '$scope', '$routeParams', '$window', '$location', 'DataService',
    function($rootScope, $scope, $routeParams, $window, $location, DataService) {
        $scope.loading = false;
        $scope.disc = {
            visible: true
        };
        
        $scope.forms = {};
        
        $scope.settings = {
            page: 0
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
    }
])

.controller('DiscController', ['$rootScope', '$scope', '$routeParams', '$window', '$location', 'DataService',
    function($rootScope, $scope, $routeParams, $window, $location, DataService) {
        $scope.disc = undefined;
        $scope.user = undefined;
        $scope.footer = false;
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
        $scope.windowWidth = $window.innerWidth - 20

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