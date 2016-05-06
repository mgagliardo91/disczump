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

/******************************************************************************
* 
* DIRECTIVES
* 
*******************************************************************************/

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

            if (typeof directive === 'object') {
                scope.$watch('trigger', function(newValue, oldValue) {
                    if (newValue == true) {
                        for (var a in directive) {
                            element.attr(a, directive[a]);
                        }

                        element.removeAttr('directive-on');
                        element.removeAttr('directive-set');
                        $compile(angular.element(element[0]))(scope.$parent);
                    }
                });
            }
        }
    };
}])

.directive('infiniteScroll', ['$window', function($window) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var raw = element[0];
            
            angular.element(window).bind('scroll load', function(evt) {
                console.log("event fired: " + evt.type);
                var rectObject = raw.getBoundingClientRect();
                var rectTop = rectObject.top + window.pageYOffset - document.documentElement.clientTop;
                
                if (rectTop + raw.clientHeight <= $window.scrollY + window.innerHeight) {
                    scope.$apply(attrs.infiniteScroll);
                }
            });
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
                attrs.$set('src', attrs.imgLoad || '/static/logo/logo_small_faded.svg');
                var imageObj = new Image();
                imageObj.src = src;
                imageObj.addEventListener('load', function() {
                    attrs.$set('src', imageObj.src);
                });
            }
            
            if (attrs.src) {
                    startLoad();
            } else {
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
                        '<div class="explore-cat-label">' + 
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
                                '<i class="fa fa-angle-double-left nav-arrow" ng-click="pageBack()" ng-class="{inactive: page == 0}"></i>' + 
                                '<i class="fa" ng-repeat="i in navArr track by $index" ng-click="navIndex($index)" ng-class="{active: start == $index * dispCount, \'fa-circle\': start == $index * dispCount, \'fa-circle-thin\': start != $index * dispCount}"></i>' + 
                                '<i class="fa fa-angle-double-right nav-arrow" ng-click="pageNext()" ng-class="{inactive: page == navArr.length - 1}"></i>' + 
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
                    var phase = this.$parent.$root.$$phase;
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
                
                angular.element($window).bind('resize', function() {
                    scope.getDisplayCount();
                });
                
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
.controller('MainController', ['$rootScope', '$scope', '$location', 'AccountService', '_',
    function($rootScope, $scope, $location, AccountService, _) {
        $scope.accountDropdown = false;
        $scope.loggedIn = true;
        $scope.activePage = 0;
        
        $scope.errorOpts = {
            active: false
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
        
        $scope.containsStr = function(parent, child) {
            return _.contains(parent, String(child));
        }
        
        $scope.getUserImage = function(user) {
            if (user.image) {
                return user.image;
            }
            return '/static/logo/logo_small_faded.svg';
        }
        
        $scope.getPrimaryImage = function(disc) {
            if (disc.primaryImage) {
                var imgObj = _.findWhere(disc.imageList, {_id: disc.primaryImage});
                if (imgObj) {
                    return 'http://ec2-54-218-32-190.us-west-2.compute.amazonaws.com/files/' + imgObj.fileId;
                }
            }
            return '/static/logo/logo_small_faded.svg';
        }
        
        $scope.log = function(obj) {
            console.log(obj);
        }
        
        
        $scope.getSolrPrimaryImage = function(disc) {
            if (disc.primaryImage) {
                for (var key in disc) {
                    if (/^imageList\.\d+\._id$/.test(key) && disc[key] == disc.primaryImage) {
                        return 'http://ec2-54-218-32-190.us-west-2.compute.amazonaws.com/files/' + disc[key.replace('_id', 'thumbnailId')];
                    }
                }
            }
            return '/static/logo/logo_small_faded.svg';
        }
        
        $rootScope.$on('AccountInit', function(event, data) {
            if (data.success) {
                console.log(AccountService.getAccount());
                // Handle account logged in
            }
        });
        
        $scope.init = function(uId) {
            AccountService.init(uId);
        }
        
        
    }
])

/******************************************************************************
* Name:         HeaderController
* Description:  Controller for handling profile bar and breadcrumb bar. 
*******************************************************************************/
.controller('HeaderController', ['$scope',
    function($scope) {
        $scope.trunk = {};
    }
])

/******************************************************************************
* Name:         PortalController
* Description:  Controller for explore/marketplace functionality. 
*******************************************************************************/
.controller('PortalController', ['$scope', '$location', '$window',
    function($scope, $location, $window) {
        //$location.url($location.path());
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
* Name:         ExploreController
* Description:  Controller for explore functionality. 
*******************************************************************************/
.controller('ExploreController', ['$scope', '$location', '$routeParams', '$window', '_', 'APIService', 'QueryService', 'CacheService',
    function($scope, $location, $routeParams, $window, _, APIService, QueryService, CacheService) {
        var resCont = document.getElementById('results-container');
        var resList = document.getElementById('results-list');
        var init = true;
        var sortSet = false;
        
        $scope.activeFilters = [];
        $scope.resultList = [];
        $scope.resultFilters = [];
        $scope.pagination = { start: 0, total: 0 };
        
        $scope.searchParam = '';
        $scope.sortParam = 'dAsc';
        
        $scope.loading = true;
        
        $scope.loadMore = function() {
            if ($scope.loading || init) return;
            
            if ($scope.resultList.length < $scope.pagination.total) {
                var nextStart = $scope.pagination.start + Math.min($scope.pagination.total - $scope.resultList.length, 20);
                $scope.pagination.start = nextStart;
                $scope.performSearch(true);
            }
        }
        
        angular.element($window).bind('resize', function() {
            $scope.resizeRes();
        });
        
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
        
        $scope.getFormattedField = function(field) {
            if (field === 'true') {
                return 'Active';
            }
            
            return field;
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
            $scope.loading = true;
            QueryService.queryAll({
                query: $scope.searchParam,
                sort: $scope.sortParam,
                filter: $scope.activeFilters,
                start: $scope.pagination.start,
                valueRange: true,
                limit: 20
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
                                            prop.text = facet.text;
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
             angular.element(resList).css('width',  Math.floor(resCont.clientWidth / 206) * 206 + 'px');
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
                
                if (!init) $scope.performSearch();
            }
        });
    
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

        init = false;
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
            $scope.resizeRes();
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
        $scope.user = null;
        $scope.disc = null;
        $scope.imageBlock = {};
        
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
.controller('MessageController', ['$scope', '$location', 'DataService',
    function($scope, $location, DataService) {
        
    }
])

/******************************************************************************
* Name:         AccountController
* Description:  Handles account preferences and settings. 
*******************************************************************************/
.controller('AccountController', ['$scope', '$location', 'DataService',
    function($scope, $location, DataService) {
        
    }
])