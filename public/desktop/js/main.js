var app = angular.module('disczump', ['ngRoute', 'ngAnimate', 'smoothScroll', 'as.sortable', 'oc.lazyLoad', 'uiSwitch', 'disczump.controllers']);

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
    
app.config(['$routeProvider', '$httpProvider', '$locationProvider', function($routeProvider, $httpProvider, $locationProvider) {
    if (!$httpProvider.defaults.headers.get) {
        $httpProvider.defaults.headers.get = {};    
    }
    
    $routeProvider.when('/', {
        templateUrl: '/static/desktop/templates/portal.html',
        controller: 'PortalController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/about', {
        templateUrl: '/static/desktop/templates/about.html',
        controller: 'AboutController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/faq', {
        templateUrl: '/static/desktop/templates/faq.html',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/privacy', {
        templateUrl: '/static/desktop/templates/privacy.html',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/terms', {
        templateUrl: '/static/desktop/templates/terms.html',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/explore', {
        templateUrl: '/static/desktop/templates/explore.html',
        controller: 'ExploreController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/trunks/:userId', {
        template: '',
        controller: 'TrunkLookupController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/t/:username', {
        templateUrl: '/static/desktop/templates/explore.html',
        controller: 'ExploreController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/trunks', {
        templateUrl: '/static/desktop/templates/trunks.html',
        controller: 'TrunksController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/d/create/templates', {
        templateUrl: '/static/desktop/templates/discTemplates.html',
        controller: 'DiscTemplateController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/d/create', {
        templateUrl: '/static/desktop/templates/modifyDisc.html',
        controller: 'ModifyDiscController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/d/:discId', {
        templateUrl: '/static/desktop/templates/disc.html',
        controller: 'DiscController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/d/:discId/edit', {
        templateUrl: '/static/desktop/templates/modifyDisc.html',
        controller: 'ModifyDiscController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/dashboard', {
        templateUrl: '/static/desktop/templates/dashboard.html',
        controller: 'DashboardController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/inbox', {
        templateUrl: '/static/desktop/templates/inbox.html',
        controller: 'MessageController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/membership/result', {
        templateUrl: '/static/desktop/templates/accountChangeResult.html',
        controller: 'AccountChangeResultController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/membership/process', {
        templateUrl: '/static/desktop/templates/doAccountChange.html',
        controller: 'AccountChangeController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/membership/', {
        templateUrl: '/static/desktop/templates/accountChange.html',
        controller: 'AccountChangeSelController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/adjust', {
        templateUrl: '/static/desktop/templates/changePayment.html',
        controller: 'AccountAdjustController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/reset', {
        templateUrl: '/static/desktop/templates/reset.html',
        controller: 'ResetController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/verifications/', {
        templateUrl: '/static/desktop/templates/verifications.html',
        controller: 'VerificationsController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account/delete/:authorizationId', {
        templateUrl: '/static/desktop/templates/confirmDelete.html',
        controller: 'DeleteController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/account', {
        templateUrl: '/static/desktop/templates/account.html',
        controller: 'AccountController',
        reloadOnSearch: false,
        resolve: resolveFb
    }).when('/login', {
        templateUrl: '/static/desktop/templates/login.html',
        controller: 'LoginController',
        reloadOnSearch: false,
        resolve: resolveFb
    }).when('/signup', {
        templateUrl: '/static/desktop/templates/signup.html',
        controller: 'SignupController',
        reloadOnSearch: false,
        resolve: resolveFb
    }).when('/logout', {
        templateUrl: '/static/desktop/templates/logout.html',
        controller: 'LogoutController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/confirm/:authorizationId', {
        templateUrl: '/static/desktop/templates/confirm.html',
        controller: 'ConfirmController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/recover/:authorizationId', {
        templateUrl: '/static/desktop/templates/reset.html',
        controller: 'ResetController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/recover', {
        templateUrl: '/static/desktop/templates/recover.html',
        controller: 'RecoverController',
        reloadOnSearch: false,
        resolve: resolve
    }).when('/unsubscribe', {
        templateUrl: '/static/desktop/templates/unsubscribe.html',
        controller: 'UnsubscribeController',
        reloadOnSearch: false,
        resolve: resolve
    }).otherwise({
        templateUrl: '/static/desktop/templates/redirect.html',
        controller: 'RedirectController',
        reloadOnSearch: false,
        resolve: resolve
    });
    // }).otherwise({ redirectTo: '/' });
    
    $locationProvider.html5Mode(true);
}]);

app.run(['$location', function($location) {
}]);