angular.module('underscore', [])

.factory('_', ['$window', function($window) {
    return $window._;
}]);

angular.module('disczump.services', ['underscore'])

.factory('ConfigService', ['$location', '_', function($location, _) {

    function parseParams(url) {
        var url = url.replace('/', '');
        console.log(url);
        var params = transformToAssocArray(url);
        console.log(params);

        if (params.view == 'disc' && params.disc_id) {
            return $location.path('/disc/' + params.disc_id);
        }

        if (params.view == 'dashboard' && params.user_id) {
            return $location.path('/d/' + params.user_id);
        }
        
        if (params.view == 'profile' && params.user_id) {
            return $location.path('/profile/' + params.user_id);
        }
    }

    function transformToAssocArray(prmstr) {
        var params = {};
        var prmarr = prmstr.split("&");
        for (var i = 0; i < prmarr.length; i++) {
            var tmparr = prmarr[i].split("=");
            params[tmparr[0]] = tmparr[1];
        }
        return params;
    }

    function initUrl(url) {
        var hashIndex = url.indexOf('#');
        var eqIndex = url.indexOf('=');
        if (hashIndex >= 0 && eqIndex >= 0) {
            parseParams(url.substr(hashIndex + 1, url.length - hashIndex - 1));
        }
    }

    return {
        initUrl: initUrl
    }
}])

.factory('APIService', ['$http', '$window',
    function($http, $window) {
        return {
            Get: Get,
            Put: Put,
            Post: Post,
            Delete: Delete,
            Query: Query
        }

        function Query(path, query, callback) {
            var qPath = path + '?';
            for (var key in query) {
                qPath = qPath + key + '=' + query[key];
            }
            return request({
                path: qPath,
                method: 'GET',
                skipAuth: true
            }, callback);
        }

        function Get(path, callback) {
            return request({
                path: path,
                method: 'GET'
            }, callback);
        }

        function Put(path, data, callback) {
            return request({
                path: path,
                method: 'PUT',
                data: data
            }, callback);
        }

        function Post(path, data, callback) {
            return request({
                path: path,
                method: 'POST',
                data: data
            }, callback);
        }

        function Delete(path, callback) {
            return request({
                path: path,
                method: 'DELETE'
            }, callback);
        }

        function request(params, callback) {
            return $http({
                method: params.method,
                url: siteUrl + '/api' + params.path,
                data: params.data,
                timeout: 5000
            }).then(function(response) {
                var retObj = parseResponse(response);
                return callback(retObj.success, retObj.data);

            }, function(response) {
                return callback(false, {
                    message: 'Failed to hit server with request.',
                    type: 'Internal Error'
                })
            });
        }

        function parseResponse(response) {
            if (response.data.error) {
                return {
                    sucess: false,
                    data: response.data.error
                };
            }
            else {
                return {
                    success: true,
                    data: response.data
                };
            }
        }
    }
])

