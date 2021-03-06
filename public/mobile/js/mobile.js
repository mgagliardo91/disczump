var app = angular.module('disczump', ['ngRoute', 'ngAnimate', 'mobile-angular-ui', 'mobile-angular-ui.gestures', 'as.sortable', 'oc.lazyLoad', 'ngclipboard', 'disczump.controllers']);
app.config(['$routeProvider', '$httpProvider', function($routeProvider, $httpProvider) {
    if (!$httpProvider.defaults.headers.get) {
        $httpProvider.defaults.headers.get = {};    
    }
    $httpProvider.defaults.headers.get['If-Modified-Since'] = 'Mon, 26 Jul 1997 05:00:00 GMT';
    $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
    $httpProvider.defaults.headers.get['Pragma'] = 'no-cache';
    
    console.log($routeProvider);
    
    $routeProvider.when('/', {
        templateUrl: '/static/mobile/templates/dashboard.html',
        controller: 'DashboardController',
        reloadOnSearch: false
    }).when('/d/:userId', {
        templateUrl: '/static/mobile/templates/dashboard.html',
        controller: 'DashboardController',
        reloadOnSearch: false
    }).when('/disc/create', {
        templateUrl: '/static/mobile/templates/modifyDisc.html', 
        controller: 'ModifyDiscController',
        reloadOnSearch: false
    }).when('/disc/:discId', {
        templateUrl: '/static/mobile/templates/disc.html', 
        controller: 'DiscController',
        reloadOnSearch: false
    }).when('/disc/:discId/edit', {
        templateUrl: '/static/mobile/templates/modifyDisc.html', 
        controller: 'ModifyDiscController',
        reloadOnSearch: false
    }).when('/disc/:discId/images', {
        templateUrl: '/static/mobile/templates/discImages.html', 
        controller: 'DiscImageController',
        reloadOnSearch: false
    }).when('/filter', {
        templateUrl: '/static/mobile/templates/filterList.html',
        controller: 'FilterListController',
        reloadOnSearch: false
    }).when('/filter/:filterProp', {
        templateUrl: '/static/mobile/templates/filterProp.html',
        controller: 'FilterPropController',
        reloadOnSearch: false
    }).when('/sort', {
        templateUrl: '/static/mobile/templates/sortList.html',
        controller: 'SortListController',
        reloadOnSearch: false
    }).when('/sort/add', {
        templateUrl: '/static/mobile/templates/sortProp.html',
        controller: 'SortPropController',
        reloadOnSearch: false
    }).when('/settings', {
        templateUrl: '/static/mobile/templates/settings.html',
        controller: 'SettingsController',
        reloadOnSearch: false
    }).when('/profile', {
        templateUrl: '/static/mobile/templates/profileList.html',
        controller: 'ProfileListController',
        reloadOnSearch: false
    }).when('/profile/:userId', {
        templateUrl: '/static/mobile/templates/profile.html', 
        controller: 'ProfileController',
        reloadOnSearch: false
    }).otherwise({ redirectTo: '/' });
}]);

app.run(['$location', 'ConfigService', function($location, ConfigService) {
    ConfigService.initUrl($location.absUrl());
}]);