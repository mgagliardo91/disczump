var app = angular.module('disczump', ['ngRoute', 'ngAnimate', 'disczump.controllers']);
    
app.config(['$routeProvider', '$httpProvider', '$locationProvider', function($routeProvider, $httpProvider, $locationProvider) {
    if (!$httpProvider.defaults.headers.get) {
        $httpProvider.defaults.headers.get = {};    
    }
    $httpProvider.defaults.headers.get['If-Modified-Since'] = 'Mon, 26 Jul 1997 05:00:00 GMT';
    $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
    $httpProvider.defaults.headers.get['Pragma'] = 'no-cache';
    
    $routeProvider.when('/', {
        templateUrl: '/static/desktop/templates/portal.html',
        controller: 'PortalController',
        reloadOnSearch: false
    }).when('/explore', {
        templateUrl: '/static/desktop/templates/explore.html',
        controller: 'ExploreController',
        reloadOnSearch: false
    }).when('/trunk/:userId', {
        templateUrl: '/static/desktop/templates/trunk.html',
        controller: 'TrunkController',
        reloadOnSearch: false
    }).when('/d/:discId', {
        templateUrl: '/static/desktop/templates/disc.html',
        controller: 'DiscController',
        reloadOnSearch: false
    }).when('/newsfeed', {
        templateUrl: '/static/desktop/templates/newsfeed.html',
        controller: 'NewsfeedController',
        reloadOnSearch: false
    }).when('/dashboard', {
        templateUrl: '/static/desktop/templates/dashboard.html',
        controller: 'DashboardController',
        reloadOnSearch: false
    }).when('/inbox', {
        templateUrl: '/static/desktop/templates/inbox.html',
        controller: 'MessageController',
        reloadOnSearch: false
    }).when('/account', {
        templateUrl: '/static/desktop/templates/account.html',
        controller: 'AccountController',
        reloadOnSearch: false
    }).otherwise({ redirectTo: '/' });
    
    $locationProvider.html5Mode(true);
}]);

app.run(['$location', 'ConfigService', function($location, ConfigService) {
    ConfigService.initUrl($location.absUrl());
}]);