.factory('DataService', ['$q', '$rootScope', '_', 'APIService', function($q, $rootScope, _, APIService) {
    var account = {};
    var userPrefs = {};
    var discs = [];
    
    var userCache = [];
    var users = [];
    var userQuery = '';
    
    var pubDiscs = undefined;
    var pubAccount = undefined;
    var publicActive = false;
    var isLoggedIn = false;

    function initialize(callback) {
        var tasks = [];

        var acctReq = $q.defer();
        tasks.push(acctReq.promise);
        APIService.Get('/account', function(success, data) {
            if (success) {
                angular.copy(data, account);
                isLoggedIn = true;
                acctReq.resolve();
            } else {
                acctReq.reject({process:'Error loading account.', error: data});
            }
        });

        var prefsReq = $q.defer();
        tasks.push(prefsReq.promise);
        APIService.Get('/account/preferences', function(success, data) {
            if (success) {
                angular.copy(data, userPrefs);
                prefsReq.resolve();
            } else {
                prefsReq.reject({process:'Error loading preferences.', error: data});
            }
        });

        var discReq = $q.defer();
        tasks.push(discReq.promise);
        APIService.Get('/discs', function(success, data) {
            if (success) {
                angular.copy(data, discs);
                discReq.resolve();
            } else {
                discReq.reject({process:'Error loading discs.', error: data});
            }
        });

        $q.all(tasks).then(function(results) {
            $rootScope.$emit('DZUserPrefsUpdated');
            if (callback) callback(true);
        }, function(err) {
            console.log(err);
            if (callback) callback(false, err);
        });
    }

    function getPrimaryImage(disc, isThumbnail) {
        if (disc) {
            var image = _.findWhere(disc.imageList, {
                _id: disc.primaryImage
            });
            if (image) {
                return siteUrl + '/files/' + (isThumbnail ? image.thumbnailId : image.fileId);
            }
            else {
                return siteUrl + '/static/logo/logo_small_faded.svg';
            }
        }
    }

    function getColorize(disc) {
        if (disc.type == "Distance Driver") {
            return userPrefs.colorize['distance'];
        }
        else if (disc.type == "Fairway Driver") {
            return userPrefs.colorize['fairway'];
        }
        else if (disc.type == "Mid-range") {
            return userPrefs.colorize['mid'];
        }
        else if (disc.type == "Putt/Approach") {
            return userPrefs.colorize['putter'];
        }
        else if (disc.type == "Mini") {
            return userPrefs.colorize['mini'];
        }
        else {
            return '#FFFFFF';
        }
    }

    function getDisc(id, callback) {
        var disc = _.findWhere(discs, {
            _id: id
        });
        var pubDisc = _.findWhere(pubDiscs, {
            _id: id
        });

        if (typeof(disc) !== 'undefined') {
            return callback(true, {disc: disc, user: account});
        }

        if (typeof(pubDisc) !== 'undefined') {
            APIService.Get('/users/' + pubDisc.userId, function(success, user) {
                if (success) {
                    return callback(true, {disc: pubDisc, user: user});
                }
                else {
                    return callback(false, user);
                }
            });
        }

        APIService.Get('/discs/' + id, function(success, disc) {
            if (success) {
                APIService.Get('/users/' + disc.userId, function(success, user) {
                    if (success) {
                        return callback(true, {disc: disc, user: user});
                    }
                    else {
                        return callback(false, user);
                    }
                });
            }
            else {
                return callback(false, disc);
            }
        });
    }
    
    function getUser(id, callback) {
        var user = _.findWhere(userCache, {
            _id: id
        });

        if (typeof(user) !== 'undefined') {
            return getUserPreview(user, callback);
        }

        APIService.Get('/users/' + id, function(success, user) {
            if (success) {
                userCache = _.uniq(_.union(userCache,  [user]), false, _.property('_id'));
                return getUserPreview(user, callback);
            }
            else {
                return callback(false, user);
            }
        });
    }
    
    function getUserPreview(user, callback) {
        if (typeof(user) === 'undefined') return callback();
        
        APIService.Get('/users/' +user._id + '/preview', function(success, preview) {
            if (success) {
                return callback(true, {user: user, preview: preview});
            } else {
                return callback(false, preview);
            }
        });
    }
    
    function createDisc(disc, callback) {
        APIService.Post('/discs', disc, function(success, data) {
            if (success) {
                discs.push(angular.copy(data));
                return callback(true, data._id);
            }
            
            return callback(false, data);
        });
    }
    
    function updateDisc(disc, callback) {
        APIService.Put('/discs/' + disc._id, disc, function(success, data) {
            if (success) {
                var disc = _.findWhere(discs, {
                    _id: data._id
                });
                copyDisc(disc, data);
                return callback(true, data._id);
            }
            
            callback(false, data);
        });
    }
    
    function deleteDisc(disc, callback) {
        APIService.Delete('/discs/' + disc._id, function(success, data) {
            if (success) {
                var index = _.findIndex(discs, function(disc) {
                    return disc._id == data._id;
                })
                discs.splice(index, 1);
                return callback(true, data._id);
            }
            
            callback(false, data);
        });
    }
    
    function copyDisc(disc, copy) {
        disc.brand = copy.brand;
        disc.name = copy.name;
        disc.type = copy.type;
        disc.material = copy.material;
        disc.weight = copy.weight;
        disc.color = copy.color;
        disc.speed = copy.speed;
        disc.turn = copy.turn;
        disc.glide = copy.bgliderand;
        disc.fade = copy.fade;
        disc.notes = copy.notes;
        disc.condition = copy.condition;
        disc.visible = copy.visible;
        disc.tagList = copy.tagList;
        disc.imageList = copy.imageList;
        disc.primaryImage = copy.primaryImage;
    }

    function getPublicDiscs(userId, callback) {
        if (userId == account._id) {
            callback(true, {discs: discs, user: account});
        }
        else {
            var tasks = [];
            var accReq = $q.defer();
            tasks.push(accReq.promise);
            APIService.Get('/users/' + userId, function(success, data) {
                if (success) {
                    pubAccount = data;
                    accReq.resolve();
                }
                else {
                    pubAccount = undefined;
                    accReq.reject({process: 'Error loading user account.', error: data});
                }
            });

            var discReq = $q.defer();
            tasks.push(discReq.promise);
            APIService.Get('/users/' + userId + '/discs', function(success, data) {
                if (success) {
                    pubDiscs = data;
                    discReq.resolve();
                }
                else {
                    pubDiscs = undefined;
                    discReq.reject({process: 'Error loading user account.', error: data});
                }
            });

            $q.all(tasks).then(function() {
                callback(true, {discs: pubDiscs, user: pubAccount});
            }), function(errorObj) {
                callback(false, errorObj);
            };
        }
    }

    function setPublicState(active) {
        publicActive = active;
    }

    function getActiveDiscList() {
        return publicActive ? pubDiscs : discs;
    }

    function isPublic() {
        return publicActive;
    }
    
    function queryUsers(query) {
        userQuery = query;
        
        if (typeof(query) === 'undefined' || !query.trim().length) {
            users.splice(0, users.length);
            return;
        }
        
        APIService.Get('/users?q=' + query.trim(), function(success, qResults) {
            if (success) {
                if (qResults.query != userQuery) return;
                
                userCache = _.uniq(_.union(userCache,  qResults.results), false, _.property('_id'));
                users.splice(0,users.length);
                qResults.results.forEach(function(v) {users.push(v)}, users);    
            }
        });
    }

    function isAuthenticated() {
        return isLoggedIn;
    }

    return {
        initialize: initialize,
        discs: discs,
        users: users,
        userQuery: userQuery,
        account: account,
        userPrefs: userPrefs,
        getPrimaryImage: getPrimaryImage,
        getColorize: getColorize,
        getDisc: getDisc,
        getPublicDiscs: getPublicDiscs,
        setPublicState: setPublicState,
        updateDisc: updateDisc,
        createDisc: createDisc,
        deleteDisc: deleteDisc,
        getActiveDiscList: getActiveDiscList,
        isPublic: isPublic,
        getUser: getUser,
        queryUsers: queryUsers,
        isAuthenticated: isAuthenticated
    }
}])

