var app = angular.module('disczump', ['ngRoute', 'ngAnimate', 'smoothScroll', 'as.sortable', 'oc.lazyLoad', 'uiSwitch', 'disczump.controllers']);

var resolveForce = {
    account: ['StartUp', function(StartUp){
        return StartUp.init(true);
    }]
}

var resolve = {
    account: ['StartUp', function(StartUp){
        return StartUp.init();
    }]
}

var resolveFb = {
    account: resolve.account,
    fbInit: ['FacebookUtils', function(FacebookUtils){
        return FacebookUtils.initFacebook();
    }]
}

var resolveForceFb = {
    account: resolveForce.account,
    fbInit: ['FacebookUtils', function(FacebookUtils){
        return FacebookUtils.initFacebook();
    }]
}
    
app.config(['$routeProvider', '$httpProvider', '$locationProvider', function($routeProvider, $httpProvider, $locationProvider) {
    if (!$httpProvider.defaults.headers.get) {
        $httpProvider.defaults.headers.get = {};    
    }
    
    $routeProvider.when('/', {
        templateUrl: '/static/src/templates/portal.html',
        controller: 'PortalController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/about', {
        templateUrl: '/static/src/templates/about.html',
        controller: 'AboutController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/faq', {
        templateUrl: '/static/src/templates/faq.html',
        controller: 'FAQController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/privacy', {
        templateUrl: '/static/src/templates/privacy.html',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/terms', {
        templateUrl: '/static/src/templates/terms.html',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/explore', {
        templateUrl: '/static/src/templates/explore.html',
        controller: 'ExploreController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/trunks/:userId', {
        template: '',
        controller: 'TrunkLookupController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/t/:username', {
        templateUrl: '/static/src/templates/explore.html',
        controller: 'ExploreController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/trunks', {
        templateUrl: '/static/src/templates/trunks.html',
        controller: 'TrunksController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/d/create/templates', {
        templateUrl: '/static/src/templates/discTemplates.html',
        controller: 'DiscTemplateController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/d/create', {
        templateUrl: '/static/src/templates/modifyDisc.html',
        controller: 'ModifyDiscController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/d/:discId', {
        templateUrl: '/static/src/templates/disc.html',
        controller: 'DiscController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/d/:discId/edit', {
        templateUrl: '/static/src/templates/modifyDisc.html',
        controller: 'ModifyDiscController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/dashboard', {
        templateUrl: '/static/src/templates/dashboard.html',
        controller: 'DashboardController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/inbox', {
        templateUrl: '/static/src/templates/inbox.html',
        controller: 'MessageController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/membership/result', {
        templateUrl: '/static/src/templates/accountChangeResult.html',
        controller: 'AccountChangeResultController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/membership/process', {
        templateUrl: '/static/src/templates/doAccountChange.html',
        controller: 'AccountChangeController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/membership/', {
        templateUrl: '/static/src/templates/accountChange.html',
        controller: 'AccountChangeSelController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/adjust', {
        templateUrl: '/static/src/templates/changePayment.html',
        controller: 'AccountAdjustController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/reset', {
        templateUrl: '/static/src/templates/reset.html',
        controller: 'ResetController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/verifications/', {
        templateUrl: '/static/src/templates/verifications.html',
        controller: 'VerificationsController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/delete/:authorizationId', {
        templateUrl: '/static/src/templates/confirmDelete.html',
        controller: 'DeleteController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account', {
        templateUrl: '/static/src/templates/account.html',
        controller: 'AccountController',
        reloadOnSearch: false,
        resolve: resolveForceFb
    }).when('/login', {
        templateUrl: '/static/src/templates/login.html',
        controller: 'LoginController',
        reloadOnSearch: false,
        resolve: resolveFb
    }).when('/signup', {
        templateUrl: '/static/src/templates/signup.html',
        controller: 'SignupController',
        reloadOnSearch: false,
        resolve: resolveFb
    }).when('/logout', {
        templateUrl: '/static/src/templates/logout.html',
        controller: 'LogoutController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/confirm/:authorizationId', {
        templateUrl: '/static/src/templates/confirm.html',
        controller: 'ConfirmController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/confirm', {
        templateUrl: '/static/src/templates/confirmInit.html',
        controller: 'ConfirmInitController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/recover/:authorizationId', {
        templateUrl: '/static/src/templates/reset.html',
        controller: 'ResetController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/recover', {
        templateUrl: '/static/src/templates/recover.html',
        controller: 'RecoverController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/unsubscribe', {
        templateUrl: '/static/src/templates/unsubscribe.html',
        controller: 'UnsubscribeController',
        reloadOnSearch: false,
        resolve: resolve
    }).otherwise({
        templateUrl: '/static/src/templates/redirect.html',
        controller: 'RedirectController',
        reloadOnSearch: false,
        resolve: resolve
    });
    // }).otherwise({ redirectTo: '/' });
    
    $locationProvider.html5Mode(true);
}]);

app.run(['PageCache', function(PageCache) {
    PageCache.init();
}]);