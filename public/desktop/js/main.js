var app = angular.module('disczump', ['ngRoute', 'ngAnimate', 'smoothScroll', 'as.sortable', 'oc.lazyLoad', 'uiSwitch', 'disczump.controllers']);
    
app.config(['$routeProvider', '$httpProvider', '$locationProvider', function($routeProvider, $httpProvider, $locationProvider) {
    if (!$httpProvider.defaults.headers.get) {
        $httpProvider.defaults.headers.get = {};    
    }
//     $httpProvider.defaults.headers.get['If-Modified-Since'] = 'Mon, 26 Jul 1997 05:00:00 GMT';
//     $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
//     $httpProvider.defaults.headers.get['Pragma'] = 'no-cache';
    
    $routeProvider.when('/', {
        templateUrl: '/static/desktop/templates/portal.html',
        controller: 'PortalController',
        reloadOnSearch: false
    }).when('/explore', {
        templateUrl: '/static/desktop/templates/explore.html',
        controller: 'ExploreController',
        reloadOnSearch: false
    }).when('/trunks/:userId', {
        templateUrl: '/static/desktop/templates/explore.html',
        controller: 'ExploreController',
        reloadOnSearch: false
    }).when('/trunks', {
        templateUrl: '/static/desktop/templates/trunks.html',
        controller: 'TrunksController',
        reloadOnSearch: false
    }).when('/d/create/templates', {
        templateUrl: '/static/desktop/templates/discTemplates.html',
        controller: 'DiscTemplateController',
        reloadOnSearch: false
    }).when('/d/create', {
        templateUrl: '/static/desktop/templates/modifyDisc.html',
        controller: 'ModifyDiscController',
        reloadOnSearch: false
    }).when('/d/:discId', {
        templateUrl: '/static/desktop/templates/disc.html',
        controller: 'DiscController',
        reloadOnSearch: false
    }).when('/d/:discId/edit', {
        templateUrl: '/static/desktop/templates/modifyDisc.html',
        controller: 'ModifyDiscController',
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
    }).otherwise({
        templateUrl: '/static/desktop/templates/redirect.html',
        controller: 'RedirectController',
        reloadOnSearch: false
    });
    // }).otherwise({ redirectTo: '/' });
    
    $locationProvider.html5Mode(true);
}]);

app.run(['$location', 'ConfigService', function($location, ConfigService) {
    ConfigService.initUrl($location.absUrl());
}]);