.factory('SearchService', ['_', function(_) {
    var searchProps = ['brand', 'name', 'type', 'color', 'weight', 'material', 'tagList'];
    var lastQuery = '';

    function search(query, obj) {
        if (query == '') {
            return true;
        }

        for (var i = 0; i < searchProps.length; i++) {
            var propVal = obj[searchProps[i]];

            if (typeof propVal === 'undefined') continue;

            if (_.isArray(propVal)) {
                for (var j = 0; j < propVal.length; j++) {
                    if (doCompare(query, propVal[j])) {
                        return true;
                    }
                }
            }
            else {
                if (doCompare(query, propVal)) {
                    return true;
                }
            }
        }

        return false;
    }

    function doCompare(query, param) {
        try {
            var value = param.toString().toLowerCase();
            return value.indexOf(query.toLowerCase()) >= 0;
        }
        catch (e) {
            return false;
        }

    }

    return {
        lastQuery: lastQuery,
        search: search
    }
}])

.factory('AutoFillService', ['_', 'APIService', 'DataService', function(_, APIService, DataService) {
    var templates = [];
    var initialized = false;

    function initialize(callback) {
        if (initialized) return callback();

        APIService.Get('/templates', function(success, data) {
            if (success) {
                templates = data;
            }

            initialized = true;
            callback();
        })
    }

    function getOptions(prop, val) {
        if (typeof val === 'undefined') {
            return [];
        }

        var queryArr = prop == 'tagList' ? DataService.discs : templates.concat(DataService.discs);
        var properties = getProperties(queryArr, prop);

        var results = _.filter(properties, function(item) {
            var curItem;

            if (typeof item === 'undefined') {
                return false;
            }

            if (_.isNumber(item)) {
                curItem = String(item);
            }
            else {
                curItem = item;
            }
            return curItem.toLowerCase().indexOf(val.toLowerCase()) >= 0;
        });

        return _.sortBy(results, function(item) {
            return item.toLowerCase();
        });
    }

    function getProperties(items, property) {
        var list = [];
        if (items.length && _.isArray(items[0][property])) {
            var arrList = _.pluck(items, property);
            _.each(arrList, function(arr) {
                list = list.concat(arr);
            });
        }
        else {
            list = _.pluck(items, property);
        }

        return _.uniq(list);
    }


    return {
        initialize: initialize,
        getOptions: getOptions
    }
}])

