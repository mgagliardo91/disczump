var siteUrl = 'https://www.disczump.com';
var dzID = '1433417853616595';

angular.module('disczump.controllers', ['disczump.services'])

/******************************************************************************
* 
* DIRECTIVES
* 
*******************************************************************************/

/******************************************************************************
* Name:         dropzone
* Type:         Attribute
* Description:  Interface to allow dropzone-specific parameters to
*               be added to the element within it's scope.
*******************************************************************************/
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

/******************************************************************************
* Name:         imageCropper
* Type:         Element
* Description:  Creates an element to handle cropping images using the 
*               cropper.js library.
*******************************************************************************/
.directive('imageCropper', ['$window', 'ImageService', 
    function($window, ImageService) {
        return {
            restrict: 'E',
            scope: {
                cropperOptions: "="
            },
            template: '<div class="image-cropper backdrop" ng-show="show">' +
                '<div class="image-container"><div class="image-area" ' + 
                    'style="margin-top: {{margin}}px;" id="image-parent">' +
                '</div></div>' +
                '<div class="dual-item-row cropper-footer">' +
                '<button type="button" class="dual-item btn btn-block ' + 
                    'btn-primary" ng-click="cancel($event)">Cancel</button>' +
                '<button type="button" class="dual-item btn btn-block ' + 
                    'btn-primary" ng-click="finish($event)">Finish</button>' +
                '<div class="clearfix"></div>' +
                '</div>' +
                '</div>',
            replace: true,
            link: function(scope, element, attrs) {
                var cropper, imageName, imageSrc;
                scope.show = false;
                scope.width = $window.innerWidth - 40;
                scope.margin = ($window.innerHeight - 50 - scope.width) / 2;
    
                scope.cropperOptions.showCropper = function(name, src) {
                    imageName = name;
                    imageSrc = src;
                    scope.safeApply(function() {
                        scope.show = true;
                    });
                    var parent = document.getElementById('image-parent');
                    parent.innerHTML = '<img src="' + src + '" id="test-crop"' + 
                        ' filename="' + name + '" style="width:' + scope.width +
                            'px;height:' + scope.width + 'px"/>';
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
            }
        }
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

/******************************************************************************
* Name:         errorModal
* Type:         Element
* Description:  Creates a modal element used to display errors based on an 
*               errorOptions attribute.
*******************************************************************************/
.directive('errorModal', function() {
    return {
        scope: {
            errorOptions: '='
        },
        restrict: 'E',
        template: '<div class="backdrop" ng-show="errorOptions.active">' +
                    '<div class="dz-modal">' +
                        '<div class="dz-modal-icon modal-row"><span>' + 
                            '<i class="fa fa-exclamation-triangle"></i>' + 
                        '</span></div>' +
                        '<div class="dz-modal-title modal-row">' + 
                            '{{errorOptions.title}}</div>' +
                        '<div class="dz-modal-text-container modal-row">' +
                            '<div class="dz-modal-label">Details:</div>' +
                            '<div class="dz-modal-details">' + 
                                '{{errorOptions.customText}} ' +
                                '{{errorOptions.errorText}}' +
                            '</div>' +
                        '</div>' +
                        '<div class="dz-modal-btn close-modal" ' + 
                            'ng-click="close()">Close</div>' +
                    '</div>' +
                '</div>',
        replace: true,
        link: function(scope, element, attrs) {
            
            scope.close = function() {
                scope.errorOptions.active = false;
                if (scope.errorOptions.onClose) {
                    scope.errorOptions.onClose();
                }
            }
        }
    };
})

/******************************************************************************
* Name:         infiniteScroll
* Type:         Attribute
* Description:  Calls a defined function when the associated element reaches the
*               bottom of it's scrolling area.
*******************************************************************************/
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

/******************************************************************************
* Name:         focusOn
* Type:         Attribute
* Description:  Triggers a focus on the associated element when a condition 
*               raises.
*******************************************************************************/
.directive('focusOn', ['$timeout', function($timeout) {
    return {
        restrict: 'A',
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

/******************************************************************************
* Name:         dzFill
* Type:         Attribute
* Description:  Placing this directive on an input box will create an auto-
*               complete area that uses the AutoFillService to create a list
*               of matching results based on the input's current value.
*******************************************************************************/
.directive('dzFill', ['$compile', 'AutoFillService', 
    function($compile, AutoFillService) {
        return {
            restrict: 'A',
            scope: {
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
                var resultList = angular.element(
                    '<ul ng-show="fill.results.length && fill.interact &&' + 
                        '!fill.selected" class="auto-fill-list">' + 
                        '<li ng-repeat="result in fill.results | limitTo:20" ' + 
                            'ng-click="setValue(result)">{{result}}</li></ul>');
    
    
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
                    scope.fill.results = 
                        AutoFillService.getOptions(attrs.dzFill, newValue);
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

/******************************************************************************
* Name:         ngEnter
* Type:         Attribute
* Description:  Calls a function when the enter key is pressed on an element
*******************************************************************************/
.directive('ngEnter', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if (event.which === 13) {
                scope.$apply(attrs.ngEnter);
                event.preventDefault();
            }
        });
    };
})

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
.controller('MainController', ['$scope', '$location', '$window', '$document', 'DataService',
    function($scope, $location, $window, $document, DataService) {
        
        $scope.errorOpts = {
            active: false
        };
        
        $scope.setUrl = function(url) {
            siteUrl = url;
            $scope.init();
        }
        
        $scope.toast = function(message) {
            var currents = angular.element(document.querySelector('.toast'));
            currents.remove();
            
            var body = $document.find('body').eq(0);
            var div = angular.element('<div class="toast" id="toast"><div>' + message + '</div></div>');
            body.append(div);
            
            var toast = document.getElementById('toast');
            toast.addEventListener("animationend", function() {
                div.remove();
            }, false);
            
            div.addClass('fade-out');
        }
        
        $scope.showError = function(obj, title, customText, errorText, 
            onClose) {
            obj.title = title;
            obj.customText = customText;
            obj.errorText = errorText;
            obj.onClose = onClose;
            obj.active = true;
        }
        
        $scope.init = function() {
            DataService.initialize(function(success, retData) {
                if (success) {
                    console.log('Initialized');
                } else {
                    $scope.showError($scope.errorOpts, retData.type, 
                        'Error initializing.', retData.message, function() {
                        $location.path('/');
                    });
                }
            });
        }

        $scope.goBack = function() {
            $window.history.back();
        }

        $scope.nav = function(url, replace) {
            $location.path('/' + (url ? url : ''));
            
            if (replace) {
                $location.replace();
            }
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
        };
    }
])

/******************************************************************************
* Name:         DashboardController
* Description:  Handles obtaining and organizing a disc list for a user
*******************************************************************************/
.controller('DashboardController', ['$scope', '$routeParams', 'DataService', 
    'FilterService', 'SearchService',
    function($scope, $routeParams, DataService, FilterService, SearchService) {
        $scope.discList = undefined;
        $scope.userPrefs = DataService.userPrefs;
        $scope.filterDisc = FilterService.filterObj;
        $scope.query = SearchService.lastQuery.valueOf();
        $scope.searchFocus = 
            $scope.searchActive = SearchService.lastQuery.valueOf().length > 0;
        $scope.loadSize = 20;
        $scope.title = 'Loading...';
        $scope.filtering = FilterService.isFilterActive();

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

        $scope.loadMore = function() {
            $scope.loadSize = 
                Math.min($scope.discList.length, $scope.loadSize + 20);
        }

        $scope.loading = true;
        if ($routeParams.userId) {
            DataService.getPublicDiscs($routeParams.userId, 
                function(success, retData) {
                    $scope.loading = false;
                    if (success) {
                        if (!DataService.isPublic()) {
                            DataService.setPublicState(true);
                            FilterService.clearFilters();
                        }
        
                        $scope.discList = retData.discs;
                        $scope.title = (retData.user ? 
                            retData.user.username + '\'s Discs' : 'Unknown');
                    } else {
                        $scope.showError($scope.errorOpts, retData.type, 
                        'Error retrieving public discs.', retData.message, 
                        function() {
                        $scope.nav();
                    });
                    }
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

/******************************************************************************
* Name:         ProfileListController
* Description:  Handles obtaining and organizing a user profile list
*******************************************************************************/
.controller('ProfileListController', ['$scope', 'DataService', 
    function($scope, DataService) {
        $scope.userList = DataService.users;
        $scope.query = DataService.userQuery;
        
        $scope.$watch('query', function(value) {
            DataService.queryUsers($scope.query);
        });

        $scope.$on("$destroy", function() {
            DataService.userQuery = $scope.query.valueOf();
        });

        $scope.loading = false;
        $scope.searchFocus = true;
    }
])

/******************************************************************************
* Name:         ProfileController
* Description:  Handles obtaining and displaying a user's profile
*******************************************************************************/
.controller('ProfileController', ['$scope', '$routeParams', 'DataService',
    function($scope, $routeParams, DataService) {
        $scope.user = undefined;
        $scope.preview = undefined;
        $scope.dropdown = false;
        $scope.title = 'Loading...';
    
        $scope.errorOpts = {
            active: false
        }
    
        $scope.loading = true;
        DataService.getUser($routeParams.userId, function(success, retData) {
            $scope.loading = false;
            if (success) {
                $scope.user = retData.user;
                $scope.preview = retData.preview;
                $scope.title = $scope.user.username;
            } else {
                $scope.showError($scope.errorOpts, retData.type, 
                'Error loading profile.', retData.message, function() {
                    $scope.nav();
                });
            }
        });

    }
])

/******************************************************************************
* Name:         ModifyDiscController
* Description:  Handles creating/editing discs
*******************************************************************************/
.controller('ModifyDiscController', ['$scope', '$window', '$routeParams', 
    '$ocLazyLoad', '_', 'AutoFillService', 'DataService', 'ImageService',
    function($scope, $window, $routeParams, $ocLazyLoad, _, AutoFillService, 
        DataService, ImageService) {
        var dropzoneTemplate = '<div class="image-item">' +
            '<img data-dz-thumbnail />' + 
            '<div class="image-loading" style="width:' + 
                $scope.imgSize + 'px;height:' + $scope.imgSize + 
                'px;"><i class="fa fa-spinner fa-spin"></i></div>' +
            '<div class="image-progress" data-dz-uploadprogress></div>' +
            '</div>';
            
        $scope.disc = {visible: true, tagList: [],imageList: []};
        $scope.temp = {tag: '',tagOptions: [],focus: false};
        $scope.errorOpts = {active: false};
        $scope.forms = {};
        $scope.settings = {
            page: 0,
            editMode: typeof $routeParams.discId !== 'undefined',
            loading: true,
            modulesLoaded: false,
            dropzoneProcessing: false
        };
        $scope.imgSize = Math.floor(($window.innerWidth - 48) / 3);
            
        $scope.dropzoneConfig = {
            options: {
                url: '/api/images',
                method: "POST",
                thumbnailWidth: $scope.imgSize,
                thumbnailHeight: $scope.imgSize,
                parallelUploads: 10,
                maxFiles: 10,
                paramName: 'discImage',
                previewTemplate: dropzoneTemplate,
                acceptedFiles: "image/*",
                autoProcessQueue: true,
                previewsContainer: '#dropzone-container',
                clickable: '#add-image',
                accept: function(file, done) {
                    if (this.files[10] != null) {
                        return this.removeFile(this.files[10]);
                    }
                    
                    if (file.cropped || file.width < 200) {
                        $scope.discImageCropper.cropperLoading = false;
                        $scope.settings.dropzoneProcessing = true;
                        $scope.safeApply();
                        return done();
                    }
                    
                    
                    $scope.discImageCropper.cropperLoading = true;
                    $scope.safeApply();
                    $scope.dropzoneConfig.getDropzone().removeFile(file);
                    ImageService.getDataUri(file, function(dataUri) {
                        $scope.discImageCropper.showCropper(file.name, dataUri);
                    });
                    
                    return done('Processing');
                },
            },
            'eventHandlers': {
                'success': function(file, response) {
                    if (typeof response._id !== 'undefined') {
                        $scope.disc.imageList.push(response);
                        
                        if ($scope.disc.imageList.length == 1) {
                            $scope.disc.primaryImage = response._id;
                        }
                        $scope.safeApply();
                    }
                    this.removeFile(file);
                },
                'queuecomplete': function() {
                    $scope.safeApply(function() {
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

        $scope.$watch('temp.tag', function(newValue, oldValue) {
            if (!$scope.temp.tag.length) {
                return $scope.temp.tagOptions = [];
            }

            $scope.temp.tagOptions = AutoFillService.getOptions('tagList', 
                newValue);
        });

        $scope.appendTag = function(tag, reset) {
            if (!tag.length) return;

            if (!_.contains($scope.disc.tagList, tag)) {
                $scope.disc.tagList.push(tag);
            }

            if (reset) $scope.temp.tag = '';

            $scope.temp.focus = true;
        }

        $scope.resetDisc = function() {
            $scope.disc = {visible: true, tagList: [],imageList: []};
            $scope.settings.page = 0;
            $scope.temp.resetDisc = false;
        }

        $scope.removeTag = function() {
            if ($scope.temp.activeTag) {
                $scope.disc.tagList = _.without($scope.disc.tagList, 
                    $scope.temp.activeTag);
                $scope.temp.activeTag = undefined;
            }
        }

        $scope.selectImage = function(id, thumbnail) {
            $scope.temp.activeImage = id;
            $scope.temp.activeImageThumbnail = thumbnail;
        }

        $scope.makePrimary = function() {
            if ($scope.temp.activeImage) {
                $scope.disc.primaryImage = $scope.temp.activeImage;
                $scope.temp.activeImage = undefined;
            }
        }

        $scope.removeImage = function() {
            if ($scope.temp.activeImage) {
                $scope.disc.imageList = _.without($scope.disc.imageList, 
                    _.findWhere($scope.disc.imageList, {
                    _id: $scope.temp.activeImage
                }));

                if ($scope.temp.activeImage == $scope.disc.primaryImage) {
                    if ($scope.disc.imageList.length) {
                        $scope.disc.primaryImage = $scope.disc.imageList[0]._id;
                    } else {
                        $scope.disc.primaryImage = undefined;
                    }
                }

                $scope.temp.activeImage = undefined;
            }
        }
        
        $scope.saveDisc = function() {
            if ($scope.settings.dropzoneProcessing == true || 
                $scope.settings.cropperLoading == true) return;
            
            $scope.settings.loading = true;
            if ($scope.settings.editMode) {
                DataService.updateDisc($scope.disc, function(success, retData) {
                    $scope.settings.loading = false;
                    if (!success) {
                        $scope.showError($scope.errorOpts, retData.type, 
                        'Error updating existing disc.', retData.message);
                    } else {
                        $scope.goBack();
                    }
                });
            } else {
                DataService.createDisc($scope.disc, function(success, retData) {
                    $scope.settings.loading = false;
                    if (!success) {
                        $scope.showError($scope.errorOpts, retData.type, 
                        'Error saving new disc.', retData.message);
                    } else {
                        $scope.nav('disc/' + retData, true)
                    }
                });
            }
        }

        AutoFillService.initialize(function() {
            if ($scope.settings.editMode) {
                DataService.getDisc($routeParams.discId, 
                    function(success, retData) {
                        $scope.settings.loading = false;
                        if (success) {
                            $scope.disc = angular.copy(retData.disc);
                        } else {
                            $scope.showError($scope.errorOpts, retData.type, 
                            'Error loading disc.', retData.message, function() {
                                $scope.nav('', true);
                            });
                        }
                    });
            }
            else {
                $scope.settings.loading = false;
            }
        });

        if (typeof Dropzone === 'undefined' || typeof EXIF === 'undefined' || 
            typeof Cropper === 'undefined') {
            $ocLazyLoad.load(
                ['https://cdn.rawgit.com/exif-js/exif-js/master/exif.js',
                '/static/js-dist/dropzone.min.js'
                ]).then(function() {
                    $ocLazyLoad.load([
                        '/static/js-dist/cropper.min.js',
                        {type: 'css', path: 'https://cdn.rawgit.com/fengyuanchen/cropperjs/master/dist/cropper.min.css'}
                    ]).then(function() {
                            $scope.settings.modulesLoaded = true;
                        });
                });
        } else {
            $scope.settings.modulesLoaded = true;
        }
    }
])

/******************************************************************************
* Name:         DiscController
* Description:  Handles obtaining/showing discs
*******************************************************************************/
.controller('DiscController', ['$scope', '$routeParams', 'DataService',
    function($scope, $routeParams, DataService) {
        $scope.disc = undefined;
        $scope.user = undefined;
        $scope.dropdown = false;
        $scope.title = 'Loading...';
        $scope.errorOpts = {active: false};
        $scope.modal = {
            reqShareDisc: false
        };
        
        $scope.onSuccess = function(e) {
            e.clearSelection();
            $scope.safeApply(function() {
                $scope.modal.reqShareDisc = false;
                $scope.dropdown = false;
            });
            $scope.toast('Public link copied!');
        };

        $scope.getPrimaryImage = function() {
            return DataService.getPrimaryImage($scope.disc);
        }

        $scope.showImageList = function() {
            if (!$scope.disc.imageList.length) return;
            $scope.nav('disc/' + $scope.disc._id + '/images');
        }

        $scope.shareLink = function() {
            if ($scope.disc) {
                return encodeURI('https://www.facebook.com/dialog/share?app_id=' +
                    dzID + '&display=popup&href=' + siteUrl + '/disc/' +
                    $scope.disc._id + '&redirect_uri=' + siteUrl);
            }
            return '#';
        }

        $scope.deleteDisc = function() {
            DataService.deleteDisc($scope.disc, function(success, retData) {
                $scope.reqDeleteDisc = undefined;
                if (success) {
                    $scope.nav();
                } else {
                    $scope.showError($scope.errorOpts, retData.type, 
                        'Error deleting disc.', retData.message);
                }
            });
        }

        $scope.loading = true;
        DataService.getDisc($routeParams.discId, function(success, retData) {
            if (success) {
                $scope.disc = retData.disc;
                $scope.user = retData.user;
                $scope.title = $scope.disc.name;
                $scope.publicUrl = siteUrl + '/disc/' + $scope.disc._id;
            } else {
                $scope.showError($scope.errorOpts, retData.type, 
                    'Error loading disc.', retData.message, function() {
                    $scope.nav('', true);
                });
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
        
        $scope.errorOpts = {
            active: false
        };

        $scope.showImage = function(fileId) {
            $window.open(siteUrl + '/files/' + fileId);
        }

        $scope.loading = true;
        DataService.getDisc($routeParams.discId, function(success, retData) {
            $scope.loading = false;
            if (success) {
                $scope.disc = retData.disc;
                $scope.title = $scope.disc.name + ': Images';
            } else {
                $scope.showError($scope.errorOpts, retData.type, 'Error loading disc.', retData.message, function() {
                    $scope.nav();
                });
            }
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