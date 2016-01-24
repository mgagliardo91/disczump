var siteUrl = 'https://disczumpserver-mgagliardo.c9.io';
var dzID = '1433417853616595';

angular.module('disczump.controllers', ['disczump.services'])

// Directives
// .directive('onLongPress', function($timeout) {
// 	return {
// 		restrict: 'A',
// 		link: function($scope, $elm, $attrs) {
// 			$elm.bind('touchstart', function(evt) {
// 				// Locally scoped variable that will keep track of the long press
// 				$scope.longPress = true;

// 				// We'll set a timeout for 600 ms for a long press
// 				$timeout(function() {
// 					if ($scope.longPress) {
// 						// If the touchend event hasn't fired,
// 						// apply the function given in on the element's on-long-press attribute
// 						$scope.safeApply(function() {
// 							$scope.$eval($attrs.onLongPress)
// 						});
// 					}
// 				}, 600);
// 			});

// 			$elm.bind('touchend', function(evt) {
// 				// Prevent the onLongPress event from firing
// 				$scope.longPress = false;
// 				// If there is an on-touch-end function attached to this element, apply it
// 				if ($attrs.onTouchEnd) {
// 					$scope.safeApply(function() {
// 						$scope.$eval($attrs.onTouchEnd)
// 					});
// 				}
// 			});
// 		}
// 	};
// })

.directive('dropzone', function() {
    return function(scope, element, attrs) {
        var config, dropzone;

        config = scope[attrs.dropzone];

        // create a Dropzone for the element with the given options
        dropzone = new Dropzone(element[0], config.options);

        // bind the given event handlers
        angular.forEach(config.eventHandlers, function(handler, event) {
            dropzone.on(event, handler);
        });

        scope[attrs.dropzone].getDropzone = function() {
            return dropzone
        };
        
        // var clickable = angular.element(document.getElementById(config.options.clickable.replace('#', '')));
        // clickable.on('touchstart', function(event) {
        //     clickable.triggerHandler('click');
        //     event.preventDefault();
        // });
    };
})