.factory('FilterService', ['$window', '_', 'DataService', function($window, _, DataService) {
    var filterProps = [{
        property: 'brand',
        text: 'Brand',
        filters: []
    }, {
        property: 'name',
        text: 'Name',
        filters: []
    }, {
        property: 'tagList',
        text: 'Tags',
        filters: []
    }, {
        property: 'type',
        text: 'Type',
        filters: []
    }, {
        property: 'material',
        text: 'Material',
        filters: []
    }, {
        property: 'weight',
        text: 'Weight',
        filters: []
    }, {
        property: 'color',
        text: 'Color',
        filters: []
    }, {
        property: 'speed',
        text: 'Speed',
        filters: []
    }, {
        property: 'glide',
        text: 'Glide',
        filters: []
    }, {
        property: 'turn',
        text: 'Turn',
        filters: []
    }, {
        property: 'fade',
        text: 'Fade',
        filters: []
    }, {
        property: 'condition',
        text: 'Condition',
        filters: []
    }];
    var filterOrder = []; // ['brand', 'name']
    var tempArrFilters = undefined;

    function getFilterCount(prop) {
        var filter = _.findWhere(filterProps, {
            property: prop
        });
        if (filter) {
            return filter.count;
        }

        return 0;
    }
    
    function isFilterActive() {
        var sum = _.reduce(filterProps, function(memo, filter){ return memo + filter.filters.length }, 0);
        return sum > 0;
    }

    function getFilterItem(prop) {
        return _.findWhere(filterProps, {
            property: prop
        });
    }

    function getFilterOptions(prop) {
        var discList = DataService.getActiveDiscList();
        var newFilters = [];

        for (var i = 0; i < filterOrder.length; i++) {
            var filterProp = filterOrder[i];
            if (prop == filterProp) {
                break;
            }
            var filterItem = _.findWhere(filterProps, {
                property: filterProp
            });
            newFilters.push(filterItem);
            discList = executeFilter(discList, newFilters);
        }

        return getProperties(prop, discList);
    }

    function clearFilters() {
        _.each(filterProps, function(filterItem) {
            filterItem.filters = [];
        });

        filterOrder = [];
        tempArrFilters = undefined;
    }

    function setOption(prop, option) {
        var filterItem = _.findWhere(filterProps, {
            property: prop
        });
        if (filterItem) {
            filterItem.filters.push(option);
            if (!_.contains(filterOrder, prop)) {
                filterOrder.push(prop);
            }
        }
        tempArrFilters = undefined;
    }

    function clearOption(prop, option) {
        var filterItem = _.findWhere(filterProps, {
            property: prop
        });
        if (filterItem) {
            filterItem.filters = _.without(filterItem.filters, option);
            if (!filterItem.filters.length) {
                filterOrder = _.without(filterOrder, prop);
            }
        }
        tempArrFilters = undefined;
    }

    function isOptionActive(prop, option) {
        var filter = _.findWhere(filterProps, {
            property: prop
        });
        if (filter) {
            return _.contains(filter.filters, option);
        }

        return false;
    }

    function getFilters(filterList) {
        var arrFilters = {};
        if (!filterList) filterList = filterProps;

        _.each(filterProps, function(filter) {
            arrFilters[filter.property] = filter.filters;
        });
        return arrFilters;
    }

    function filterObj(obj) {
        if (!tempArrFilters) tempArrFilters = getFilters();
        for (var property in tempArrFilters) {
            if (tempArrFilters[property].length > 0) {
                if (_.has(obj, property)) {
                    if (_.isArray(obj[property])) {
                        var hasProp = false;
                        _.each(obj[property], function(propVal) {
                            if (_.contains(tempArrFilters[property], String(propVal))) {
                                hasProp = true;
                            }
                        });
                        if (!hasProp) {
                            return false;
                        }
                    }
                    else {
                        if (!(_.contains(tempArrFilters[property], String(obj[property])))) {
                            return false;
                        }
                    }
                }
                else {
                    if (!_.contains(tempArrFilters[property], 'undefined')) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    function executeFilter(arr, filterList) {
        tempArrFilters = getFilters(filterList);
        var results = _.filter(arr, function(obj) {
            return filterObj(obj, tempArrFilters);
        });

        return results;
    }

    function getProperties(prop, arr) {
        var list = [];
        if (arr.length && _.isArray(arr[0][prop])) {
            var arrList = _.pluck(arr, prop);
            _.each(arrList, function(arr) {
                list = list.concat(arr);
            });
        }
        else {
            list = _.pluck(arr, prop);
        }

        return _.uniq(list);
    }

    return {
        filterProps: filterProps,
        getFilters: getFilters,
        getFilterItem: getFilterItem,
        getFilterOptions: getFilterOptions,
        clearFilters: clearFilters,
        setOption: setOption,
        clearOption: clearOption,
        isOptionActive: isOptionActive,
        executeFilter: executeFilter,
        filterObj: filterObj,
        isFilterActive: isFilterActive
    }
}])

.factory('SortService', ['$window', '$rootScope', '_', 'DataService',
    function($window, $rootScope, _, DataService) {
        var sortItems = [{
            property: 'brand',
            text: 'Brand',
            sortOn: true,
            sortAsc: false,
            sortOrder: 0,
            type: 'text'
        }, {
            property: 'name',
            text: 'Name',
            sortOn: true,
            sortAsc: false,
            sortOrder: 1,
            type: 'text'
        }, {
            property: 'type',
            text: 'Type',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'text'
        }, {
            property: 'material',
            text: 'Material',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'text'
        }, {
            property: 'weight',
            text: 'Weight',
            sortOn: false,
            sortAsc: false,
            sortOrder: 1,
            type: 'number'
        }, {
            property: 'color',
            text: 'Color',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'text'
        }, {
            property: 'speed',
            text: 'Speed',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'number'
        }, {
            property: 'glide',
            text: 'Glide',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'number'
        }, {
            property: 'turn',
            text: 'Turn',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'number'
        }, {
            property: 'fade',
            text: 'Fade',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'number'
        }, {
            property: 'condition',
            text: 'Condition',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'number'
        }, {
            property: 'createDate',
            text: 'Create Date',
            sortOn: false,
            sortAsc: false,
            sortOrder: -1,
            type: 'date'
        }];

        $rootScope.$on('DZUserPrefsUpdated', function() {
            setUserPrefs();
        });

        function setUserPrefs() {
            _.each(sortItems, function(sortItem) {
                sortItem.sortOn = false;
                sortItem.sortOrder = -1;
            });
            
            _.each(DataService.userPrefs.defaultSort, function(pref) {
                addSortItem(pref.property, pref.sortAsc);
            });
        }

        function addSortItem(prop, asc) {
            var i = _.max(_.pluck(sortItems, 'sortOrder')) + 1;
            var sortItem = _.findWhere(sortItems, {
                property: prop
            });
            if (sortItem) {
                sortItem.sortOn = true;
                sortItem.sortAsc = asc;
                sortItem.sortOrder = i;
            }
        }

        function clearSort(prop) {
            var sortItem = _.findWhere(sortItems, {
                property: prop
            });
            var activeCount = _.where(sortItems, {
                sortOn: true
            }).length;
            if (sortItem && activeCount > 1) {
                var sortOrder = sortItem.sortOrder;
                sortItem.sortOn = false;
                sortItem.sortOrder = -1;

                _.each(sortItems, function(sortItem) {
                    if (sortItem.sortOn) {
                        if (sortItem.sortOrder >= sortOrder) {
                            sortItem.sortOrder -= 1;
                        }
                    }
                });
            }
        }

        function updateSortOrder(prop, fromIndex, toIndex) {
            var updateItem = _.findWhere(sortItems, {
                property: prop
            });
            _.each(sortItems, function(sortItem) {
                if (sortItem.sortOn) {
                    if (sortItem.sortOrder >= toIndex &&
                        sortItem.sortOrder < fromIndex) {
                        sortItem.sortOrder += 1;
                    }
                }
            });

            updateItem.sortOrder = toIndex;
        }

        function getSortString() {
            var sortArray = [];
            var toSort = _.sortBy(_.where(sortItems, {
                sortOn: true
            }), 'sortOrder');
            _.each(toSort, function(sortItem) {
                sortArray.push((sortItem.sortAsc ? '+' : '-') + sortItem.property);
            });
            return sortArray.toString();
        }

        function executeSort(arr) {
            var toSort = _.sortBy(_.where(sortItems, {
                sortOn: true
            }), 'sortOrder');
            if (!toSort.length) {
                return arr;
            }
            return groupAndSort(arr, toSort, 0);
        }

        function groupAndSort(sorted, toSort, i) {
            if (i == toSort.length) {
                sorted = genericSort(toSort[i - 1], sorted);
                return sorted;
            }

            var sorter = toSort[i];

            if (i == 0) {
                sorted = genericSort(sorter, groupAndSort(sorted, toSort, i + 1));
                return sorted;
            }
            else {
                var grouper = toSort[i - 1];
                var grouped = _.groupBy(sorted, function(obj) {
                    return obj[grouper.property];
                });
                var newArray = [];
                _.each(grouped, function(valArray) {
                    valArray = genericSort(sorter, groupAndSort(valArray, toSort, i + 1));
                    newArray = newArray.concat(valArray);
                });
                sorted = newArray;
                return sorted;
            }
        }

        function genericSort(sorter, array) {
            if (sorter.type == 'number') {
                array = _.sortBy(array, function(obj) {
                    return parseInt(obj[sorter.property])
                });
            }
            else if (sorter.type == 'date') {
                array = _.sortBy(array, function(obj) {
                    return new Date(obj[sorter.property])
                });
            }
            else {
                array = _.sortBy(array, function(obj) {
                    return obj[sorter.property] ?
                        obj[sorter.property].toLowerCase() :
                        undefined;
                });
            }

            if (!sorter.sortAsc) {
                array = array.reverse();
            }

            return array;
        }

        return {
            sortItems: sortItems,
            addSortItem: addSortItem,
            updateSortOrder: updateSortOrder,
            clearSort: clearSort,
            getSortString: getSortString,
            executeSort: executeSort,
            setUserPrefs: setUserPrefs
        }
    }
])

.factory('ImageService', function() {

    var detectVerticalSquash = function(img) {
        var alpha, canvas, ctx, data, ey, ih, iw, py, ratio, sy;
        iw = img.naturalWidth;
        ih = img.naturalHeight;
        canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = ih;
        ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        data = ctx.getImageData(0, 0, 1, ih).data;
        sy = 0;
        ey = ih;
        py = ih;
        while (py > sy) {
            alpha = data[(py - 1) * 4 + 3];
            if (alpha === 0) {
                ey = py;
            }
            else {
                sy = py;
            }
            py = (ey + sy) >> 1;
        }
        ratio = py / ih;
        if (ratio === 0) {
            return 1;
        }
        else {
            return ratio;
        }
    };

    var drawImageIOSFix = function(o, ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
        // console.log('Just used orientation: ' + o);
        var vertSquashRatio, transX, transY;
        vertSquashRatio = detectVerticalSquash(img);
        dh = dh / vertSquashRatio;

        transX = Math.abs(o) == 90 ? dx + dh / 2 : dx + dw / 2;
        transY = Math.abs(o) == 90 ? dy + dw / 2 : dy + dh / 2;

        ctx.translate(transX, transY);
        ctx.rotate(-1 * o * Math.PI / 180);
        dx = -dw / 2;
        dy = -dh / 2;
        return ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

    };

    var fixImageOrientation = function(file, callback) {

        var fileReader;
        fileReader = new FileReader;
        fileReader.onload = function() {
            var img;
            img = document.createElement('img');
            img.onload = function() {
                var orientation = 0;
                EXIF.getData(img, function() {
                    switch (parseInt(EXIF.getTag(this, "Orientation"))) {
                        case 3:
                            orientation = 180;
                            break;
                        case 6:
                            orientation = -90;
                            break;
                        case 8:
                            orientation = 90;
                            break;
                    }

                    var canvas, ctx, dataURL;
                    var targetWidth, targetHeight;
                    file.width = img.naturalWidth;
                    file.height = img.naturalHeight;

                    targetWidth = file.width;
                    targetHeight = file.height;

                    canvas = document.createElement("canvas");
                    ctx = canvas.getContext("2d");
                    canvas.width =  Math.abs(orientation) == 90 ? targetHeight : targetWidth;
                    canvas.height = Math.abs(orientation) == 90 ? targetWidth : targetHeight;
                    drawImageIOSFix(orientation, ctx, img, 0, 0, img.width, img.height, 0, 0, targetWidth, targetHeight);
                    dataURL = canvas.toDataURL(file.type, 0.6);
                    callback(dataURL);
                });
            }
            img.onerror = callback;
            img.src = fileReader.result;
        };
        fileReader.readAsDataURL(file);
    }

    var dataURItoBlob = function(dataURI) {
        var byteString = atob(dataURI.split(',')[1]);
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], {
            type: 'image/jpeg'
        });
    }

    return {
        getDataUri: fixImageOrientation,
        dataURItoBlob: dataURItoBlob
    }
});