.directive('imageCropper', ['$window', 'ImageService', function($window, ImageService) {
    return {
        restrict: 'E',
        scope: {
            cropperOptions: "="
        },
        template: '<div class="image-cropper backdrop" ng-show="show">' +
            '<div class="image-container"><div class="image-area" style="margin-top: {{margin}}px;" id="image-parent">' +

            '</div></div>' +
            '<div class="dual-item-row cropper-footer">' +
            '<button type="button" class="dual-item btn btn-block btn-primary" ng-click="cancel($event)">Cancel</button>' +
            '<button type="button" class="dual-item btn btn-block btn-primary" ng-click="finish($event)">Finish</button>' +
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
                parent.innerHTML = '<img src="' + src + '" id="test-crop" filename="' + name + '" style="width:' + scope.width + 'px;height:' + scope.width + 'px"/>';
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

// Controllers

.controller('MainController', ['$rootScope', '$scope', '$location', '$window', 'DataService',
    function($rootScope, $scope, $location, $window, DataService) {
        
        $scope.error = {
            title: '',
            text: ''
        }
        
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
        
        $scope.closeModal = function() {
            $scope.temp.activeImage = undefined;
            $scope.temp.activeTag = undefined;
            $scope.temp.resetDisc = undefined;
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

.directive('dzFill', ['$compile', 'AutoFillService', function($compile, AutoFillService) {
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

.controller('ModifyDiscController', ['$scope', '$window', '$location', '$routeParams', '$ocLazyLoad', '_', 'AutoFillService', 'DataService', 'ImageService',
    function($scope, $window, $location, $routeParams, $ocLazyLoad, _, AutoFillService, DataService, ImageService) {
        $scope.imgSize = Math.floor(($window.innerWidth - 48) / 3); //Subtracted 48 for 20px padding on each side of screen and 1px padding on each side of img.
        $scope.loading = true;
        $scope.modulesLoaded = false;
        $scope.disc = {
            visible: true,
            tagList: [],
            imageList: []
        };
        $scope.temp = {
            tag: '',
            tagOptions: [],
            focus: false
        };
        $scope.forms = {};

        $scope.$watch('disc.imageList', function(newValue, oldValue) {
            console.log('seen');
        });

        $scope.settings = {
            page: 0,
            editMode: typeof $routeParams.discId !== 'undefined'
        }

        var template = '<div class="image-item">' +
            '<img data-dz-thumbnail />' + 
            '<div class="image-loading" style="width:' + $scope.imgSize + 'px;height:' + $scope.imgSize + 'px;"><i class="fa fa-spinner fa-spin"></i></div>' +
            '<div class="image-progress" data-dz-uploadprogress></div>' +
            '</div>';
            
        $scope.dropzoneProcessing = false;
        $scope.dropzoneConfig = {
            getDropzone: function() {
                return undefined;
            },
            options: {
                url: "/api/images",
                method: "POST",
                thumbnailWidth: $scope.imgSize,
                thumbnailHeight: $scope.imgSize,
                parallelUploads: 10,
                maxFiles: 10,
                paramName: 'discImage',
                previewTemplate: template,
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
                        $scope.dropzoneProcessing = true;
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
                    $scope.dropzoneProcessing = false;
                    $scope.safeApply();
                }
            }
        };
        
        
        $scope.triggerDropzone = function() {
             $scope.dropzoneConfig.getDropzone().progTrigger();
        }

        $scope.cropper = {
            cropperShouldShow: false
        }

        $scope.discImageCropper = {
            onFinish: function(file) {
                $scope.discImageCropper.cropperLoading = false;
                $scope.safeApply();
                console.log(file);
                if (file) {
                    $scope.dropzoneConfig.getDropzone().addFile(file);
                }
            },
            cropperLoading: false
        }

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
        
        $scope.confirmResetDisc = function() {
            $scope.temp.resetDisc = true;
        }

        $scope.resetDisc = function() {
            $scope.disc = {
                visible: true,
                tagList: []
            };
            $scope.settings.page = 0;
            $scope.temp.resetDisc = undefined;
        }

        $scope.selectTag = function(tag) {
            $scope.temp.activeTag = tag;
        }

        $scope.removeTag = function() {
            if ($scope.temp.activeTag) {
                $scope.disc.tagList = _.without($scope.disc.tagList, $scope.temp.activeTag);
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

                $scope.disc.imageList = _.without($scope.disc.imageList, _.findWhere($scope.disc.imageList, {
                    _id: $scope.temp.activeImage
                }));

                if ($scope.temp.activeImage == $scope.disc.primaryImage) {
                    if ($scope.disc.imageList.length) {
                        $scope.disc.primaryImage = $scope.disc.imageList[0]._id;
                    }
                    else {
                        $scope.disc.primaryImage = undefined;
                    }
                }

                $scope.temp.activeImage = undefined;
            }
        }
        
        $scope.closeModal = function() {
            $scope.temp.activeImage = undefined;
            $scope.temp.activeTag = undefined;
            $scope.temp.resetDisc = undefined;
        }

        $scope.done = function() {
            $scope.cropper.cropperShouldShow = true;
        }
        
        $scope.saveDisc = function() {
            $scope.loading = true;
            if ($scope.settings.editMode) {
                DataService.updateDisc($scope.disc, function(success, data) {
                    $scope.loading = false;
                    if (!success) {
                        return console.log(data);
                    }
                    
                    $location.path('/disc/' + data);
                });
            } else {
                DataService.createDisc($scope.disc, function(success, data) {
                    $scope.loading = false;
                    if (!success) {
                        return console.log(data);
                    }
                    
                    $location.path('/disc/' + data);
                });
            }
        }

        AutoFillService.initialize(function() {
            if ($scope.settings.editMode) {
                DataService.getDisc($routeParams.discId, function(disc, user) {
                    if (typeof disc === 'undefined') {
                        $location.path('/');
                    }
                    else {
                        $scope.disc = angular.copy(disc);
                    }
                    $scope.loading = false;
                });
            }
            else {
                $scope.loading = false;
            }
        });

        if (typeof Dropzone === 'undefined' || typeof EXIF === 'undefined' || typeof Cropper === 'undefined') {
            $ocLazyLoad.load(['https://cdn.rawgit.com/exif-js/exif-js/master/exif.js',
                '/static/js/dropzone.js'
            ]).then(function() {
                $ocLazyLoad.load('/static/mobile/js/cropper.js').then(function() {
                    $scope.modulesLoaded = true;
                });
            });
        }
        else {
            $scope.modulesLoaded = true;
        }
    }
])

.controller('DiscController', ['$location', '$scope', '$routeParams', '$window', '$location', 'DataService',
    function($location, $scope, $routeParams, $window, $location, DataService) {
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

        $scope.deleteDisc = function() {
            DataService.deleteDisc($scope.disc, function(success, data) {
                if (success) {
                    // alert deleted!
                    $location.path('/');
                } else {
                    console.log(data);
                }
            });
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