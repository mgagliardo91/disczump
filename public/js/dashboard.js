var $searchResults;
var $searchBar;
var $filterResults;
var $filterContainer;
var $galleryContainer;
var $inventoryHeader;
var $inventoryContainer;
var $dynamicHeader;
var $modifyDiscForm;

var pageSettings = {tableMode: true, activePage: undefined};
var sidebarSettings = {collapsed: false, locked: false};
var paginateOptions = {displayCount: 20, currentPage: 1, lastPage: 1};
var pageEvents = {};
var chartData = {};
var modifyHandler = {type: 'Add', discId: undefined};

var mySort;
var myFilter;
var myGallery;
var myZumpColorPicker;
var myMessenger;
var zipValidation;

var socket;
var discList = [];
var discs = [];
var dropzones = [];
var textAssistArr = [];
var changeObject = {};
var fnLock = false;

var activePage;
var refPageTop;
var refContBottom;
var isFixed = false, isHidden = false;
var imgArray = new Array();

var userPrefs;
var userAccount;

activePage = $('.sidebar-nav-toolbar').find('.sidebar-nav-select.active').attr('nav-select');

$(document).ready(function(){
   
   	/* Variables */
   	
    $searchResults = $('#sidebar-search');
    $searchBar = $('#search-all');
	$filterResults = $('#filter-results');
	$filterContainer = $('#filter-container');
	$galleryContainer = $('#gallery-container')
	$inventoryHeader = $('#inventory-header');
    $inventoryContainer = $('.disc-inventory-container');
    $dynamicHeader = $('#disc-inventory-header-dynamic');
    $modifyDiscForm = $('#modify-disc-form');
   	
    /* Initial Commands */
   	$('.page').hide();
   	
   	/* Logic */
    refPageTop = $('body').outerHeight() - $('body').height() - $('nav').outerHeight();
    refContBottom = refPageTop + $inventoryContainer.outerHeight() - $inventoryHeader.outerHeight();
     
	$.ajaxSetup({ cache: true });
	$.getScript('//connect.facebook.net/en_UK/all.js', function(){
		FB.init({
			appId: '1433417853616595',
		});
	}); 
   	
   	/* Event Listeners */
   	$('#menu-tutorial').click(function(e) {
   	    e.stopImmediatePropagation();
   	    
   	    var zumpTutorial = new ZumpTutorial({
        	screens: ['dashboard', 'account', 'discview', 'sort', 'filter', 'add', 'tutorial']
        });
        
        zumpTutorial.showTutorial();
   	    
   	    return false;
   	});
   	
   	$('#menu-feedback').click(function(e) {
   		e.stopImmediatePropagation();
   		generateFeedbackModal('Feedback Form', 'Submit', function() {
   			if ($('#feedback-textarea').val().length < 1) {
   				return $('.modal-body').prepend(generateError('You must enter information into the text box before submitting the form.', 'ERROR'));
   			} else {
   				$('.modal-body').find('.alert').remove();
   				var text = $('#feedback-textarea').val();
   				postFeedback(text, function(success, retData) {
   					if (success) {
   						$('.custom-modal').modal('hide');
   					} else {
   						console.log('Error submitting feedback.');
   					}
   				});
   			}
   		});
   		return false;
   	});
   	
	$('.sidebar-nav-select').click(function(e) {
		e.stopPropagation();
    	var $this = $(this);
    	var nav = $this.attr('nav-select');
       	var $nav = $(nav);
       	var $curNav = $('.nav-sidebar:visible');
       	
       	if ($('#sidebar-filter').is(':visible')) {
       		$('#results-header-filter').css({
      			'background-color' : 'initial',
      			'color' : '#000',
      			'border-color' : 'rgb(134, 134, 134)'
      		});
       	}
       	
       	if ($nav.length && !$nav.is(':visible')) {
       		activePage = nav;
       		$curNav.fadeOut(100, function() {
				$this.addClass('active').siblings('.sidebar-nav-select').removeClass('active');
       			$nav.fadeIn(100);
       		});
       	}
	});
	
   	$('.nav-sidebar li.sidebar-select.nav').click(function(e){
    	e.stopPropagation();
       	var $this = $(this);
       	var nav = $this.attr('pg-select');
       	changePage(nav);
      	return false;
   	});
   	
   	$(window).on('resize', function() {
        resizeResultHeader();
        resizeTagLists();
        resizeSidebar();
   	});
     
    $(window).scroll(function(){
    	var curTop = $(window).scrollTop();
    	var heightRemaining = $('body').outerHeight() - curTop - $(window).outerHeight();
    	if (!isFixed && curTop >= refPageTop && heightRemaining > $inventoryHeader.outerHeight() + 20) {
			var headerTop = $inventoryHeader.offset().top;
			$inventoryHeader.addClass('header-fixed');
			$inventoryHeader.css({
				top: $('nav').outerHeight()
			});
			isFixed = true;
		}
    	
		if (isFixed &&  curTop < refPageTop) {
			$inventoryHeader.removeClass('header-fixed');
			isFixed = false;
		}
    });
     
    $(window).click(function(e) {
		$.each($('.hide-on-close'), function(index) {
			if ($(this).is(':visible')) {
				$(this).hide();
			}	
     	});
    });
    
	$(document).on('mouseenter', '.hover-active', function() {
		$(this).addClass('active');
	}).on('mouseleave', '.hover-active', function() {
		$(this).removeClass('active');
	});

	//--------------Search Bar--------------//

	$searchBar.focusin(function() {
		$(this).trigger('keyup');
    }).on('keyup', function() {
		delay(function() {
			if ($searchBar.val().length > 0) {
				if (!$searchResults.is(':visible')) {
					$(activePage).hide();
					$searchResults.show();
				}
				doSearch();
			} else {
				$searchResults.hide();
				$(activePage).show();
			}
	}, 100 );
    }).click(function(e) {
    	e.stopPropagation();
    });
    
    $('#sidebar-search').focusout(function() {
    	$searchResults.hide();
		$(activePage).show();
    });
    
    $(document).click(function(e) {
    	if ($searchResults.is(':visible')) {
    		if (!$(e.target).closest('#sidebar-search').length) {
		        $searchResults.hide();
				$(activePage).show();
		    }
    	}
	});
	
	$(document).on('mouseenter', '#search-results-container li', function() {
		$(this).find('.fa-search-results').show();
	}).on('mouseleave', '#search-results-container li', function() {
		$(this).find('.fa-search-results').hide();
	});
	
	$(document).on('click', '.result-section-output li:not(.result-item-empty)', function(e) {
		e.stopPropagation();
		var $parent = $(this).parents('.result-section');
		var option = $parent.attr('id').match(/-([a-zA-Z]+)/)[1];
		var val = $(this).text();
		
		$searchBar.val('');
		myFilter.clearFilters();
		myFilter.pushFilterItem(option, val, true);
		$searchResults.hide();
		$(activePage).show();
	});
	
	$(document).on('click', '.fa-delete-disc-item', function() {
		var discId = $(this).parents('.disc-item').attr('discid');
		var text = 'Are you sure you want to delete this disc and all of its data?';
		generateConfirmationModal('WARNING!', text, 'Delete', function($btn, $inner, done) {
			console.log('clicked delete');
			deleteDisc(discId, function(success, data) {
				if (success) {
					discs = _.filter(discs, function(disc){
						return disc._id != data._id;
					});
					updateFilter(true);
				} else {
					// error logic
				}
				done();
			});
		});
	});
	
	$(document).on('click', '.fa-edit-disc-item', function() {
		var discId = $(this).parents('.disc-item').attr('discid');
		var nav = '#pg-modify-disc';
		modifyHandler.type = "Edit";
		modifyHandler.discId = discId;
		changePage(nav);
	});
	 
	$(document).on('click', '.fa-share-disc-item', function() {
		var disc = getDisc($(this).parents('.disc-item').attr('discid'));
		var winTop = ($(window).height() / 2) - (300 / 2);
		var winLeft = ($(window).width() / 2) - (600 / 2);
        window.open('http://www.facebook.com/sharer/sharer.php?app_id=1433417853616595&u=disczump.com/disc/' + disc._id + 
        	'&display=popup&ref=plugin&src=share_button', 'sharer', 'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + 600 + ',height=' + 300);
	});
	 
	$(document).on('click', '.fa-visible-disc-item', function() {
		var disc = getDisc($(this).parents('.disc-item').attr('discid'));
		disc.visible = !disc.visible;
		putDisc(disc, function(success, retData) {
			if (success) {
				discs = _.filter(discs, function(disc){
					return disc._id != retData._id;
				});
				discs.push(retData);
				updateDiscItem(disc);
			} else {
				console.log(generateError(retData.message, 'ERROR'));
			}
		});
	});
	 
	$(document).on('click', '.disc-info-tag', function() {
		myFilter.pushFilterItem('tagList', $(this).text());
		$('.sidebar-nav-select[nav-select="#sidebar-filter"]').trigger('click');
	});
	 
	$(document).on('click', '.disc-content-image', function(e) {
		var discItem = $(this).parents('.disc-item');
		var disc = getDisc(discItem.attr('discid'));
		
		getAllDiscImages(disc._id, function(success, images) {
			if (success && images.length > 0) {
				var zumpLightbox = new ZumpLightbox({
					content: {
						imageArray: images,
						defaultImage: disc.primaryImage
					},
					onCreate: function($lightbox) {
					},
					onShow: function($lightbox) {
					},
					onHide: function() {
					}
				});
				zumpLightbox.showLightbox();
			}
		});
	});

	$(document).on('vmouseup', 'input[type="text"]', function(e) {
		e.stopImmediatePropagation();
		e.stopPropagation();
		return false;
	});
	
	$('#page-back').click(function(){
		paginateOptions.currentPage -= 1;	
		showDiscs(true);
	});
	
	$('#page-forward').click(function(){
		paginateOptions.currentPage += 1;
		showDiscs(true);	
	});
	
	$(document).on('click', '.page-dynamic:not(.active)', function() {
		paginateOptions.currentPage = parseInt($(this).text(), 10);
		showDiscs(true);
	});
	
	$('#paginate-display-count').on('change', function(){
		var val = $(this).val();
		val = parseInt(val);
		if (_.isNaN(val)) {
			paginateOptions.displayCount = -1;
			paginateOptions.currentPage = 1;
		} else {
			paginateOptions.displayCount = parseInt(val);
		}
		
		showDiscs();
	});
	
	$('#export-list').click(function(e){
		exportList();
	});
	
	// $(document).on('click', '#create-disc-modal', function() {
	// 	generateDiscInputForm();
	// });
	
	$(document).on('click', '.image-preview:not(.active)', function() {
		var src = $(this).children('img').attr('src');
		var $blockDisplay = $(this).parents('.image-block-display');
		var $primAryimage = $blockDisplay.find('#disc-primary-image');
		
		$blockDisplay.find('.image-preview.active').removeClass('active');
		$primAryimage.attr('src', src);
		$(this).addClass('active');
	});
	
	$(document).on('mouseenter', '.image-item', function(){
		var $this = $(this);
		if (!$this.parents('.image-item-container').hasClass('dz-processing')) {
			$(this).find('.image-overlay').show();
		}
	}).on('mouseleave', '.image-item', function(){
		$(this).find('.image-overlay').hide();
	});
	
    $('#search-request').click(function() {
    	$searchBar.focus();
    });
    
    /*===================================================================*/
	/*                                                                   */
	/*                    	Modify Disc Listeners                        */
	/*                                                                   */
	/*===================================================================*/
	
	var $tagContainer = $('#modify-disc-form').find('.tag-list-container');
	
    $('#clear-modify-disc-form').click(function() {
    	clearModifyDiscForm();
    });
		    
	$('#modify-disc-form').find('.accordion-header > label').click(function(e) {
		var param = $(this).attr('param');
        var $chevron = $(this).find('.fa');
        if ($chevron.hasClass('fa-chevron-right')) {
            $chevron.removeClass('fa-chevron-right').addClass('fa-chevron-down');
        } else {
            $chevron.removeClass('fa-chevron-down').addClass('fa-chevron-right');
        }
        if (param == 'dropzone') {
        	$('#collapseDropzone').collapse('toggle');
        } else if (param == 'current-images') {
        	$('#collapseCurrentImages').collapse('toggle');
        } else if (param == 'advanced') {
        	$('#collapseAdvanced').collapse('toggle');
        }
    });
	
	$('input[type=text]').focus(function(){
	    $(this).one('mouseup', function(event){
	        event.preventDefault;
	    }).select();
	});
	
	$('#modify-disc-form').on('click', '.tag-item-remove', function(){
		var $parent = $(this).parents('.tag-item');
		$parent.remove();
		
		if ($tagContainer.is(':empty')){
			$tagContainer.empty();
		}
	});
	
	$('#modify-disc-form').find('.number-validate').on('focusin', function(e){
		$(this).parent().removeClass('has-error');
    });
	
	$('#modify-disc-form').find('.number-validate').on('focusout', function(e){
		var val = $(this).val();
		if (val != '' && !(/^-?\d+(\.\d+)?$/.test(val))) {
			$(this).parent().addClass('has-error');
		} else {
			$(this).parent().removeClass('has-error');
		}
    });
    
    $('#modify-disc-form').find('.weight-number-validate').on('focusout', function(e){
		var val = $(this).val();
		if (val != '' && !(/^\d+(\.\d+)?$/.test(val))) {
			$(this).parent().addClass('has-error');
		} else {
			$(this).parent().removeClass('has-error');
		}
    });
    
    $('#modify-disc-form').find('.condition-number-validate').on('focusout', function(e){
		var val = $(this).val();
		if (val != '' && !(/^\d\d?(\.\d)?$/.test(val))) {
			$(this).parent().addClass('has-error');
		} else {
			$(this).parent().removeClass('has-error');
		}
    });
    
    $('#modify-disc-form').find('button[fn-title="save"]').click(function() {
    	console.log(modifyHandler.type);
    	if (modifyHandler.type == "Add") {
    		saveNewDisc();
    	} else if (modifyHandler.type == "Edit") {
    		saveExistingDisc();
    	}
    });
    
    /*===================================================================*/
	/*                                                                   */
	/*                    Account Settings Listeners                     */
	/*                                                                   */
	/*===================================================================*/
    
    $('#accountSave').click(function() {
    	$('#accountForm').find('.alert').remove();
    	
    	if (!zipValidation.isAllValid()) {
    		return $('#accountForm').prepend(generateError('Invalid zip code.', 'ERROR'));
    	}
    	
    	var alias = $('#accountAlias').val();
    	var zipCode = $('#accountZipCode').val();
    	var pdga = $('#accountPDGA').val();
    	
    	putAccount({
    		alias : alias,
    		zipCode: zipCode,
    		pdgaNumber: pdga
    	}, function(success, retData) {
    		if (success) {
    			$('#accountAlias').val(retData.alias);
    			$('#accountZipCode').val(retData.zipCode).parent().removeClass('has-success');
    			$('#accountPDGA').val(retData.pdgaNumber);
    			$('#accountForm').prepend(generateSuccess('Account successfully updated.', 'Success'));
    			autoCloseAlert($('#accountForm').find('.alert'), 3000);
    		}
    	});
    });
    
    var changePasswordValidate = new ZumpValidate({
        items: [
            {id:'new-password', type: 'text', min: 6, hint: 'Password must be at least 6 characters in length.'},
            {id:'confirm-password', type:'compare', refId:'new-password'}
        ]
    });
    
    $('#change-password-save').click(function() {
    	$('#accountActionsForm').find('.alert').remove();
    	
    	var currentPassword = $('#current-password').val();
    	var newPassword = $('#new-password').val();
    	var confirmPassword = $('#confirm-password').val();
    	
    	// check new == confirm
    	if (changePasswordValidate.isAllValid()) {
    		resetPassword(currentPassword, newPassword, function(success, retData) {
	    		if (success) {
	    			$('#accountActionsForm').prepend(generateSuccess('Password has been changed successfully.', 'Success'));
	    			autoCloseAlert($('#accountActionsForm').find('.alert'), 3000);
	    			$('#current-password').val('');
			    	$('#new-password').val('').parent().removeClass('has-success');
			    	$('#confirm-password').val('').parent().removeClass('has-success');
	    		} else {
	    			$('#accountActionsForm').prepend(generateError(retData.message, retData.type));
	    			$('#current-password').val('');
			    	$('#new-password').val('').parent().removeClass('has-success has-error');
			    	$('#confirm-password').val('').parent().removeClass('has-success has-error');
	    		}
	    	});
    	} else {
    		$('#accountActionsForm').prepend(generateError('New password and confirmed password do not match.', 'ERROR'));
    		$('#current-password').val('');
	    	$('#new-password').val('').parent().removeClass('has-success has-error');
	    	$('#confirm-password').val('').parent().removeClass('has-success has-error');
    	}
    });
    
    $('#account-delete').click(function() {
    	var text = 'Are you sure you want to delete your account?';
    	generateConfirmationModal('WARNING!', text, 'Delete', function() {
			window.location.href = '/profile/delete';
		});
    });
    
    $('#password-accordion-label').click(function(e) {
        var $chevron = $(this).find('.fa');
        if ($chevron.hasClass('fa-chevron-right')) {
            $chevron.removeClass('fa-chevron-right').addClass('fa-chevron-down');
        } else {
            $chevron.removeClass('fa-chevron-down').addClass('fa-chevron-right');
        }
        $('#expand-change-password').collapse('toggle');
    });
    
    /*===================================================================*/
	/*                                                                   */
	/*                       Preferences Listeners                       */
	/*                                                                   */
	/*===================================================================*/
    
    $('#default-settings-save').click(function() {
    	$('#preferences-form').find('.alert').remove();
    	
    	var defaultView = $('#default-view').val();
    	var displayCount = $('#display-count').val();
    	var galleryCount = $('#items-per-row').val();
    	var primarySort	= $('#sort-order-primary').val();
    	var primarySortDirection = $('#sort-order-primary-direction').val() == 'Ascending' ? true : false;
    	var secondarySort	= $('#sort-order-secondary').val();
    	var secondarySortDirection = $('#sort-order-secondary-direction').val() == 'Ascending' ? true : false;
    	var enableSecondarySort = $('#enable-secondary-sort').is(':checked');
    	var defaultSortArray;
    	
    	if (enableSecondarySort) {
    		if (primarySort == secondarySort) {
	    		$('#preferences-form').prepend(generateError('Sort properties must be different.', 'ERROR'));
	    		return;
	    	} else {
	    		defaultSortArray = [{property : primarySort, sortAsc : primarySortDirection}, {property : secondarySort, sortAsc : secondarySortDirection}];
	    	}
    	} else {
    		defaultSortArray = [{property : primarySort, sortAsc : primarySortDirection}];
    	}
    	
    	updatePreferences({
    		displayCount : displayCount,
    		defaultSort : defaultSortArray,
    		defaultView : defaultView,
    		galleryCount : galleryCount
    	}, function(success, retData) {
    		if (success) {
    			$('#preferences-form').prepend(generateSuccess('Default settings saved successfully. Changes will take effect when page is <a href="/">reloaded</a>.', 'Success'));
    			userPrefs = retData;
    		}
    	});
    });
    $('#default-settings-restore').click(function() {
    	var text = 'Are you sure you want to restore your preferences?';
    	
    	generateConfirmationModal('Warning!', text, 'Restore', function() {
			updatePreferences(undefined, function(success, retData) {
	    		if (success) {
	    			$('#preferences-form').prepend(generateSuccess('Default settings have been restored. Changes will take effect when page is <a href="/">reloaded</a>.', 'Success'));
	    			userPrefs = retData;
	    		}
	    	});
		});
    });
    
    $('#colorize-save').click(function() {
    	$('#colorize-form').find('.alert').remove();
    	
    	var colorizeVisibility = $('#colorize-visibility').bootstrapSwitch('state');
    	var distance = $('#colorize-distance-driver').css('background-color');
    	var fairway = $('#colorize-fairway-driver').css('background-color');
    	var mid = $('#colorize-mid-range').css('background-color');
    	var putter = $('#colorize-putt-approach').css('background-color');
    	var mini = $('#colorize-mini').css('background-color');
    	
    	updatePreferences({
    		colorizeVisibility : colorizeVisibility,
    		colorize : {
    			distance : distance,
    			fairway : fairway,
    			mid : mid,
    			putter : putter,
    			mini : mini
    		}
    	}, function(success, retData) {
    		if (success) {
    			$('#colorize-form').prepend(generateSuccess('Colorize settings saved successfully.', 'Success'));
    			autoCloseAlert($('#colorize-form').find('.alert'), 3000);
    			userPrefs = retData;
    			showDiscs(true);
    		}
    	});
    });
    
    $('#enable-secondary-sort').change(function() {
		if ($(this).is(':checked')) {
			$('#sort-order-secondary').removeAttr('disabled');
			$('#sort-order-secondary-direction').removeAttr('disabled');
		} else {
			$('#sort-order-secondary').attr('disabled', 'disabled');
			$('#sort-order-secondary-direction').attr('disabled', 'disabled');
		}
	});
	
	$('.colorize-item').click(function() {
		var $this = $(this);
		myZumpColorPicker.getColor($this, function(success, color) {
			$this.css('backgroundColor', color);
		});
	});
	
    /*===================================================================*/
	/*                                                                   */
	/*                       Statistics Listeners                        */
	/*                                                                   */
	/*===================================================================*/
	
	$('#render-graph').click(function() {
		var prop = $('#graph-base').val();
		var type = $('#graph-type').val();
		generatePlot(prop, type);
	});
	

    /*===================================================================*/
	/*                                                                   */
	/*                       Start on-load commands                      */
	/*                                                                   */
	/*===================================================================*/

	pageEvents['pg-gallery'] = {
		onShow: function() {
			pageSettings.tableMode = false;
    	    showDiscGallery();
		},
		onHide: function() {
			pageSettings.tableMode = true;
		},
		isShowing: function() {
			
		}
	}
	
	pageEvents['pg-dashboard'] = {
		onShow: function() {
			resizeResultHeader();
			resizeTagLists();
		},
		onHide: function() {
			
		},
		isShowing: function() {
			
		}
	}
	
	pageEvents['pg-inbox'] = {
		onShow: function() {
			myMessenger.initPage();
		},
		onHide: function() {
			myMessenger.threadLeft();
		},
		isShowing: function() {
			
		}
	}
	
	pageEvents['pg-modify-disc'] = {
		onShow: function() {
			_.each(textAssistArr, function(textAssist) {
    			textAssist.triggerResize();
    		});
    		
    		stageModifyDiscPage(modifyHandler.type, modifyHandler.discId);
    		
		},
		onHide: function() {
			if (modifyHandler.type == "Edit") {
				modifyHandler.type = "Add";
				modifyHandler.discId = undefined;
				clearModifyDiscForm();
			}
    		fnLock = false;
		},
		isShowing: function() {
			modifyHandler.type = "Add";
			modifyHandler.discId = undefined;
			clearModifyDiscForm();
			stageModifyDiscPage(modifyHandler.type, modifyHandler.discId);
		}
	}
    
    resizeSidebar();
    resizeResultHeader();
    resizeTagLists();
    $searchResults.hide();
    
    getSession(function(success, data) {
    	if (success) {
    		initSocket(data.sessionId);
    	}
    });
    
    getAccount(function(success, account) {
    	if (success) {
    		userAccount = account;
    		getUserPreferences(function(success, prefs) {
		    	if (success) {
		    		userPrefs = prefs;
		    		setUserPrefs();
		    		initializeTooltips();
		    		zumpLibraryInit();
		    		loadUserPrefs();
		    		initModifyDiscPage();
		    		getAllDiscs(function(success, discsFromServer){
						if (success) {
							discs = discsFromServer;
							initialize();
						} else {
							alert('Unable to intialize');
						}
					});
		     	}
		    });
    	}	
    });
    
    
    $('.page-alert').slideDown(300);
    
    setTimeout(function() {
        initializePage();
    }, 200);
 
});


var ZumpTutorial = function(opt) {
	
	this.screens = [];
	var $tutorial;
	
	this.init = function(opt) {
		
		if (isDef(opt.screens)) {
			this.screens = opt.screens;
		}
		
		$(document).on('click', '.tutorial-close', function() {
		   if ($tutorial.length) {
		       $tutorial.fadeOut(500, function() {
		          $tutorial.remove(); 
				  $('body').append($tutorial).css('overflow', 'auto');
		       });
		   } 
		});
	}
	
	this.showTutorial = function() {
		$('#tutorial').remove();
		
		$tutorial = $('<div id="tutorial"></div>');
		
		var $tutorialCont = $('<div class="tutorial-container"></div>');
		$tutorialCont.append('<div class="tutorial-title"><div>Tutorial<span><i class="fa fa-times-circle tutorial-close"></i></span></div></div>');
		
		var $content = $('<div class="tutorial-content"></div>');
		var $indicators = $('<div></div>');
		
		_.each(this.screens, function(screen) {
			$content.append($('<div class="tutorial-screen" style="background-image: url(\'/static/img/tutorial/tut_' + screen +  '.svg\')"></div>'));
			$indicators.append('<i class="fa fa-square-o"></i>');
		});
		
		
		// add screens
		
		$tutorialCont.append($content);
		
		$tutorialCont.append('<div class="tutorial-footer">' + 
				'<div>' + 
					'<button type="button" class="btn btn-default tutorial-button back">Back</button>' + 
					'<button type="button" class="btn btn-default tutorial-button forward">Next</button>' + 
					'<div class="tutorial-indicators"><span>' + $indicators.html() + '</span></div>' + 
					'<div class="clearfix"></div>' + 
				'</div>' + 
			'</div>');
			
		$tutorial.append($tutorialCont);
		
    	setActive(0);
		$content.children('.tutorial-screen:first-child').show();
		
		// Listeners
		bindListeners();
		
		$('body').append($tutorial).css('overflow', 'hidden');
		$tutorial.css({
			top: $(window).scrollTop()
		});
		
		$tutorial.fadeIn(500);
	}
	
	var setActive = function(index) {
		var $screen = $tutorial.find('.tutorial-screen').eq(index);
		
		if ($screen.length) {
			$screen.addClass('active').siblings().removeClass('active');
			
			var $indicator = $tutorial.find('.tutorial-indicators i').eq(index);
			$indicator.siblings().removeClass('fa-square').addClass('fa-square-o');
			$indicator.removeClass('fa-square-o').addClass('fa-square');
		}
	}
	
	var transition = function(forward) {
		var $activeScreen = $tutorial.find('.tutorial-screen.active');
		var $nextScreen;
		
		if (forward) {
			$nextScreen = $activeScreen.next();
			
			if ($nextScreen.length) {
			    unbindListeners();
			    $nextScreen.css('margin-top','-' + $activeScreen.height()*2 + 'px').show();
		    
    		    $activeScreen.animate({marginTop: $activeScreen.height() + 'px'}, 500, function() {
    		        $nextScreen.css('margin-top', '0px');
    		        $activeScreen.hide();
    		        setActive($nextScreen.index());
    		        updateButtons();
    		    });
			} else {
			    $tutorial.fadeOut(500, function() {
		          $tutorial.remove(); 
				  $('body').append($tutorial).css('overflow', 'auto');
		       });
			}
			
		} else {
		    $nextScreen = $activeScreen.prev();
		    
		    if ($nextScreen.length) {
		        unbindListeners();
			    $nextScreen.css('margin-top', $activeScreen.height() + 'px').show();
			    $activeScreen.css('margin-top','-' + 2*$activeScreen.height() + 'px').show();
                
                $nextScreen.animate({marginTop: '0px'}, 500, function() {
    		        $activeScreen.hide();
    		        setActive($nextScreen.index());
    		        updateButtons();
    		    });
			}
		}
	}
	
	var bindListeners = function() {
		$(document).on('click', '.tutorial-button.back', function(e) {
			transition(false);
		});
		
		$(document).on('click', '.tutorial-button.forward', function(e) {
			transition(true);
		});
	}
	
	var unbindListeners = function() {
	    $(document).off('click', '.tutorial-button.back');
	    $(document).off('click', '.tutorial-button.forward');
	}
	
	var updateButtons = function() {
	    var $nextScreen = $('.tutorial-screen.active');
	    
	    if ($nextScreen.is(':last-child')) {
			$('.tutorial-button.forward').text('Finish!').addClass('finish');
			$('.tutorial-button.back').css('visibility', 'visible');
		} else if ($nextScreen.is(':first-child')) {
			$('.tutorial-button.forward').text('Next').removeClass('finish');
			$('.tutorial-button.back').css('visibility', 'hidden');
		} else {
			$('.tutorial-button.forward').text('Next').removeClass('finish');
			$('.tutorial-button.back').css('visibility', 'visible');
		}
		
		bindListeners();
	}
	
	
	this.init(opt);
}

/*
*
*/
function initSocket(sessionId) {
	var socket = io.connect('https://disczumpserver-mgagliardo.c9.io');
	socket.on('notification', function (notification) {
	    parseNotification(notification);
	});
	socket.emit('initialize', {sessionId: sessionId});
}

function parseNotification(notification) {
	if (notification.type == 'MessageNotification') {
		myMessenger.handleMessage(notification.data)
	}
}

/*
* Changes the current dashboard page
*/
function changePage(page) {
   	var $page = $(page);
   	var $curPage = $('.page:visible');
   	var $navItem = $('.nav-sidebar li.sidebar-select[pg-select="' + page + '"]');
   	
   	if (!$curPage.length) {
       	if (isDef(pageEvents[$curPage.attr('id')])) {
        	pageEvents[$curPage.attr('id')].onHide();
       	}
        $page.fadeIn(100, function() {
			if ($navItem.length) {
			   	$navItem.addClass('active');
			}
			
            if (isDef(pageEvents[$page.attr('id')])) {
            	pageEvents[$page.attr('id')].onShow();
           	}
           	
           	pageSettings.activePage = page;
        });
        return;
   	}
   
   	if ($page.length) {
   		if ($page.is(':visible')) {
   			pageEvents[$page.attr('id')].isShowing();
   			if ($navItem.length) {
            	$navItem.addClass('active');
			}
   		} else {
   			$curPage.fadeOut(100, function() {
	           	if (isDef(pageEvents[$curPage.attr('id')])) {
	            	pageEvents[$curPage.attr('id')].onHide();
	           	}
	           	$('.nav-sidebar li.sidebar-select').removeClass('active');
	            $page.fadeIn(100, function() {
	                if ($navItem.length) {
	                	$navItem.addClass('active');
					}
					
	                if (isDef(pageEvents[$page.attr('id')])) {
	            		pageEvents[$page.attr('id')].onShow();
	               	}
	               	
		           	pageSettings.activePage = page;
	            });
	       	});
   		}
   	} else {
   		if ($navItem.length) {
       		$navItem.addClass('active').siblings().removeClass('active');
   		}
   	}
}

/*
* Initialize based on search params
*/
function initializePage() {
    var params = getSearchParameters();
    if (params.view) {
        $('.nav-sidebar > li[pg-select="#pg-' + params.view + '"]').trigger('click');
    }
}

/*===================================================================*/
/*                                                                   */
/*              Account Settings & Preferences Functions             */
/*                                                                   */
/*===================================================================*/

function setUserPrefs() {
	if (userPrefs.defaultView.length > 0) {
		$('#default-view').val(userPrefs.defaultView);
	}
	if (userPrefs.displayCount.length > 0) {
		$('#display-count').val(userPrefs.displayCount);
	}
	if (userPrefs.galleryCount.length > 0) {
		$('#items-per-row').val(userPrefs.galleryCount);
	}
	if (userPrefs.defaultSort.length > 0) {
		$('#sort-order-primary').val(userPrefs.defaultSort[0].property);
		userPrefs.defaultSort[0].sortAsc ? $('#sort-order-primary-direction').val("Ascending") : $('#sort-order-primary-direction').val("Descending");
		$('#enable-secondary-sort').removeAttr('checked');
		$('#sort-order-secondary').attr('disabled', 'disabled');
		$('#sort-order-secondary-direction').attr('disabled', 'disabled');
		if (userPrefs.defaultSort.length == 2) {
			$('#enable-secondary-sort').attr('checked', 'checked');
			$('#sort-order-secondary').removeAttr('disabled');
			$('#sort-order-secondary-direction').removeAttr('disabled');
			$('#sort-order-secondary').val(userPrefs.defaultSort[1].property);
			userPrefs.defaultSort[1].sortAsc ? $('#sort-order-secondary-direction').val("Ascending") : $('#sort-order-secondary-direction').val("Descending");
		}
	}
	$('#colorize-visibility').bootstrapSwitch('state', userPrefs.colorizeVisibility);
	if (isDef(userPrefs.colorize)) {
		$('#colorize-distance-driver').css('background-color', userPrefs.colorize.distance);
		$('#colorize-fairway-driver').css('background-color', userPrefs.colorize.fairway);
		$('#colorize-mid-range').css('background-color', userPrefs.colorize.mid);
		$('#colorize-putt-approach').css('background-color', userPrefs.colorize.putter);
		$('#colorize-mini').css('background-color', userPrefs.colorize.mini);
	}
}

// TESTING///


function loadUserPrefs() {
	$('.sidebar-select[pg-select="#pg-' + userPrefs.defaultView + '"]').addClass('active').trigger('click');
	$('#paginate-display-count').val(userPrefs.displayCount);
	$('#paginate-display-count').trigger('change');
	myGallery.updateGalleryCount(userPrefs.galleryCount);
	
	
	var $tutorialMenu = $('#menu-tutorial');
	
	if ($tutorialMenu.hasClass('prog-click')) {
			$('#menu-tutorial').trigger('click');
	}
	
}

function initializeTooltips() {
	var ttDefaultView = generateTooltipOptions('top', 'hover', 'Select a default view to show every time your DiscZump account loads.', '200px');
	var ttDisplayCount = generateTooltipOptions('top', 'hover', 'Select a default number of discs to show per page when your DiscZump account loads the dashboard view.', '200px');
	var ttItemsPerRow = generateTooltipOptions('top', 'hover', 'Select a default number of discs to show per row when DiscZump loads the gallery view.', '200px');
	var ttPrimarySort = generateTooltipOptions('top', 'hover', 'Select a default primary sort property. This applies to any view.', '200px');
	var ttSecondarySort = generateTooltipOptions('top', 'hover', 'Select a default secondary sort property. This applies to any view and will sort within your primary property.', '200px');
	var ttEnableSecondarySort = generateTooltipOptions('top', 'hover', 'When checked, the secondary sort property will be used.', '200px');
	var ttColorizeVisibility = generateTooltipOptions('top', 'hover', 'Show or hide the color strips seen in the dashboard view.', '200px');
	var ttAccountAlias = generateTooltipOptions('top', 'hover', 'This is how your name is displayed publicly.', '200px');
	var ttGraphBy = generateTooltipOptions('right', 'hover', 'This property will be used to generate the data in the graph.', '200px');
	var ttGraphType = generateTooltipOptions('right', 'hover', 'Select the type of grah to generate.', '200px');
	
	$('i[tt="default-view"]').tooltip(ttDefaultView);
	$('i[tt="display-count"]').tooltip(ttDisplayCount);
	$('i[tt="items-per-row"]').tooltip(ttItemsPerRow);
	$('i[tt="primary-sort"]').tooltip(ttPrimarySort);
	$('i[tt="secondary-sort"]').tooltip(ttSecondarySort);
	$('i[tt="enable-secondary-sort"]').tooltip(ttEnableSecondarySort);
	$('i[tt="colorize-visibility"]').tooltip(ttColorizeVisibility);
	$('i[tt="account-alias"]').tooltip(ttAccountAlias);
	$('i[tt="graph-base"]').tooltip(ttGraphBy);
	$('i[tt="graph-type"]').tooltip(ttGraphType);
}

function generateTooltipOptions(placement, trigger, title, width) {
	
	return {
		delay: { "show": 200, "hide": 100 },
		placement: placement,
		trigger: trigger,
		title: title,
		template: '<div class="tooltip" role="tooltip" style="width: ' + width + ';">' +
					'<div class="tooltip-arrow"></div>' +
					'<div class="tooltip-inner"></div>' +
					'</div>'
	};
}

/*===================================================================*/
/*                                                                   */
/*                          Library Init                             */
/*                                                                   */
/*===================================================================*/

function zumpLibraryInit() {
	
    zipValidation = new ZumpValidate({
    	items: [
    		{id: 'accountZipCode', type:'zipcode', output: 'accountCityState'}
    	]
    });
    
    myZumpColorPicker = new ZumpColorPicker({
       baseColors: [
           {r: 255, g: 0, b: 0},
           {r: 255, g: 128, b: 0},
           {r: 255, g: 255, b: 0},
           {r: 0, g: 255, b: 0},
           {r: 0, g: 0, b: 255},
           {r: 255, g: 0, b: 255},
           {r: 128, g: 128, b: 128}
        ]
    });
    
    mySort = new ZumpSort({
	    sortToggle: '#results-header-sort',
	    sortContainer: '.current-sort-container',
	    addSortTrigger: '.add-sort-container',
	    sortFields: [
	        {text: 'Brand', property: 'brand', type: 'text'},
	        {text: 'Name', property: 'name', type: 'text'},
	        {text: 'Type', property: 'type', type: 'text'},
	        {text: 'Material', property: 'material', type: 'text'},
	        {text: 'Weight', property: 'weight', type: 'number'},
	        {text: 'Color', property: 'color', type: 'text'},
	        {text: 'Speed', property: 'speed', type: 'number'},
	        {text: 'Glide', property: 'glide', type: 'number'},
	        {text: 'Turn', property: 'turn', type: 'number'},
	        {text: 'Fade', property: 'fade', type: 'number'}
	    ],
	    triggerSort: showDiscs,
	    init: userPrefs.defaultSort
	});
	
	myFilter = new ZumpFilter({
		filterToggle: '#results-header-filter',
		currentFilterContainer: '#current-filter-container',
	    filterContainer: '#filter-container',
	    items: [
	        {text: 'Name', property: 'name', hideContainer: true},
	        {text: 'Brand', property: 'brand'},
	        {text: 'Tags', property: 'tagList'},
	        {text: 'Type', property: 'type'},
	        {text: 'Material', property: 'material'},
	        {text: 'Weight', property: 'weight'},
	        {text: 'Color', property: 'color'},
	        {text: 'Speed', property: 'speed'},
	        {text: 'Glide', property: 'glide'},
	        {text: 'Turn', property: 'turn'},
	        {text: 'Fade', property: 'fade'}
	    ],
	    onFilterChange: function() {
	        updateFilter();
	    }
	});
	
	myGallery = new ZumpGallery({
		galleryContainer: '#gallery-container'
	});
	
	myMessenger = new ZumpMessenger({
		threadTitle: '#thread-title',
		inboxList: '#inbox-list',
		addMessageContainer: '#add-message-container',
		messageContainer: '#message-container',
		loadMessages: '#load-messages',
		messageCount: '#message-count',
		sendMessageBtn: '#send-message-btn',
		newMessage: '#new-message',
		sendOnEnter: '#message-on-enter',
		activateThread: function() {
			changePage('#pg-inbox');
		}
	});
}

/*===================================================================*/
/*                                                                   */
/*                          Dashboard                                */
/*                                                                   */
/*===================================================================*/

function resizeSidebar() {
	if ($('.sidebar').width() < 161) {
		$('.sidebar').addClass('collapsed');
		sidebarSettings.collapsed = true;
		$('#sidebar-filter').on('mouseenter', function() {
			sidebarControl('open');
		});
       	$('#sidebar-filter').on('mouseleave', function() {
       		sidebarControl('close');
       	});
       	$('#sidebar-search').on('mouseenter', function() {
			sidebarControl('open');
		});
       	$('#sidebar-search').on('mouseleave', function() {
       		sidebarControl('close');
       	});
       	$('#search-all').on('focusin', function() {
			expandSidebar();
			sidebarSettings.locked = true;
		});
       	$('#search-all').on('focusout', function() {
       		collapseSidebar();
			sidebarSettings.locked = false;
       	});
	} else {
		$('.sidebar').removeClass('collapsed');
		sidebarSettings.collapsed = false;
		sidebarSettings.locked = false;
		$('.sidebar').css('width', '');
		$('#sidebar-filter').off('mouseenter');
		$('#sidebar-filter').off('mouseleave');
       	$('#sidebar-search').off('mouseenter');
       	$('#sidebar-search').off('mouseleave');
       	$('#search-all').off('focusin');
       	$('#search-all').off('focusout');
	}
}

/*
* Handles expanding/contracting filter when sidebar is collapsed
*/
function sidebarControl(direction) {
	
	if (!sidebarSettings.locked) {
		if (direction == "open") {
			expandSidebar();
		} else if (direction == "close") {
			collapseSidebar();
		}
	}
}

function expandSidebar() {
	$('.sidebar').stop().animate({width:'250px'}, 300);
}

function collapseSidebar() {
	$('.sidebar').stop().animate({width:'161px'}, 300, function() {
		$('.sidebar').css('width', '');
	});
}

/*
* Global search method
*/
function doSearch() {
	var search = $searchBar.val();
	
	containSearch(search, ['name', 'brand', 'tagList'], function(prop, list) {
		if (prop == 'name') {
			updateSearchResults($('#results-name'), list);
		} else if (prop == 'brand') {
			updateSearchResults($('#results-brand'), list);
		} else if (prop == 'tagList') {
			updateSearchResults($('#results-tagList'), list);
		}
	});
}

/*
* Shows search based on results
*/
function updateSearchResults($section, list) {
	var $output = $section.children('.result-section-output');
	$output.children('li:not(.result-item-empty)').remove();
	if (list.length > 0) {
		$output.children('.result-item-empty').hide();
		_.each(list, function(result) {
			$output.append(generateResultItem(result));
		});
	} else {
		$output.children('.result-item-empty').show();
	}
}   

/*
* Filters the discs and redraws the results table
*/
function updateFilter(generateFilters) {
	$('#filter-count').text(myFilter.getCount() > 0 ? myFilter.getCount() : '');
	discList = myFilter.filter(discs, generateFilters);
	showDiscs();
}

/*
* Ensures the header width maintains the result view width
*/
function resizeResultHeader() {
	$inventoryHeader.css({
		'width': $inventoryContainer.outerWidth()
	});
}

/*
* Adds "more" button if tags exceed available width in dashboard view
*/
function resizeTagLists() {
	var $tagContainers = $filterResults.find('.disc-info-tags-container');
	
	$tagContainers.each(function(i) {
		var $tagContainer = $(this);
		var $tagList = $tagContainer.find('.disc-info-tags-inner');
		var $tagLabel = $tagContainer.find('.disc-info-tag-label');
		var $tagDropdown = $tagContainer.find('.tag-dropdown');
		var dropdownHidden = $tagDropdown.is(":hidden");
		if ($tagList.width() > ($tagContainer.width() - $tagLabel.width())) {
			if (dropdownHidden) {
				$tagList.find('.disc-info-tag').css('visibility', 'hidden');
				$tagDropdown.show();
			}
		} else {
			if (!dropdownHidden) {
				$tagDropdown.hide();
				$tagList.find('.disc-info-tag').css('visibility', 'visible');
			}
		}
	});
}

/*
* Initialize function
*/
function initialize() {
	updateFilter(true);
}

/*
* Shows the gallery view
*/
function showDiscGallery() {
	var sorted = mySort.doSort(discList);
	myGallery.showGallery();
	/*_.each(sorted, function(disc) {
		getPrimaryDiscImage(disc.primaryImage, updateDiscImage);
	});*/
}

/*
* Hides the gallery view
*/
function hideDiscGallery() {
	myGallery.hideGallery();
}

/*
* Reloads a single disc item
*/
function updateDiscItem(disc) {
	$('div.disc-item[discId="' + disc._id + '"]').empty().append(generateDiscData(disc));
	getPrimaryDiscImage(disc.primaryImage, updateDiscImage);
	// Initialize notes tooltip
	var ttNotes = generateTooltipOptions('left', 'hover', disc.notes, 'auto');
	$('i[tt="notes"]').tooltip(ttNotes);
}

/*
* Reloads the results section
*/
function showDiscs(maintainPage) {
	if (!maintainPage) {
		paginateOptions.currentPage = 1;
	}
	
	$filterResults.empty();
	var sorted = mySort.doSort(discList);
	myGallery.updateGallery(sorted);
	var paged = paginate(sorted);
	
	if (discList.length) {
		_.each(sorted, function(disc) {
			
			if (!isDef(disc.tempFileId)) {
					getPrimaryDiscImage(disc.primaryImage, updateDiscImage);	
			}
			
			if (_.contains(paged, disc)) {
				$filterResults.append(generateDiscTemplate(disc));
				// Initialize notes tooltip
				var ttNotes = generateTooltipOptions('left', 'hover', disc.notes, 'auto');
				$('i[tt="notes"]').tooltip(ttNotes);
			}
		});
	} else {
		$filterResults.append(generateDiscTemplate('No Results'));
	}
	
	updateHeader(sorted.length);
	resizeResultHeader();
	resizeTagLists();
	renderPlot();
}

/*
* Locates the image source and updates with the file name
*/
function updateDiscImage(success, discImage) {
	if (success && !_.isEmpty(discImage)) {
		var $discItem = $('div.disc-item[discId="' + discImage.discId + '"]');
		$discItem.find('.disc-content-image img').attr('src', '/files/' + discImage.thumbnailId);
		myGallery.updateObject(discImage.discId, {image: discImage.fileId});
		
		var disc = getDisc(discImage.discId);
		disc.tempThumbnailId = discImage.thumbnailId;
		disc.tempFileId = discImage.fileId;
	}
}

/*
* Updates the sort header
*/
function updateHeader(count) {
	$('#results-header-count').text('Results: ' + count);
	
	var $paginate = $('#paginate-nav');
	var $pageInsert = $('#page-back');
	$paginate.find('.page-dynamic').remove();
	
	var start = 1;
	var end = 5;
	
	if (paginateOptions.currentPage < 3) {
		end = Math.min(5, paginateOptions.lastPage);
	} else if (paginateOptions.currentPage > paginateOptions.lastPage - 2) {
		end = paginateOptions.lastPage;
		start = Math.max(1, paginateOptions.lastPage - 4);
	} else {
		start = paginateOptions.currentPage - 2;
		end = paginateOptions.currentPage + 2;
	}
	
	for (var i = end; i >= start; i--) {
		$pageInsert.after('<li class="page-dynamic' + (i == paginateOptions.currentPage ? ' active' : '') + '">' + i + '</li>');
	}
}

/*
* Returns the color based on the user preferences
*/
function getColorize(type) {
	if (!isDef(userPrefs.colorize)) return undefined;
	
	if (type == 'Putt/Approach') {
		return userPrefs.colorize['putter'];
	} else if (type == 'Mid-range') {
		return userPrefs.colorize['mid'];
	} else if (type == 'Fairway Driver') {
		return userPrefs.colorize['fairway'];
	} else if (type == 'Distance Driver') {
		return userPrefs.colorize['distance'];
	} else if (type == 'Mini') {
		return userPrefs.colorize['mini'];
	} else return undefined;
}

/*
* Generaes the container to hold the disc row
*/
function generateDiscTemplate(disc) {
	var discContainer = $('<div class="disc-item-container"></div>');
	
	if (disc == "No Results") {
		discContainer.append('<div class="disc-item">' +
								'<div class="disc-content-info-container no-results">' +
									'<span class="no-results"><i class="fa fa-exclamation-triangle"></i> No Results</span>' +
								'</div>' +
								'<div class="clearfix"></div>' +
							'</div>');
	} else {
		var discItem = $('<div class="disc-item" discId="' + disc._id + '"></div>');
		
		discItem.append(generateDiscData(disc));
		discContainer.append(discItem);
	}
	return discContainer;
}

/*
* Creates a standard disc data row
*/
function generateDiscData(disc) {
	var tagHTML = '';
	var tagDropdown = '';
	var tagDropdownInner = '';
	var flightNumbersHTML = '';
	var notesHTML = '';
	
	_.each(disc.tagList, function(tag) {
		tagDropdownInner = tagDropdownInner + '<li class="disc-info-tag"><a>' + tag + '</a></li>';
		tagHTML = tagHTML + '<span class="disc-info-tag">' + tag + '</span>';
	});
	
	tagDropdown = '<div class="dropdown tag-dropdown" style="display: none">' +
				  	'<button class="btn btn-default dropdown-toggle btn-tag-dropdown" type="button" id="tag-dropdown-menu" data-toggle="dropdown" aria-expanded="false">More... <span><i class="fa fa-caret-down"></i></span></button>' +
					  '<ul class="dropdown-menu tag-dropdown-menu" role="menu" aria-labelledby="tag-dropdown-menu">' +
					  tagDropdownInner +
					  '</ul>' +
					'</div>';
	
	var color = getColorize(disc.type);
	
	if (isDef(disc.notes) && disc.notes != '') { 
		notesHTML = '<span><i class="fa fa-file-text fa-lg fa-dim fa-disc-notes" data-toggle="tooltip" tt="notes"></i></span>';
	}

	if ((typeof disc.speed != 'undefined') || (typeof disc.glide != 'undefined') || (typeof disc.turn != 'undefined') || (typeof disc.fade != 'undefined')) {
		flightNumbersHTML = ((typeof disc.speed != 'undefined') ? disc.speed : '??') + ' | ' +
	                        ((typeof disc.glide != 'undefined') ? disc.glide : '??') +' | ' +
	                        ((typeof disc.turn != 'undefined') ? disc.turn : '??') + ' | ' +
	                        ((typeof disc.fade != 'undefined') ? disc.fade : '??');
	}
	return '<div class="disc-colorize"' + (isDef(color) && userPrefs.colorizeVisibility ? ' style="background-color: ' + color + '"' : ' style="background-color:#FFF"') + '>' + 
                	'</div>' +
                    '<div class="disc-content-image-container">' +
                        '<div class="disc-content-image">' +
                            '<img src="' + (isDef(disc.tempThumbnailId) ? '/files/' + disc.tempThumbnailId : '/static/logo/logo_small_faded.svg') + '" />' +
                        '</div>' +
                    '</div>' +
                    '<div class="disc-content-action-container float-right">' +
                		'<table>' +
                			'<tbody style="text-align: center;">' +
	                            '<tr class="disc-item-actions-top">' +
	                            	'<td></td>' +
	                                '<td>' +
	                                	'<span><i class="fa fa-minus-circle fa-lg fa-dim fa-delete-disc-item"></i></span>' +
	                                '</td>' +
	                            '</tr>' +
	                            '<tr class="disc-item-actions-middle">' +
	                            	'<td>' +
	                            		notesHTML +
	                            	'</td>' +
	                                '<td>' +
	                                	'<span><i class="fa fa-pencil fa-lg fa-dim fa-edit-disc-item"></i></span>' +
	                                '</td>' +
	                            '</tr>' +
	                            '<tr class="disc-item-actions-bottom">' +
	                            	'<td>' + 
	                            		(disc.visible ?
	                            		'<span><i class="fa fa-facebook-square fa-lg fa-dim fa-share-disc-item"></i></span>' :
	                                	'') +
	                            	'</td>' +
	                                '<td>' +
	                                	(disc.visible ?
	                                	'<span><i class="fa fa-eye fa-lg fa-dim fa-visible-disc-item"></i></span>' :
	                                	'<span><i class="fa fa-eye-slash fa-lg fa-dim fa-visible-disc-item"></i></span>') +
	                                '</td>' +
	                            '</tr>' +
                           	'</tbody>' +
                        '</table>' +
                    '</div>' +
                    '<div class="disc-content-info-container">' +
                        '<div class="disc-info-main-pane">' +
                            '<div class="disc-info-left-pane div-inline float-left">' +
                            	'<div class="disc-info-name-container float-left">' +
	                                '<div class="disc-info-brand">' + (disc.brand ? disc.brand : '') + '</div>' +
	                                '<div class="disc-info-name"><a target="_blank" href="/disc/' + disc._id + '">' + (disc.name ? disc.name : '') + '</a></div>' +
                            	'</div>' +
                            	(disc.condition ? '<div class="disc-info-condition float-right">' + disc.condition + '</div>' : '') +
                            	'<div class="clearfix"></div>' +
                            '</div>' +
                            '<div class="disc-info-right-pane disc-specs div-inline float-left">' +
                                '<div class="div-inline float-left div-split-horiz">' +
                                	'<div class="disc-info-item">' +
	                                	'<span class="disc-info-label">Type:</span>' +
	                                	'<span class="disc-info-value">' + (disc.type ? disc.type : '') + '</span>' +
                                	'</div>' +
                                	'<div class="disc-info-item">' +
	                                	'<span class="disc-info-label">Material:</span>' +
	                                	'<span class="disc-info-value">' + (disc.material ? disc.material : '') + '</span>' +
                                	'</div>' +
                                '</div>' +
                                '<div class="div-inline float-left div-split-horiz">' +
                                	'<div class="disc-info-item">' +
	                                	'<span class="disc-info-label">Color:</span>' +
	                                	'<span class="disc-info-value">' + (disc.color ? disc.color : '') + '</span>' +
                                	'</div>' +
                                	'<div class="disc-info-item">' +
	                                	'<span class="disc-info-label">Weight:</span>' +
	                                	'<span class="disc-info-value">' + ((typeof disc.weight != 'undefined') ? disc.weight + ' g': '') + '</span>' +
                                	'</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div style="margin-top: 10px">' +
                            '<div class="disc-info-left-pane div-inline float-left">' +
                            	'<div class="disc-info-numbers">' +
	                                flightNumbersHTML +
                                '</div>' +
                            '</div>' +
                            '<div class="disc-info-right-pane div-inline float-left">' +
                            	'<div class="disc-info-tags-container">' +
                            		'<div class="disc-info-tags-list">' +
                            			'<span class="disc-info-tag-label">Tags:</span>' +
	                            			tagDropdown +
		                                	'<span class="disc-info-tags-inner">' + tagHTML + '</span>' +
                            		'</div>' +
	                    		'</div>' +
                            '</div>' +
                            '<div class="clearfix"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="clearfix"></div>';
}

/*
* Paginates the provided array
*/
function paginate(toPaginate) {
	var lastPage = 1;
	
	if (paginateOptions.displayCount > -1) {
		lastPage = Math.ceil((toPaginate.length / paginateOptions.displayCount));
	}
	
	paginateOptions.lastPage = lastPage;
	if (paginateOptions.currentPage > lastPage) {
		paginateOptions.currentPage = lastPage;
	}
	
	if (paginateOptions.currentPage < 1) paginateOptions.currentPage = 1;
	
	var start = (paginateOptions.currentPage - 1) * paginateOptions.displayCount;
	var end = paginateOptions.displayCount > -1 ? Math.min(toPaginate.length, start + paginateOptions.displayCount) : toPaginate.length;
	return toPaginate.slice(start, end);
}

/*
* Generates a modal popup for users to submit feedback
*/
function generateFeedbackModal(title, btnText, submitFn) {
	var header = '<h4 class="modal-title">' + title + '</h4>';
          
	var body =  '<p><b>We would love to hear from you!</b></p>' +
				'<br />' +
				'<p>Use the form below to submit questions, suggestions, or complaints and we will address them as soon as possible.</p>' +
				'<br />' +
				'<textarea id="feedback-textarea" placeholder="Enter feedback here..."></textarea>';
			
	var footer = '<button type="button" class="btn btn-default" fn-title="cancel">Cancel</button>' +
				'<button type="button" class="btn btn-primary" fn-title="submit"><span><i class="fa fa-reply-all fa-tools"></i></span>' + btnText + '</button>';
		
	var fns = [
				{
					name: 'cancel',
					function: function($btn, $inner, done) {
						done();
					}
				},
				{
					name: 'submit',
					function: submitFn
				}
		];
		
	generateModal({
		header: header, 
		body: body, 
		footer: footer, 
		fns: fns
	});
}

/*
* Generates a modal popup with the specified parameters
*/
function generateModal(opt) {
	
	// Remove all other modals
	$('.custom-modal').remove();
	
	// private vars
	var headerText = '';
	var bodyText = '';
	var footerText = '';
	
	// Get modal building blocks
	if (isDef(opt.header)) {
		headerText = opt.header;
	}
	
	if (isDef(opt.body)) {
		bodyText = opt.body;
	}
	
	if (isDef(opt.footer)) {
		footerText = opt.footer;
	}
	
	// Create modal
	var $modal = $('<div class="modal custom-modal fade" tabindex="-1" role="dialog" aria-hidden="true"></div>');
	$modal.html('<div class="modal-dialog">' + 
            '<div class="modal-content">' + 
              '<div class="modal-header">' + headerText +
              '</div>' + 
              '<div class="modal-body">' + bodyText + 
              '</div>' + 
              '<div class="modal-footer">' + footerText +
              '</div>' + 
            '</div>' + 
            '</div>');
            
     $('body').append($modal);
     
     // Setup events
     if (isDef(opt.fns)) {
     	
     	_.each(opt.fns, function(fn) {
     		if (fn.name && fn.function) {
     			$modal.find('[fn-title="' + fn.name +'"]').on('click', function() {
     				fn.function($(this), $modal.find('.modal-body'), function() {
     					$modal.modal('hide');
     				});
     			});
     		}
     	});
     }
     
    // On hide event
    $modal.on('hidden.bs.modal', function (e) {
    	if (isDef(opt.onClose)) {
			opt.onClose($modal.find('.modal-body'));
		}
		$('body').css('overflow', 'auto');
	  	$modal.remove();
	  	$(window).off('resize', resizeModal);
	  
	});
	
	// On shown event
	$modal.on('shown.bs.modal', function (e) {
		$('body').css('overflow', 'hidden');
		resizeModal();
		
	  	if (isDef(opt.onShow)) {
			opt.onShow($modal.find('.modal-body'));
		}
	});
	
	// On create event
	if (isDef(opt.onCreate)) {
		opt.onCreate($modal.find('.modal-body'));
	}
	
	// Resize based on window size
	$(window).on('resize', resizeModal);
	
	// show modal
	fnLock = false;
    $modal.modal({show: true, backdrop: 'static'});
}

/*
* Resizes the modal based on the window screen size
*/
function resizeModal() {
	var windowHeight = $(window).height();
	var headerHeight = $('.modal-header').outerHeight();
	var footerHeight = $('.modal-footer').outerHeight();
	var height = Math.max((windowHeight - headerHeight - footerHeight - 62), 120);
	
	$('.modal-body').css({
		maxHeight: height + 'px',
		overflow: 'auto'
	});
}

/*
* Exports the inventory to an excel sheet
*/
function exportList() {
	var $header = $('<div></div>').html(
		'<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
          '<h4 class="modal-title">Export List</h4>'
		);
	var $form =  $('<form class="form" role="form" autocomplete="off"></form>');
	$form.html('<div class="form-group">' + 
				'<label for="exportFileName">File Name</label>' +
				'<input type="text" class="form-control" id="exportFileName" placeholder="File Name">' +
	  		'</div>' +
	  		'<div class="radio">' +
				'<label>' +
					'<input type="radio" name="exportOptions" id="exportAll" value="all" checked>' +
					'Export All Discs' +
				'</label>' +
			'</div>' +
			'<div class="radio">' +
				'<label>' +
					'<input type="radio" name="exportOptions" id="exportFiltered" value="filtered">' +
					'Export Filtered Discs' +
				'</label>' +
			'</div>');
			
	var $footer = $('<div></div>').html(
		'<button type="button" class="btn btn-default" fn-title="close">Close</button>' + 
          '<button type="button" class="btn btn-primary" fn-title="export"><span><i class="fa fa-external-link fa-tools"></i></span>Export</button>'
		);
		
	var fns = [
				{
					name: 'close',
					function: function($btn, $inner, done) {
						done();
					}
				},
				{
					name: 'export',
					function: function($btn, $inner, done) {
						var fileName = $inner.find('#exportFileName').val();
						var type = $inner.find('input:radio:checked').val();
						
						if (fileName == '') {
							var dt = new Date();
							var time = dt.getHours() + '_' + dt.getMinutes() + '_' + dt.getSeconds();
							fileName = 'DiscZump_' + time;
						}
						
						var csvContent = "data:text/csv;charset=utf-8,";
						var writeHeaders = true;
						var list = discs;
						if (type == 'filtered') {
							list = discList;
						}
						
						_.each(list, function(disc) {
							if (writeHeaders) {
								csvContent += _.map(_.keys(disc), function(key) {return key.toUpperCase();}).join(',') + '\n';
								writeHeaders = false;
							}
							
							csvContent += _.values(disc).join(',') + '\n';	
						});
						
						var encodedUri = encodeURI(csvContent);
						var link = document.createElement("a");
						link.setAttribute('href', encodedUri);
						link.setAttribute('download', fileName + '.csv');
						link.click();
						done();
					}
				}
		];
		
	generateModal($header, $form, $footer, {fns: fns});
}

/*
* Alerts the user that a disc will be deleted
*/
function generateConfirmationModal(title, bodyText, btnText, deleteFn) {
	var header = '<h4 class="modal-title">' + title + '</h4>';
          
	var body =  '<p>' + bodyText + '</p>';
			
	var footer = '<button type="button" class="btn btn-default" fn-title="cancel">Cancel</button>' +
		'<button type="button" class="btn btn-danger" fn-title="confirm"><span><i class="fa fa-minus-circle fa-tools"></i></span>' + btnText + '</button>';
		
	var fns = [
				{
					name: 'cancel',
					function: function($btn, $inner, done) {
						done();
					}
				},
				{
					name: 'confirm',
					function: deleteFn
				}
		];
		
	generateModal({
		header: header, 
		body: body, 
		footer: footer, 
		fns: fns
	});
}

/*
* Initializes the modify disc page
*/
function initModifyDiscPage() {
	var $tagInput = $('#modify-disc-form').find('.add-disc-tag');
	var $tagContainer = $('#modify-disc-form').find('.tag-list-container');
	
	$('#pg-modify-disc').find('.page-title > span').text(modifyHandler.type);
	$('#disc-visibility').bootstrapSwitch('state', true);
	createDropZone($('#modify-disc-form').find('.dropzone-area'));
	initAddDiscListeners();
    initEditDiscListeners();
    setAccordions($modifyDiscForm);
	
	$('#modify-disc-form').find('.text-assist').each(function(index) {
		var textAssist = new ZumpTextAssist({
	        inputElement: $(this),
	        searchProp: $(this).attr('param'),
	        items: function() { return discs; }, 
	        onSelection: function(item) {
	        }
	    });
	    
	    textAssistArr.push(textAssist);
	});
	
	var tagTextAssist = new ZumpTextAssist({
		inputElement: $tagInput,
		searchProp: 'tagList',
		items: function() { return discs; }, 
        onSelection: function(item, reset) {
       		if (item.length > 0) {
        		$tagContainer.append(generateTagItem(item));
    			reset();
        	}
        }
	});
	
	textAssistArr.push(tagTextAssist);
	
	$('#modify-disc-form').find('[tt="condition"]').tooltip({
    	delay: { "show": 200, "hide": 100 },
    	placement: 'top',
    	trigger: 'hover',
    	title: 'Condition based on Sleepy Scale. Must be an integer with 1 optional decimal place.',
    	template: '<div class="tooltip" role="tooltip" style="width: 150px;">' +
    				'<div class="tooltip-arrow"></div>' +
    				'<div class="tooltip-inner"></div>' +
    				'</div>'
    });
	
}

/*
* Setup for the modify disc page each time it's opened
*/
function stageModifyDiscPage(action, discId) {
	
	$('#pg-modify-disc').find('.page-title > span').text(action);
	
	if (action == 'Add') {
		$('#modify-disc-form').attr('discId', '');
		$('#modify-disc-form').find('button[fn-title="save"]').attr('discId', '');
		$('.current-images-label').hide();
		$('#clear-modify-disc-form').show();
	} else if (action == 'Edit') {
		clearModifyDiscForm();
		$('#modify-disc-form').attr('discId', discId);
		$('#modify-disc-form').find('button[fn-title="save"]').attr('discId', discId);
		$('.current-images-label').show();
		$('#clear-modify-disc-form').hide();
		$('.sidebar-select.nav.active').removeClass('active');
		populateDiscForm();
	}
}

/*
* Clears and resets the modify disc form.
*/
function clearModifyDiscForm() {
	var accordionIcons = $modifyDiscForm.find('.accordion-header > label .fa');
	
	$modifyDiscForm.trigger("reset");
	$modifyDiscForm.find('.has-error').removeClass('has-error');
	$modifyDiscForm.find('div.alert').remove();
	$modifyDiscForm.find('.tag-list-container').empty();
	$('#existing-image-list').empty();
	$('#disc-visibility').bootstrapSwitch('state', true);
	clearDropzone(dropzones[0]);
	setAccordions($modifyDiscForm, 'hide');
	_.each(accordionIcons, function(icon) {
		changeIcon(icon, 'fa-chevron-down', 'fa-chevron-right');
	});
}

/*
* Initializes add disc page listeners
*/
function initAddDiscListeners() {
	var $tagInput = $('#modify-disc-form').find('.add-disc-tag');
	var $addCustomTag = $('#modify-disc-form').find('.add-custom-tag');
	var $tagContainer = $('#modify-disc-form').find('.tag-list-container');
	
	$addCustomTag.click(function(){
    	if ($tagInput.val().length > 0) {
			$tagContainer.append(generateTagItem($tagInput.val()));
    		$tagInput.val('');
    	}
    });
}

/*
* Initializes edit disc page listeners
*/
function initEditDiscListeners() {
	var $imageContainer = $('#existing-image-list');
    
    $imageContainer.on('click', '.image-remove', function() {
    	var $parent = $(this).parents('.image-item-container');
    	var imageId = $parent.attr('imageid');
    	var disc = changeObject.curDisc;
    	
    	$parent.remove();
    	
    	if (!isDef(changeObject.imageRemovals)) {
    		changeObject.imageRemovals = [];
    	}
    	
    	if (disc.primaryImage == imageId) {
    		var $images = $imageContainer.find('.image-item-container');
    		if ($images.length) {
    			var $newPrimary = $images.first();
    			disc.primaryImage = $newPrimary.attr('imageid');
    			updateExistingImage(disc.primaryImage);
    		} else {
    			disc.primaryImage = '';
    		}
    	}
    	
    	changeObject.imageRemovals.push(imageId);
    });
    
    $imageContainer.on('click', '.image-make-primary', function() {
    	var $parent = $(this).parents('.image-item-container');
    	var imageId = $parent.attr('imageid');
    	var disc = changeObject.curDisc;
    	
    	disc.primaryImage = imageId;
    	updateExistingImage(imageId);
    });
}

/*
* Populate the Edit Disc form with existing disc data
*/
function populateDiscForm() {
	changeObject = {};
	
	var discId = modifyHandler.discId;
	changeObject.curDisc = copyDisc(discId);
	
	var disc = changeObject.curDisc;
	var tagList = disc['tagList'];
	var $tagContainer = $('#modify-disc-form').find('.tag-list-container');
	var $imageContainer = $('#existing-image-list');

	$('#disc-brand').val(getSafe(disc.brand, ''));
	$('#disc-name').val(getSafe(disc.name, ''));
	$('#disc-material').val(getSafe(disc.material, ''));
	$('#disc-type').val(getSafe(disc.type, ''));
	$('#disc-weight').val(getSafe(disc.weight, ''));
	$('#disc-color').val(getSafe(disc.color, ''));
	$('#disc-speed').val(getSafe(disc.speed, ''));
	$('#disc-glide').val(getSafe(disc.glide, ''));
	$('#disc-turn').val(getSafe(disc.turn, ''));
	$('#disc-fade').val(getSafe(disc.fade, ''));
	$('#disc-notes').val(getSafe(disc.notes, ''));
	$('#disc-condition').val(getSafe(disc.condition, ''));
	
	$('#disc-visibility').bootstrapSwitch('state', getSafe(disc.visible, true));
	
	_.each(tagList, function(tag) {
    	$tagContainer.append(generateTagItem(tag));
    });
	
	getAllDiscImages(discId, function(success, images) { 
		if (success) {
			var primaryImage = disc.primaryImage;
			_.each(images, function(image) {
				$imageContainer.append(generateImageItem(primaryImage, image));
			});
		}	
	});
}

/*
* Sets all accordions (show/hide) for specified container
*/
function setAccordions($container, action) {
	var accordions = $container.find('.collapse');
	_.each(accordions, function(accordion) {
		$(accordion).collapse(action);
	});
}

/*
* Sets all accordion icons to specific direction for specified conatiner
*/
function changeIcon(icon, remove, add) {
	
	$(icon).removeClass(remove).addClass(add);
}

/*
* Clears dropzone
*/
function clearDropzone(dropzone) {
	$('#dropzone-trigger').siblings().remove();
	dropzone.disable();
	dropzone.enable();
}

/*
* Creating and saving a new disc
*/
function saveNewDisc() {
	$('#modify-disc-form').find('div.alert').remove();
	var disc = createDisc($('#modify-disc-form'));
	var errorCount = $('#modify-disc-form').find('.has-error').length;
	if (!disc.brand || !disc.name || disc.brand == '' || disc.name == '') {
		$('#modify-disc-form').prepend(generateError('Brand and Name are required.', 'ERROR'));
    } else if (errorCount > 0) {
    	var errorText = '';
    	var errorLength = errorCount;
    	
    	_.each($('#modify-disc-form').find('.has-error'), function(element) {
    		if (errorLength > 1) {
    			errorText = errorText + $(element).prev().text() + ', ';
    		} else {
    			errorText = errorText + $(element).prev().text();
    		}
    		errorLength = errorLength - 1;
    	});
    	
    	$('#modify-disc-form').prepend(generateError('Invalid data in ' + (errorCount > 1 ? errorText + ' fields.' : errorText + ' field.'), 'ERROR'));
    	
    } else if ($('#modify-disc-form').find('div.alert').length == 0) {
    	postDisc(disc, function(success, retData) {
			if (success) {
				discs.push(retData);
				var $dropzone = $('#modify-disc-form').find('.dropzone-area');
				var id = $dropzone.attr('dropzoneid');
				var dropzone = dropzones[0];
				if (dropzone && dropzone.getAcceptedFiles().length > 0) {
					dropzone.options.url = '/api/discs/' + retData._id + '/images';
					dropzone.on('queuecomplete', function() {
						$('#modify-disc-form').prepend(generateSuccess(retData.brand + ' ' + retData.name + ' was successfully added.', 'Success'));
						autoCloseAlert($('#modify-disc-form').find('.alert'), 2000);
						getDiscById(retData._id, function(err, disc) {
							discs = _.filter(discs, function(curDisc){
								return curDisc._id != disc._id;
							});
							discs.push(disc);
							updateFilter(true);
						});
						
						clearDropzone(dropzone);
					})
					
					dropzone.processQueue();
				} else {
					$('#modify-disc-form').prepend(generateSuccess(retData.brand + ' ' + retData.name + ' was successfully added.', 'Success'));
					autoCloseAlert($('#modify-disc-form').find('.alert'), 2000);
					updateFilter(true);
				}
			} else {
				$('#modify-disc-form').prepend(generateError(retData.message, 'ERROR'));
			}
		});
    }
}

/*
* Changing and saving an existing disc
*/
function saveExistingDisc() {
	if (fnLock) return;	
	fnLock = true;
	$('#modify-disc-form').find('div.alert').remove();
	var disc = createDisc($('#modify-disc-form'), changeObject.curDisc);
	var errorCount = $('#modify-disc-form').find('.has-error').length;
	if (!disc.brand || !disc.name || disc.brand == '' || disc.name == '') {
		$('#modify-disc-form').prepend(generateError('Brand and Name are required.', 'ERROR'));
		fnLock = false;
    } else if (errorCount > 0) {
    	var errorText = '';
    	var errorLength = errorCount;
    	
    	_.each($('#modify-disc-form').find('.has-error'), function(element) {
    		if (errorLength > 1) {
    			errorText = errorText + $(element).prev().text() + ', ';
    		} else {
    			errorText = errorText + $(element).prev().text();
    		}
    		errorLength = errorLength - 1;
    	});
    	
    	$('#modify-disc-form').prepend(generateError('Invalid data in ' + (errorCount > 1 ? errorText + ' fields.' : errorText + ' field.'), 'ERROR'));
		fnLock = false;
    	
    } else if ($('#modify-disc-form').find('div.alert').length == 0) {
		putDisc(disc, function(success, retData) {
			if (success) {
				
				var index = discs.indexOf(getDisc(retData._id));
				discs[index] = retData;
				
				if (isDef(changeObject.imageRemovals)) {
					_.each(changeObject.imageRemovals, function(imageId) {
						deleteImage(imageId, function(success, data) {
							if (success) {
								//deleted disc image
							}
						});
					});
				}
				
				var $dropzone = $('#modify-disc-form').find('.dropzone-area');
				var id = $dropzone.attr('dropzoneid');
				var dropzone = dropzones[id];
				if (dropzone && dropzone.getAcceptedFiles().length > 0) {
					dropzone.options.url = '/api/discs/' + retData._id + '/images';
					dropzone.on('queuecomplete', function() {
						$('#modify-disc-form').prepend(generateSuccess(retData.brand + ' ' + retData.name + ' was successfully updated.', 'Success'));
						getDiscById(retData._id, function(err, disc) {
							discs = _.filter(discs, function(curDisc){
								return curDisc._id != disc._id;
							});
							discs.push(disc);
							updateFilter(true);
						});
					})
					dropzone.processQueue();
				} else {
					$('#modify-disc-form').prepend(generateSuccess(retData.brand + ' ' + retData.name + ' was successfully updated.', 'Success'));
					updateFilter(true);
				}
			} else {
				$('#modify-disc-form').prepend(generateError(retData.message, 'ERROR'));
				fnLock = false;
			}
		});
    }
}

/*
* Generates the modal containing the form to either edit/create a disc
*/
// function generateDiscInputForm(disc) {
// 	var isEdit = isDef(disc);
// 	var discId = isEdit ? disc._id : '';
	
// 	var header = '<h4 class="modal-title">' + (isEdit ? 'Edit' : 'Create') + ' Disc</h4>';
          
//     var footer = '<button type="button" class="btn btn-default" fn-title="close">Close</button>' +
// 		'<button type="button" class="btn btn-primary" fn-title="save" discId=' + discId + '><span><i class="fa fa-save fa-tools"></i></span>Save</button>';
		
// 	var form = '<form class="form-horizontal" role="form" discId="' + discId + '" autocomplete="off">' +
// 				'<div class="form-group">' +
// 	                '<label class="col-sm-2 control-label"><span class="required-field">* </span>Brand</label>' +
// 	                '<div class="col-sm-4">' +
// 	                    '<input type="text" id="disc-brand" class="form-control text-assist" param="brand">' +
// 	                '</div>' +
// 	                '<label class="col-sm-2 control-label"><span class="required-field">* </span>Name</label>' +
// 	                '<div class="col-sm-4">' +
// 	                    '<input type="text" id="disc-name" class="form-control text-assist" param="name">' +
// 	                '</div>' +
// 	            '</div>' +
// 	            '<div class="form-group">' +
// 	                '<label class="col-sm-2 control-label">Type</label>' +
// 	                '<div class="col-sm-4">' +
// 	                    '<select id="disc-type" class="form-control" param="type">' +
// 	                        '<option value=""' + (isEdit ? '' : 'selected') + '></option>' +
// 	                        '<option value="Distance Driver">Distance Driver</option>' +
// 	                        '<option value="Fairway Driver">Fairway Driver</option>' +
// 	                        '<option value="Mid-range">Mid-range</option>' +
// 	                        '<option value="Putt/Approach">Putt/Approach</option>' +
// 	                        '<option value="Mini">Mini</option>' +
// 	                     '</select>' +
// 	                '</div>' +
// 	                '<label class="col-sm-2 control-label">Material</label>' +
// 	                '<div class="col-sm-4">' +
// 	                    '<input type="text" id="disc-material" class="form-control text-assist" param="material">' +
// 	                '</div>' +
// 	            '</div>' +
// 	            '<div class="form-group">' +
// 	                '<label class="col-sm-2 control-label">Weight</label>' +
// 	                '<div class="col-sm-4">' +
// 	                    '<input type="text" id="disc-weight" class="form-control text-assist number-validate" param="weight">' +
// 	                '</div>' +
// 	                '<label class="col-sm-2 control-label">Color</label>' +
// 	                '<div class="col-sm-4">' +
// 	                    '<input type="text" id="disc-color" class="form-control text-assist" param="color">' +
// 	                '</div>' +
// 	            '</div>' +
// 	            '<div class="accordion-container">' +
// 	            	'<div class="accordion-header">' +
// 	                    '<label class="no-select" param="advanced" aria-controls="collapseAdvanced"><span><i class="fa fa-chevron-right fa-tools"></i></span>Advanced</label>' +
// 	                '</div>' +
// 	                '<div class="advanced-area collapse" id="collapseAdvanced">' +
// 			            '<div class="form-group">' +
// 			                '<label class="col-sm-3 control-label">Speed</label>' +
// 			                '<div class="col-sm-3">' +
// 			                    '<input type="text" id="disc-speed" class="form-control text-assist weight-number-validate" param="speed">' +
// 			                '</div>' +
// 			                '<label class="col-sm-3 control-label">Glide</label>' +
// 			                '<div class="col-sm-3">' +
// 			                    '<input type="text" id="disc-glide" class="form-control text-assist number-validate" param="glide">' +
// 			                '</div>' +
// 			            '</div>' +
// 			            '<div class="form-group">' +
// 			                '<label class="col-sm-3 control-label">Turn</label>' +
// 			                '<div class="col-sm-3">' +
// 			                    '<input type="text" id="disc-turn" class="form-control text-assist number-validate" param="turn">' +
// 			                '</div>' +
// 			                '<label class="col-sm-3 control-label">Fade</label>' +
// 			                '<div class="col-sm-3">' +
// 			                    '<input type="text" id="disc-fade" class="form-control text-assist number-validate" param="fade">' +
// 			                '</div>' +
// 			            '</div>' +
// 			            '<div class="form-group tag-input-group">' +
// 			                '<label class="col-sm-2 control-label">Tags</label>' +
// 			                '<div class="col-sm-10">' +
// 			                    '<div style="position:relative">' +
// 			                        '<div class="input-group add-disc-tag-container">' +
// 			                            '<input type="text" class="form-control add-disc-tag">' +
// 			                            '<span class="input-group-btn">' +
// 			                                '<button class="btn btn-default add-custom-tag" type="button"><span><i class="fa fa-angle-double-down"></i></span></button>' +
// 			                            '</span>' +
// 			                        '</div>' +
// 			                    '</div>' +
// 			                '</div>' +
// 			                '<div class="col-sm-10 col-sm-offset-2">' +
// 			                    '<div class="tag-list-container">' +
// 			                    '</div>' +
// 			                '</div>' +
// 			            '</div>' +
// 			            '<div class="form-group">' +
// 			                '<label class="col-sm-2 control-label">Notes</label>' +
// 			                '<div class="col-sm-10">' +
// 			                    '<textarea id="disc-notes" class="form-control create-disc-textarea" rows="3" param="notes"></textarea>' +
// 			                '</div>' +
// 			            '</div>' +
// 			            '<div class="form-group">' +
// 			                '<label class="col-sm-2 control-label">Public</label>' +
// 			                '<div class="col-sm-4">' +
// 			                    '<input type="checkbox" name="visible" param="visible" id="disc-visibility">' +
// 			                '</div>' +
// 			                '<label class="col-sm-3 control-label allow-icon">Condition<i class="fa-hover-black fa fa-question-circle fa-pad-left fa-dim" data-toggle="tooltip" tt="condition"></i></label>' +
// 			                '<div class="col-sm-3">' +
// 			                    '<input type="text" id="disc-condition" class="form-control text-assist condition-number-validate" param="condition">' +
// 			                '</div>' +
// 			            '</div>' +
// 	                '</div>' +
// 	            '</div>' +
// 	            '<div class="image-accordion-area">' +
// 	            	(isEdit ? 
// 		            '<div class="accordion-container">' +
// 		                '<div class="accordion-header">' +
// 		                    '<label class="current-images-label no-select" param="current-images" aria-expanded="true" aria-controls="collapseCurrentImages"><span><i class="fa fa-chevron-right fa-tools"></i></span>Current Pictures</label>' +
// 		            	'</div>' +
// 		            	'<div class="current-images-panel-collapse collapse" id="collapseCurrentImages">' +
// 				            '<div class="image-list">' +
// 				                '<div class="image-list-container image-list-container-simple">' +
// 				                    '<div class="image-list-table" id="existing-image-list">' +
// 				                    '</div>' +
// 				                '</div>' +
// 				            '</div>' +
// 				        '</div>' +
// 			        '</div>' : '') +
// 		            '<div class="accordion-container">' +
// 		                '<div class="accordion-header">' +
// 		                    '<label class="add-images-label no-select" param="dropzone" aria-controls="collapseDropzone"><span><i class="fa fa-chevron-right fa-tools"></i></span>Add Pictures</label>' +
// 		                '</div>' +
// 		                '<div class="dropzone-panel-collapse collapse" id="collapseDropzone">' +
// 		                    '<div class="image-list dropzone-area">' +
// 		                        '<div class="image-list-container" id="dropzone-container">' +
// 		                            '<div class="image-list-table" id="dropzone-previews">' +
// 		                                '<div class="image-item-container image-add" id="dropzone-trigger">' +
// 		                                    '<div class="image-item">' +
// 		                                        '<div class="image-entity">' +
// 		                                            '<span class="image-default"><i class="fa fa-camera-retro fa-5x"></i></span>' +
// 		                                        '</div>' +
// 		                                    '</div>' +
// 		                                '</div>' +
// 		                            '</div>' +
// 		                        '</div>' +
// 		                    '</div>' +
// 		                '</div>' +
// 		            '</div>' +
// 	            '</div>' +
// 			'</form>';
	
// 	var modalParams = (isEdit ? getEditParams() : getCreateParams());
	
// 	generateModal({
// 		header: header,
// 		body: form,
// 		footer: footer,
// 		fns: modalParams.fns,
// 		onCreate: function($inner) {
// 		    createDropZone($inner.find('.dropzone-area'));
		    
// 			$inner.find('.accordion-container label').click(function(e) {
// 				var param = $(this).attr('param');
// 		        var $chevron = $(this).find('.fa');
// 		        if ($chevron.hasClass('fa-chevron-right')) {
// 		            $chevron.removeClass('fa-chevron-right').addClass('fa-chevron-down');
// 		        } else {
// 		            $chevron.removeClass('fa-chevron-down').addClass('fa-chevron-right');
// 		        }
// 		        if (param == 'dropzone') {
// 		        	$('#collapseDropzone').collapse('toggle');
// 		        } else if (param == 'current-images') {
// 		        	$('#collapseCurrentImages').collapse('toggle');
// 		        } else if (param == 'advanced') {
// 		        	$('#collapseAdvanced').collapse('toggle');
// 		        }
// 		    });
			
// 			modalParams.onCreate($inner);
// 		},
// 		onShow: function($inner) {
// 			var $tagInput = $inner.find('.add-disc-tag');
// 			var $addCustomTag = $inner.find('.add-custom-tag');
// 			var $tagContainer = $inner.find('.tag-list-container');
// 			var tagTextAssist;
			
// 		    $addCustomTag.click(function(){
// 		    	if ($tagInput.val().length > 0) {
// 					$tagContainer.append(generateTagItem($tagInput.val()));
// 		    		$tagInput.val('');
// 		    	}
// 		    });
			
// 			$('input[type=text]').focus(function(){
// 			    $(this).one('mouseup', function(event){
// 			        event.preventDefault;
// 			    }).select();
// 			});
			
// 			$inner.on('click', '.tag-item-remove', function(){
// 				var $parent = $(this).parents('.tag-item');
// 				$parent.remove();
				
// 				if ($tagContainer.is(':empty')){
// 					$tagContainer.empty();
// 				}
// 			});
			
// 			$inner.find('.number-validate').on('focusin', function(e){
// 				$(this).parent().removeClass('has-error');
// 		    });
			
// 			$inner.find('.number-validate').on('focusout', function(e){
// 				var val = $(this).val();
// 				if (val != '' && !(/^-?\d+(\.\d+)?$/.test(val))) {
// 					$(this).parent().addClass('has-error');
// 				} else {
// 					$(this).parent().removeClass('has-error');
// 				}
// 		    });
		    
// 		    $inner.find('.weight-number-validate').on('focusout', function(e){
// 				var val = $(this).val();
// 				if (val != '' && !(/^\d+(\.\d+)?$/.test(val))) {
// 					$(this).parent().addClass('has-error');
// 				} else {
// 					$(this).parent().removeClass('has-error');
// 				}
// 		    });
		    
// 		    $inner.find('.condition-number-validate').on('focusout', function(e){
// 				var val = $(this).val();
// 				if (val != '' && !(/^\d\d?(\.\d)?$/.test(val))) {
// 					$(this).parent().addClass('has-error');
// 				} else {
// 					$(this).parent().removeClass('has-error');
// 				}
// 		    });
		    
// 		    $inner.find('[tt="condition"]').tooltip({
// 		    	delay: { "show": 200, "hide": 100 },
// 		    	placement: 'top',
// 		    	trigger: 'hover',
// 		    	title: 'Condition based on Sleepy Scale. Must be an integer with 1 optional decimal place.',
// 		    	template: '<div class="tooltip" role="tooltip" style="width: 150px;">' +
// 		    				'<div class="tooltip-arrow"></div>' +
// 		    				'<div class="tooltip-inner"></div>' +
// 		    				'</div>'
// 		    });
			
// 			/*
// 			* Setup Autocomplete Handlers
// 			*/
			
// 			$inner.find('.text-assist').each(function(index) {
// 				new ZumpTextAssist({
// 			        inputElement: $(this),
// 			        searchProp: $(this).attr('param'),
// 			        items: function() { return discs; }, 
// 			        onSelection: function(item) {
// 			        }
// 			    });
// 			});
			
// 			tagTextAssist = new ZumpTextAssist({
// 				inputElement: $tagInput,
// 				searchProp: 'tagList',
// 				items: function() { return discs; }, 
// 		        onSelection: function(item, reset) {
// 		       		if (item.length > 0) {
// 		        		$tagContainer.append(generateTagItem(item));
// 		    			reset();
// 		        	}
// 		        }
// 			});
			
// 			modalParams.onShow($inner);
// 		},
// 		onClose: function($inner) {
			
// 			var $dropzone = $inner.find('.dropzone-area');
// 			var id = $dropzone.attr('dropzoneid');
// 			var dropzone = dropzones.splice(id, 1)[0];
			
// 			modalParams.onClose($inner);
// 		}
// 	});
// }

/*
* Generates the object needed to issue a edit disc modal
*/
// function getEditParams() {
// 	return {
// 		fns: [
// 				{
// 					name: 'close',
// 					function: function($btn, $inner, done) {
// 						if (fnLock) return;
// 						done();
// 					}
// 				},
// 				{
// 					name: 'save',
// 					function: function($btn, $inner, done) {
// 						if (fnLock) return;
						
// 						fnLock = true;
// 						$inner.find('div.alert').remove();
// 						var disc = createDisc($inner, changeObject.curDisc);
// 						var errorCount = $inner.find('.has-error').length;
// 						if (!disc.brand || !disc.name || disc.brand == '' || disc.name == '') {
// 							$inner.prepend(generateError('Brand and Name are required.', 'ERROR'));
// 							fnLock = false;
// 					    } else if (errorCount > 0) {
// 					    	var errorText = '';
// 					    	var errorLength = errorCount;
					    	
// 					    	_.each($inner.find('.has-error'), function(element) {
// 					    		if (errorLength > 1) {
// 					    			errorText = errorText + $(element).prev().text() + ', ';
// 					    		} else {
// 					    			errorText = errorText + $(element).prev().text();
// 					    		}
// 					    		errorLength = errorLength - 1;
// 					    	});
					    	
// 					    	$inner.prepend(generateError('Invalid data in ' + (errorCount > 1 ? errorText + ' fields.' : errorText + ' field.'), 'ERROR'));
// 							fnLock = false;
					    	
// 					    } else if ($inner.find('div.alert').length == 0) {
// 							putDisc(disc, function(success, retData) {
// 								if (success) {
									
// 									var index = discs.indexOf(getDisc(retData._id));
// 									discs[index] = retData;
									
// 									if (isDef(changeObject.imageRemovals)) {
// 										_.each(changeObject.imageRemovals, function(imageId) {
// 											deleteImage(imageId, function(success, data) {
// 												if (success) {
// 													//deleted disc image
// 												}
// 											});
// 										});
// 									}
									
// 									var $dropzone = $inner.find('.dropzone-area');
// 									var id = $dropzone.attr('dropzoneid');
// 									var dropzone = dropzones[id];
// 									if (dropzone && dropzone.getAcceptedFiles().length > 0) {
// 										dropzone.options.url = '/api/discs/' + retData._id + '/images';
// 										dropzone.on('queuecomplete', function() {
// 											getDiscById(retData._id, function(err, disc) {
// 												discs = _.filter(discs, function(curDisc){
// 													return curDisc._id != disc._id;
// 												});
// 												discs.push(disc);
// 												updateFilter(true);
// 											});
											
// 											done();
// 										})
										
// 										dropzone.processQueue();
// 									} else {
// 										done();
// 										updateFilter(true);
// 									}
// 								} else {
// 									$inner.prepend(generateError(retData.message, 'ERROR'));
// 									fnLock = false;
// 								}
// 							});
// 					    }
// 					}
// 				}
// 		],
// 		onCreate : function($inner) {
// 			changeObject = {};
			
// 			var discId = $inner.find('form').attr('discId');
// 			changeObject.curDisc = copyDisc(discId);
			
// 			var disc = changeObject.curDisc;
// 			var tagList = disc['tagList'];
// 			var $tagContainer = $inner.find('.tag-list-container');
// 			var $imageContainer = $inner.find('#existing-image-list');
	
// 			$('#disc-brand').val(getSafe(disc.brand, ''));
// 			$('#disc-name').val(getSafe(disc.name, ''));
// 			$('#disc-material').val(getSafe(disc.material, ''));
// 			$('#disc-type').val(getSafe(disc.type, ''));
// 			$('#disc-weight').val(getSafe(disc.weight, ''));
// 			$('#disc-color').val(getSafe(disc.color, ''));
// 			$('#disc-speed').val(getSafe(disc.speed, ''));
// 			$('#disc-glide').val(getSafe(disc.glide, ''));
// 			$('#disc-turn').val(getSafe(disc.turn, ''));
// 			$('#disc-fade').val(getSafe(disc.fade, ''));
// 			$('#disc-notes').val(getSafe(disc.notes, ''));
// 			$('#disc-condition').val(getSafe(disc.condition, ''));
			
// 			$('#disc-visibility').bootstrapSwitch('state', getSafe(disc.visible, true));
			
// 			$inner.find('.current-images-label').click(function(e) {
// 		        var $chevron = $(this).find('.fa');
// 		        if ($chevron.hasClass('fa-chevron-right')) {
// 		        	if ($('#collapseCurrentImages').find('.image-item-container').length > 0) {
// 			            $chevron.removeClass('fa-chevron-right').addClass('fa-chevron-down');
// 			        	$('#collapseCurrentImages').collapse('show');
// 		        	}
// 		        } else {
// 		            $chevron.removeClass('fa-chevron-down').addClass('fa-chevron-right');
// 		        	$('#collapseCurrentImages').collapse('hide');
// 		        }
// 		    });
		    
// 		    $imageContainer.on('click', '.image-remove', function() {
// 				var $imageContainer = $inner.find('#existing-image-list');
// 		    	var $parent = $(this).parents('.image-item-container');
// 		    	var imageId = $parent.attr('imageid');
// 		    	var disc = changeObject.curDisc;
		    	
// 		    	$parent.remove();
		    	
// 		    	if (!isDef(changeObject.imageRemovals)) {
// 		    		changeObject.imageRemovals = [];
// 		    	}
		    	
// 		    	if (disc.primaryImage == imageId) {
// 		    		var $images = $imageContainer.find('.image-item-container');
// 		    		if ($images.length) {
// 		    			var $newPrimary = $images.first();
// 		    			disc.primaryImage = $newPrimary.attr('imageid');
// 		    			updateExistingImage(disc.primaryImage);
// 		    		} else {
// 		    			disc.primaryImage = '';
// 		    		}
// 		    	}
		    	
// 		    	changeObject.imageRemovals.push(imageId);
// 		    });
		    
// 		    $imageContainer.on('click', '.image-make-primary', function() {
// 		    	var $parent = $(this).parents('.image-item-container');
// 		    	var imageId = $parent.attr('imageid');
// 		    	var disc = changeObject.curDisc;
		    	
// 		    	disc.primaryImage = imageId;
// 		    	updateExistingImage(imageId);
// 		    });
			
// 		    _.each(tagList, function(tag) {
// 		    	$tagContainer.append(generateTagItem(tag));
// 		    });
			
// 			getAllDiscImages(discId, function(success, images) { 
// 				if (success) {
// 					var primaryImage = disc.primaryImage;
// 					_.each(images, function(image) {
// 						$imageContainer.append(generateImageItem(primaryImage, image));
// 					});
// 				}	
// 			});
// 		},
// 		onShow : function() {
			
// 		},
// 		onClose: function($inner) {
// 			fnLock = false;
// 		}
// 	};
// }

/*
* Locates an image source and updates with correct file path
*/
function updateExistingImage(imageId) {
	var $curPrimary = $('.primary-image-banner-static');
	
	if ($curPrimary.length) {
		var $parent = $curPrimary.parents('.image-overlay-static');
		
		$parent.siblings('.image-overlay').find('.image-remove').after(
			'<div class="image-make-primary" title="Make Primary">' +
			'<i class="fa fa-star-o fa-lg"></i>' +
			'</div>'
			);
		
		$parent.remove();
	}
	
	var $image = $('.image-item-container[imageid="' + imageId + '"]');
	if ($image.length) {
		var $overlay = $image.find('.image-overlay');
			
		$overlay.find('.image-make-primary').remove();
		$overlay.after('<div class="image-overlay-static">' +
							'<div class="primary-image-banner-static">' +
								'<i class="fa fa-star fa-lg"></i>' +
							'</div>' +
						'</div>');
	}
}

/*
* Generates the object needed to issue a create disc modal
*/
// function getCreateParams() {
// 	return {
// 		fns: [
// 				{
// 					name: 'close',
// 					function: function($btn, $inner, done) {
// 						done();
// 					}
// 				},
// 				{
// 					name: 'save',
					// function: function($btn, $inner, done) {
					// 	$inner.find('div.alert').remove();
					// 	var disc = createDisc($inner);
					// 	var errorCount = $inner.find('.has-error').length;
					// 	if (!disc.brand || !disc.name || disc.brand == '' || disc.name == '') {
					// 		$inner.prepend(generateError('Brand and Name are required.', 'ERROR'));
					//     } else if (errorCount > 0) {
					//     	var errorText = '';
					//     	var errorLength = errorCount;
					    	
					//     	_.each($inner.find('.has-error'), function(element) {
					//     		if (errorLength > 1) {
					//     			errorText = errorText + $(element).prev().text() + ', ';
					//     		} else {
					//     			errorText = errorText + $(element).prev().text();
					//     		}
					//     		errorLength = errorLength - 1;
					//     	});
					    	
					//     	$inner.prepend(generateError('Invalid data in ' + (errorCount > 1 ? errorText + ' fields.' : errorText + ' field.'), 'ERROR'));
					    	
					//     } else if ($inner.find('div.alert').length == 0) {
					//     	postDisc(disc, function(success, retData) {
					// 			if (success) {
					// 				discs.push(retData);
					// 				var $dropzone = $inner.find('.dropzone-area');
					// 				var id = $dropzone.attr('dropzoneid');
					// 				var dropzone = dropzones[0];
					// 				if (dropzone && dropzone.getAcceptedFiles().length > 0) {
					// 					dropzone.options.url = '/api/discs/' + retData._id + '/images';
					// 					dropzone.on('queuecomplete', function() {
					// 						$inner.prepend(generateSuccess(retData.brand + ' ' + retData.name + ' was successfully added.', 'Success'));
					// 						autoCloseAlert($inner.find('.alert'), 2000);
					// 						getDiscById(retData._id, function(err, disc) {
					// 							discs = _.filter(discs, function(curDisc){
					// 								return curDisc._id != disc._id;
					// 							});
					// 							discs.push(disc);
					// 							updateFilter(true);
					// 						});
					// 						$inner.find('form').trigger("reset");
											
					// 						$('#dropzone-trigger').siblings().remove();
					// 						dropzone.disable();
					// 						dropzone.enable();
					// 					})
										
					// 					dropzone.processQueue();
					// 				} else {
					// 					$inner.prepend(generateSuccess(retData.brand + ' ' + retData.name + ' was successfully added.', 'Success'));
					// 					autoCloseAlert($inner.find('.alert'), 2000);
					// 					updateFilter(true);
					// 					$('#createDiscForm').trigger("reset");
					// 				}
					// 			} else {
					// 				$inner.prepend(generateError(retData.message, 'ERROR'));
					// 			}
					// 		});
					//     }	
					// }
// 				}
// 		],
// 		onCreate : function($inner) {
// 			$('#disc-visibility').bootstrapSwitch('state', true);
// 		},
// 		onShow : function($inner) {
			
// 		},
// 		onClose: function($inner) {
// 		}
// 	}
// }

/*
* Creates a disc based on a HTML form
*/
function createDisc($form, disc) {
	if (!isDef(disc)) {
		disc = {};
	}
	
	var $fields = $form.find('input');
	
	$.each($fields, function(index) {
		var $field = $(this);
		if (hasAttr($field, 'param')) {
			if ($field.is(':checkbox')) {
				disc[$field.attr('param')] = $field.prop('checked');
			} else {
				disc[$field.attr('param')] = $field.val();
			}
		}
	});
	
	$fields = $form.find('select');
	$.each($fields, function(index) {
		var $field = $(this);
		disc[$field.attr('param')] = $field.val();	
	});
	
	$fields = $form.find('textarea');
	$.each($fields, function(index) {
		var $field = $(this);
		disc[$field.attr('param')] = $field.val();	
	});
	
	var tags = [];
	$fields = $form.find('.tag-item');
	$.each($fields, function(index) {
		var $field = $(this);
		tags.push($field.text().trim());
	});
	disc['tagList'] = _.unique(tags);
	
	return disc;
}

/*
* Generates the HTML for a search result item
*/
function generateResultItem(item) {
	return '<li>' + item + '<i class="fa fa-reply fa-search-results"></i></li>';
}

/*
* Generates the HTML for a tag result
*/
function generateTagResult(item) {
	return '<li class="tag-list-item" tabindex="0">' +
        '<span><i class="fa fa-tag"></i></span>' +
        item +
    '</li>';
}

/*
* Generates the HTML for a tag
*/
function generateTagItem(item) {
	return '<div class="tag-item" tagVal="' + item +  '">' +
		'<p class="tag-item-text">' + item + ' <span class="tag-item-remove"><i class="fa fa-times"></i></span></p>' +
		'</div>';
}

/*
* Generates an image item for a disc
*/
function generateImageItem(primaryImage, image) {
	return '<div class="image-item-container" imageid="' + image._id + '">' +
				'<div class="image-item">' +
					'<div class="image-entity">' +
						'<img src="/files/' + image.thumbnailId +'" class="fit-parent">' +
					'</div>' +
					(primaryImage == image._id ? 
					'<div class="image-overlay">' +
						'<span class="image-remove"><i class="fa fa-times fa-lg"></i></span>' +
                    '</div>' +
                    '<div class="image-overlay-static">' +
						'<div class="primary-image-banner-static"><i class="fa fa-star fa-lg"></i></div>' +
                    '</div>' :
					'<div class="image-overlay">' +
						'<span class="image-remove"><i class="fa fa-times fa-lg"></i></span>' +
						'<div class="image-make-primary" title="Make Primary"><i class="fa fa-star-o fa-lg"></i></div>' +
					'</div>') +
				'</div>' +
			'</div>'; 
}

/*
* Creates a dropzone area for image upload
*/
function createDropZone($div) {
	var template = '<div class="image-item-container">' +
                        '<div class="image-item">' +
                            '<div class="image-entity">' +
                                '<img data-dz-thumbnail />' +
                            '</div>' +
                            '<div class="image-progress" data-dz-uploadprogress></div>' +
                            '<div class="image-overlay">' +
                                '<span class="image-remove" data-dz-remove><i class="fa fa-times fa-lg"></i></span>' +
                                '<div class="image-title"><span data-dz-name></span></div>' +
                                '<div class="image-size" data-dz-size></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
    
    var $imageAdd = $div.find('.image-add');
    var $container = $div.find('.image-list-container');
    var $table = $div.find('.image-list-table');
	var myDropzone = new Dropzone('#' + $container.attr('id'), {
		url: "/api/discs",
		method: "POST",
		thumbnailWidth: 100,
		thumbnailHeight: 100,
		parallelUploads: 10,
		maxFiles: 10,
		paramName: 'discImage',
		previewTemplate: template,
		acceptedFiles: "image/*",
		autoProcessQueue: false,
		previewsContainer: '#' + $table.attr('id'),
		clickable: '#' + $imageAdd.attr('id'),
		accept: function(file, done) {
			done();
		},
		init: function() {
			this.on("addedfile", function() {
				if (this.files[10] != null){
					this.removeFile(this.files[10]);
				} else {
					$imageAdd.insertAfter('#dropzone-previews > .image-item-container:last-child');
					$container.animate({scrollLeft: $table.innerWidth()}, 2000);
				}
			}).on('success', function(file, response){
				
			});
		}
	});
	
	dropzones.push(myDropzone);
	$div.attr('dropzoneId', dropzones.length - 1);
}


/* Global Methods */

/*
* Returns the current search params
*/
function getSearchParameters() {
	var prmstr = window.location.search.substr(1);
	return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
}

/*
* Transforms a string to an object
*/
function transformToAssocArray( prmstr ) {
    var params = {};
    var prmarr = prmstr.split("#");
    for ( var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split("=");
        params[tmparr[0]] = tmparr[1];
    }
    return params;
}

/*
* Excutes a function after a specified period of time
*/
var delay = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();

/*
* Returns a list of properties for the given disc list
*/
function getProperties(prop) {
	var list = [];
	if (discs.length && _.isArray(discs[0][prop])) {
		var arrList = _.pluck(discs, prop);
		_.each(arrList, function(arr) { 
			list = list.concat(arr);	
		});
	} else {
		list = _.pluck(discs,  prop);
	}
	
	return _.uniq(list);
}

/*
* Checks to see if an object contains a property
*/
function containSearch(val, properties, callback) {
	_.each(properties, function(prop) {
		callback(prop, checkContains(val, prop));
	});
}

/*
* Checks to see if a property contains the value
*/
function checkContains(val, prop){
	if (!val || !prop) return [];
	var filtered = _.filter(getProperties(prop), function(item) {
		return item.toLowerCase().indexOf(val.toLowerCase()) >= 0;	
	});
	return filtered;
}

/*
* Generates a information message
*/
function generateInfo(message, title) {
	
	return generateMessage('info', message, title);
}

/*
* Generates an error message
*/
function generateError(message, title) {
	
	return generateMessage('danger', message, title);
}

/*
* Generates a success message
*/
function generateSuccess(message, title) {
	
	return generateMessage('success', message, title);
}

/*
* Generates a standard message based on arguments
*/
function generateMessage(type, message, title) {
	
	return '<div class="alert alert-' + type + ' alert-dismissible fade in" role="alert">' +
        		'<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
        		'<h4><strong>' + (title ? title + '!' : '') + '</strong></h4>' +
        		'<p>' + message + '</p>' +
    		'</div>';
}

/*
* Automatically closes an alert based on delay time
*/
function autoCloseAlert($element, delay) {
	setTimeout(function() {
		$element.children('.close').trigger('click');
	}, delay);
}

/*
* Returns a disc based on the id
*/
function getDisc(id) {
	return _.first(_.where(discs, {'_id' : id}));
}

/*
* Creates a copy of a disc item
*/
function copyDisc(id) {
	var disc = getDisc(id);
	var newDisc = undefined;
	
	if (disc) {
		newDisc = {};
		
		for (var param in disc) {
			newDisc[param] = disc[param];
		}
	}
	
	return newDisc;
}

/*===================================================================*/
/*                                                                   */
/*                          Statistics                               */
/*                                                                   */
/*===================================================================*/

function generatePlot(prop, type) {
	var text = myFilter.getText(prop);
	
	if (typeof text !== 'undefined') {
		showPlot(prop, text, type);
	}
}

function renderPlot() {
		var chart = $("#statistics-plot").CanvasJSChart();
		if (typeof chart !== 'undefined') {
			showPlot();
		}
}

function showPlot(prop, propName, type) {
	
	if (isDef(prop)) {
    	chartData.chartProp = prop;
	}
	
	if (isDef(propName)) {
    	chartData.chartPropName = propName;
	}
	
	if (isDef(type)) {
    	chartData.chartType = type;
	}
   
	var discList = _.groupBy(myFilter.filter(discs, false), chartData.chartProp);
    var data = [];
    var isSingleUnit = true;
    
    for(var group in discList) {
    	if (group == 'undefined') continue;
    	if (isSingleUnit && discList[group].length > 1) isSingleUnit = false;
        data.push({
           label: group,
           y: discList[group].length,
           legendText: group
        });
    }
    
    var chartData = getChartData(chartData.chartType, 
    	chartData.chartPropName, data.length == 1, isSingleUnit);
    chartData.data[0].dataPoints = data;
    
   $("#statistics-plot").CanvasJSChart(chartData);
   
}

function getChartData(type, propName, isSingleCol, isSingleUnit) {
	var properties = { 
		exportFileName: "DiscZump - Discs by " + propName,
		exportEnabled: true,
		title: { 
			text: "Discs by " + propName,
			fontSize: 24,
		},
		axisY: { 
			title: "Number of Discs",
			titleFontSize: 20,
			interval: isSingleUnit ? 1 : null
		},
		axisX: {
			titleFontSize: 20,
			interval: isSingleCol ? null : 1,
			labelMaxWidth: 200
		},
		legend :{ 
			verticalAlign: "center", 
			horizontalAlign: "right" 
		}, 
		data: [ 
			{ 
				type: type,
				showInLegend: false, 
				toolTipContent: propName + ": {label} <br/> {y} discs"
			} 
		] 
	};
	
	if (type == 'column') {
		properties.axisX.labelAngle = 50;
		properties.axisX.labelAutoFit = true;
	}
	
	return properties;
}

/*===================================================================*/
/*                                                                   */
/*                     Library Objects                               */
/*                                                                   */
/*===================================================================*/

/*
* Name: ZumpMessenger
* Date: 08/19/2015
*/
var ZumpMessenger = function(opt) {
	
	//----------------------\
    // Javascript Objects
    //----------------------/
    
	var zumpMessenger = this;
	var threadCache = {};
	var userPhotoCache = {};
	var newMessageCount = 0;
	var activeThread;
	var activateThread;
	var pullCount = 20;
	var sendOnEnter = true;
	var enterLock = true;
	
    //----------------------\
    // JQuery Objects
    //----------------------/
    
    var $inboxList;
    var $messageContainer;
    var $loadMessages;
    var $addMessageContainer;
    var $messageCount;
    var $threadTitle;
    var $sendMessageBtn;
    var $newMessage;
    var $sendOnEnter;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialize with options
    */
	this.init = function(opt) {
		
		if (isDef(opt.messageCount)) {
			$messageCount = $(opt.messageCount);
		}
		
		if (isDef(opt.threadTitle)) {
			$threadTitle = $(opt.threadTitle);
		}
		
		if (isDef(opt.activateThread)) {
			activateThread = opt.activateThread;
		}
		
		if (isDef(opt.addMessageContainer)) {
			$addMessageContainer = $(opt.addMessageContainer);
		}
		
		if (isDef(opt.messageContainer)) {
			$messageContainer = $(opt.messageContainer);
		}
		
		if (isDef(opt.loadMessages)) {
			$loadMessages = $(opt.loadMessages);
		}
		
		if (isDef(opt.sendMessageBtn)) {
			$sendMessageBtn = $(opt.sendMessageBtn);
		}
		
		if (isDef(opt.newMessage)) {
			$newMessage = $(opt.newMessage);
		}
		
		if (isDef(opt.sendOnEnter)) {
			$sendOnEnter = $(opt.sendOnEnter);
		}
		
		if (isDef(opt.inboxList)) {
			$inboxList = $(opt.inboxList);
		}
		
		initializeInboxList();
		setupListeners();
	}
	
	this.threadLeft = function() {
		$('.thread-container').removeClass('thread-open');
		activeThread = undefined;
	}
	
	this.initPage = function() {
		resizeMessageArea();
	}
	
	this.handleMessage = function(message) {
		if (pageSettings.activePage == '#pg-inbox' && activeThread.threadId == message.threadId) {
			var thread = getThread(message.threadId).thread;
			thread.messageCount += 1;
			thread.currentMessageCount += 1;
			thread.modifiedDate = message.createDate;
			
			putThreadState(thread.threadId, {messageCount: thread.messageCount});
			$inboxList.prepend($('li.thread-container[threadId="' + message.threadId + '"]'));
			appendMessage(message);
	    	$messageContainer.animate({ scrollTop: $messageContainer[0].scrollHeight}, 100);
	    	updateThread(thread);
	    	
		} else {
			var thread = getThread(message.threadId).thread;
			thread.currentMessageCount += 1;
			thread.modifiedDate = message.createDate;
			$('li.thread-container[threadId="' + thread.threadId + '"]').remove();
			prependThread(thread);
		}
	}
	
	//----------------------\
    // Private Functions
    //----------------------/
    
    var resizeMessageArea = function() {
    	var height = $(window).height() - $messageContainer.offset().top - $addMessageContainer.outerHeight() - 20;
    	$messageContainer.css({
    		height: height + 'px',
    		maxHeight: height + 'px'
    	});
    	
    	$messageContainer.scrollTop($messageContainer[0].scrollHeight);
    }
    
    var setupListeners = function() {
    	
		$(document).on('click', '.thread-container', function() {
			showThread($(this).attr('threadid'));
		});
		
		$sendMessageBtn.click(function(e) {
			sendMessage();
		});
		
		$sendOnEnter.click(function(e) {
			if (sendOnEnter) {
				$sendOnEnter.find('i').removeClass('fa-check-square').addClass('fa-square-o');
				$newMessage.off('keydown');
			} else {
				$sendOnEnter.find('i').removeClass('fa-square-o').addClass('fa-check-square');
				$newMessage.on('keydown', onKeyDown);
			}
			
			sendOnEnter = !sendOnEnter;
		});
		
		$loadMessages.click(function(e) {
			loadMore();
		});
		
		$newMessage.on('keydown', onKeyDown);
    }
    
    /*
    * Sets up the inbox list
    */
    var initializeInboxList = function() {
    	getThreads(function(success, threadList) {
    		if (success) {
    			newMessageCount = 0;
    			_.each(threadList, function(thread) {
    				threadCache[thread.threadId] = {thread: thread, messages: [], lastId: undefined};
    				appendThread(thread);
    			});
    		}
    	});
    }
    
    var getThread = function(id) {
    	var thread = threadCache[id];
    	if (typeof(thread) === 'undefined') {
    		return undefined;
    	} else {
    		return thread;
    	}
    }
    
    var getParams = function(threadCacheObj) {
    	var params = {count: pullCount};
    	
    	if (typeof(threadCacheObj.lastId) !== 'undefined') {
    		params.refId = threadCacheObj.lastId;
    	}
    	
    	return params;
    }
    
    var updateThread = function(thread) {
    	var $thread = $('li.thread-container[threadId="' + thread.threadId + '"]');
    	var isActive = $thread.hasClass('active');
    	if ($thread.length) {
    		$thread.empty();
    		populateThreadContainer($thread, thread);
    		if (isActive) $thread.addClass('active');
    	}
    	updateMessageCount();
    }
    
    var prependThread = function(thread) {
        $inboxList.prepend(createThread(thread));
    }
    
    var appendThread = function(thread) {
        $inboxList.append(createThread(thread));
    }
    
    var createThread = function(thread) {
    	var $threadContainer = $('<li class="thread-container hover-active" threadId="' + thread.threadId + '">');
    	populateThreadContainer($threadContainer, thread);
    	updateMessageCount();
    	return $threadContainer;
    }
    
    var populateThreadContainer = function($threadContainer, thread) {
    	var isNew = thread.currentMessageCount > thread.messageCount;
    	
    	var hasPhoto = typeof(thread.threadPhoto) !== 'undefined';
    	var date = new Date(thread.modifiedDate);
    	
    	$threadContainer.append('<div class="thread-image"' + (hasPhoto ? ' style="background-image:url(' + "'" + thread.threadPhoto + "'" + ');"' : '') + '>' +
    							(!hasPhoto ? '<span><i class="fa fa-user"></i></span>' : '') +
                            '</div>' +
                            '<div class="thread-icon">' +
                                '<span><i class="fa fa-square-o"></i></span>' +
                            '</div>' +
                            '<div class="thread-details-container">' +
                                '<div class="thread-details">' +
                                    '<div class="thread-details-inner">' +
                                        '<div class="thread-tag-label">' + thread.threadTag + '</div>' +
                                        '<div class="thread-date">' + date.toLocaleString() + '</div>' +
                                   '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="clearfix"></div>');
    	setThreadState($threadContainer, isNew);
    }
    
    var updateMessageCount = function() {
    	var messageCount = 0;
    	
    	_.each(_.values(threadCache), function(threadCacheObj) {
    		messageCount += (threadCacheObj.thread.currentMessageCount - threadCacheObj.thread.messageCount);
    	});
    	
    	if (messageCount > 0) {
			$messageCount.text(messageCount);
    	} else {
    		$messageCount.text('');
    	}
		
    }
    
    var showThread = function(threadId) {
    	if (typeof(activeThread) !== 'undefined' && activeThread.threadId == threadId) return false;
    	
    	var threadCacheObj = getThread(threadId);
		if (!threadCacheObj) return;
		
		var thread = threadCacheObj.thread;
		
		activeThread = thread;
		var $threadContainer = $('.thread-container[threadId="' + threadId + '"]');
		
		$threadContainer.addClass('thread-open').siblings().removeClass('thread-open');
		$threadTitle.text(thread.threadTag);
		
		threadCacheObj.thread.messageCount = threadCacheObj.thread.currentMessageCount;
		
		activateThread();
		setThreadState($threadContainer, false);
		setThread(threadCacheObj);
    }
    
    var setThreadState = function($threadContainer, isNew) {
    	if (!isNew) {
    		$threadContainer.removeClass('thread-new');
    		$threadContainer.find('.thread-icon i').removeClass('fa-square').addClass('fa-square-o');
    	} else {
    		$threadContainer.addClass('thread-new');
    		$threadContainer.find('.thread-icon i').removeClass('fa-square-o').addClass('fa-square');
    	}
    }
    
    var setThread = function(threadCacheObj) {
    	$messageContainer.find('.thread-message').remove();
    	showMessages(threadCacheObj, function() {
    		$messageContainer.scrollTop($messageContainer[0].scrollHeight);
    	});
    }
    
    var loadMore = function() {
    	if (typeof(activeThread) === 'undefined') return;
    	
    	var threadCacheObj = getThread(activeThread.threadId);
    	pullMessages(threadCacheObj, function() {
    		var $sepMsg = $('.thread-message[messageId="' + threadCacheObj.sepId + '"]');
    		$messageContainer.scrollTop($sepMsg.position().top);
    	});
    }
    
    var showMessages = function(threadCacheObj, callback) {
    	if (threadCacheObj.messages.length == 0) {
    		pullMessages(threadCacheObj, callback);
    	} else {
			_.each(threadCacheObj.messages, function(message) {
				prependMessage(message);
			});
			
			callback();
    	}
    }
    
    var pullMessages = function(threadCacheObj, callback) {
    	getMessages(threadCacheObj.thread.threadId, getParams(threadCacheObj), function(success, messages) {
    		if (success) {
    			threadCacheObj.messages = threadCacheObj.messages.concat(messages);
    			threadCacheObj.lastId = messages[messages.length - 1]._id;
    			threadCacheObj.sepId = messages[0]._id;
    			
    			if (threadCacheObj.messages.length == threadCacheObj.thread.currentMessageCount) {
	    			$loadMessages.hide();
	    		} else {
	    			$loadMessages.show();
	    		}
    			
				updateMessageCount();
    			
    			_.each(messages, function(message) {
    				prependMessage(message);
    			});
    			
    			callback();
    		}
    	});
    }
    
    var prependMessage = function(message) {
    	$loadMessages.after(createMessage(message));
    }
    
    var appendMessage = function(message) {
    	$messageContainer.append(createMessage(message));
    }
    
    var createMessage = function(message) {
    	var incoming = message.userId != userAccount._id;
    	var date = new Date(message.createDate);
    	var $message = $('<div class="thread-message message-' + (incoming ? 'incoming' : 'outgoing') + '" messageId="' + message._id +  '"></div>');
    	$message.append('<div class="thread-message-area">' +
                                '<div class="message-user"></div>' +
                                '<div class="message-content">' +
                                    '<div class="message-date">' + date.toLocaleString() + '</div>' +
                                    '<div class="message-bubble">' +
                                        message.body.replace(/\n/g, '<br>') + 
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="clearfix"></div>');
        
        var userPhoto = userPhotoCache[message.userId];
        if (typeof(userPhoto) !== 'undefined') {
        	if (userPhoto != '') $message.find('.message-user').css('background-image', 'url("' + userPhoto + '")');
        } else {
        	userPhotoCache[message.userId] = '';
        	getUser(message.userId, function(success, user) {
        		if (success) {
        			userPhotoCache[user._id] = user.image;
        			
        			var messageList = getThread(activeThread.threadId).messages;
        			var msgByUser = _.where(messageList, {userId: user._id});
        			_.each(msgByUser, function(msg) {
        				$messageContainer.find('.thread-message[messageId="' + msg._id + '"]').find('.message-user').css('background-image', 'url("' + user.image + '")');
        			});
        		}
        	})
        }
        
        return $message;
    }
    
    var sendMessage = function() {
    	var body = $newMessage.val();
		if (body == '') return true;
		
    	var content = {content: body};
		$sendMessageBtn.find('i').show();
		postMessage(activeThread.threadId, content, function(success, message) {
			$sendMessageBtn.find('i').hide();
			if (success) {
				$newMessage.val('');
				appendMessage(message);
	        	$messageContainer.animate({ scrollTop: $messageContainer[0].scrollHeight}, 100);
	        	
	        	var thread = getThread(message.threadId).thread;
	        	thread.messageCount += 1;
				thread.currentMessageCount += 1;
				thread.modifiedDate = message.createDate;
				updateThread(thread);
			}
		});
    }
    
    var onKeyDown = function(event) {
		if ( event.which == 13 && enterLock) {
			if (event.shiftKey) {
				enterLock = false;
				var e = jQuery.Event('keypress');
				e.which = 13;
				e.keyCode = 13;
				$newMessage.trigger(e);
			} else {
				event.preventDefault();
				sendMessage();
			}
		}
		
		enterLock = true;
    }
   
	this.init(opt);
}


/*
* Name: ZumpGallery
* Date: 04/07/2015
*/
var ZumpGallery = function(opt) {
	
    //----------------------\
    // Javascript Objects
    //----------------------/
    
	var zumpGallery = this;
	var objCount = 0;
	var itemsPerRow;
	var objList = [];
	
    //----------------------\
    // JQuery Objects
    //----------------------/
    
	var $galleryContainer;
	var $galleryTable;
	var $gallerySlider;
	var $galleryMenu;
	
	//----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialize with options
    */
	this.init = function(opt) {
		
		if (isDef(opt.galleryContainer)) {
			$galleryContainer = $(opt.galleryContainer);
			createGallery();
			setupListeners();
		}
		
		if (isDef(opt.galleryCount)) {
			itemsPerRow = opt.galleryCount;
		}
	}
	
	/*
	* Update the gallery
	*/
	this.updateGallery = function(objects) {
		objList = objects;
		objCount = objects.length;
		
		gallerySetup();
		this.showGallery();
	}
	
	/*
	* Set items per row
	*/
	this.updateGalleryCount = function(galleryCount) {
		itemsPerRow = parseInt(galleryCount);
		$gallerySlider.slider('setValue', itemsPerRow);
	}
	
	/*
	* Shows the gallery
	*/
	this.showGallery = function() {
		
		if (!$galleryContainer.is(':visible')) $galleryContainer.show();
		resizeGallery();
	}
	
	/*
	* Hides the gallery
	*/
	this.hideGallery = function() {
		$galleryContainer.hide();
		removeListeners();
	}
	
	/*
	* Updates an item
	*/
	this.updateObject = function(objId, params) {
		var $galleryItem = $('.disc-gallery-item[objId="' + objId + '"]');
		
		if ($galleryItem.length && params.image) {
			$galleryItem.find('.disc-gallery-image > img').attr('src', '/files/' + params.image);
			var galItem = _.first(_.where(objList, {'_id' : objId}));
			galItem.tempFileId = '/files/' + params.image;
		}
	}
	
	//----------------------\
    // Private Functions
    //----------------------/
    
    /*
    * Generates the required fields for the gallery
    */
	var createGallery = function() {
		$galleryContainer.append(
			'<div class="gallery-menu">' +
	            '<span class="gallery-zoom-icon"><i class="fa fa-search-plus fa-lg"></i></span>' +
	            '<input class="gallery-slider" type="text">' +
	            '<span class="gallery-zoom-text">Items Per Row: </span><span class="gallery-row-count"></span>' +
	        '</div>' +
	        '<table class="gallery-table">' +
	        '</table>'
		);
		
		$galleryTable = $galleryContainer.find('.gallery-table');
		$galleryMenu = $galleryContainer.find('.gallery-menu');
		$gallerySlider = $galleryContainer.find('.gallery-slider');
		$gallerySlider.slider({
			min: 2,
			max: 12,
			step: 1,
			value: itemsPerRow,
			tooltip: 'hide',
			selection: 'none'
		}).on('change', function(slider) {
			itemsPerRow = slider.value.newValue;
			gallerySetup();
		});
	}
	
	/*
	* Generates the items within the gallery
	*/
	var gallerySetup = function() {
		var total = 0;
		$galleryTable.empty();
		$galleryMenu.find('.gallery-row-count').text(itemsPerRow);
		
		var rowCount = Math.ceil(objCount/itemsPerRow);
		var colCount = itemsPerRow;
		
		if (rowCount) {
			for (var i = 0; i < rowCount; i++) {
				var $row = $(createGalleryRow());
				for (var j = 0; j < colCount; j++) {
					if (total == objCount) break;
					
					var $item = $(createGalleryItem(objList[total]));
					$row.append($item);
					
					total++;
				}
				$galleryTable.append($row);
			}
		} else {
			$galleryTable.append('<tr class="disc-gallery-row">' +
									'<td class="disc-gallery-item no-results">' +
										'<span><i class="fa fa-exclamation-triangle"></i> No Results</span>' +
									'</td>' +
								'</tr>');
		}
		resizeGallery();
	}
	
	/*
	* Generates a gallery row
	*/
	var createGalleryRow = function() {
		return '<tr class="disc-gallery-row"></tr>';
	}
	
	/*
	* Generates a gallery item
	*/
	var createGalleryItem = function(obj) {
		return '<td class="disc-gallery-item" objId="' + obj._id +'">' + 
					'<div class="disc-gallery-overlay">' +
						'<div class="disc-gallery-text-container">' + 
							'<div class="disc-gallery-text-wrapper">' + 
								'<div class="disc-gallery-overlay-text no-select">' + getSafe(obj.brand, '') + '</div>' + 
								'<div class="disc-gallery-overlay-text no-select">' + getSafe(obj.name, '') + '</div>' + 
							'</div>' +
						'</div>' +
					'</div>' + 
					'<div class="disc-gallery-image-container">' + 
						'<div class="disc-gallery-image">' + 
							'<img src="' + (isDef(obj.tempFileId) ? '/files/' + obj.tempFileId : '/static/logo/logo_small_faded.svg') + '" />' + 
						'</div>' + 
					'</div>' + 
				'</td>';
	}
	
	/*
	* Adds the required event listeners
	*/
	var setupListeners = function() {
		$(window).on('resize', resizeGallery);
		$(document).on('mouseenter', '.disc-gallery-item', showOverlay);
		$(document).on('mouseleave', '.disc-gallery-item', hideOverlay);
		$(document).on('click', '.disc-gallery-item', showPublicView);
	}
	
	/*
	* Destroys the event listeners
	*/
	var removeListeners = function() {
		$(window).off('resize', resizeGallery);
		$(document).off('mouseenter', '.disc-gallery-item', showOverlay);
		$(document).off('mouseleave', '.disc-gallery-item', hideOverlay);
		$(document).off('click', '.disc-gallery-item', showPublicView);
		
	}
	
	var showPublicView = function(e) {
		var id = $(this).attr('objid');
		var win = window.open('/disc/' + id, '_blank');
  		win.focus();
	}
	
	/*
	* Function to show the hover overlay
	*/
	var showOverlay = function(e) {
		$(this).find('.disc-gallery-overlay').show();
	}
	
	/*
	* Function to hide the hover overlay
	*/
	var hideOverlay = function(e) {
		$(this).find('.disc-gallery-overlay').hide();
	}
	
	/*
	* Function to resize gallery based on screen size
	*/
	var resizeGallery = function() {
		var width = $galleryContainer.width();
		var colCount = itemsPerRow;
		var itemWidth = Math.min(500, Math.floor(width / colCount * 0.99));
		var fontsize = getGalleryFontSize(itemWidth);
		
		$('.disc-gallery-item').css({
			width: itemWidth + 'px',
			height: itemWidth + 'px',
			maxWidth: itemWidth + 'px',
			maxHeight: itemWidth + 'px',
			'font-size': fontsize
		});
		
		$('.disc-gallery-item').find('img').css({
			maxWidth: itemWidth + 'px',
			maxHeight: itemWidth + 'px'
		})
	}
	
	/*
	* Function to scale overlay text size
	*/
	var getGalleryFontSize = function(width) {
		return width * 0.15;
	}
	
	this.init(opt);
}

/*
* Name: ZumpLightbox
* Date: 03/02/2015
*/
var ZumpLightbox = function(opt) {
	
    //----------------------\
    // Javascript Objects
    //----------------------/
	var lightboxContent = {
		imageArray : [],
		defaultImage : ''
	};
	
	var onHideEvent;
	var onShowEvent;
	var onCreateEvent;
	
	//----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialize with options
    */
    this.init = function(opt) {
    	
    	// Get lightbox building blocks
		if (isDef(opt.content)) {
			lightboxContent = opt.content;
		}
		
		// On hide event
	    if (isDef(opt.onHide)) {
	    	onHideEvent = opt.onHide;
	    }
	    
	    // On show event
	    if (isDef(opt.onShow)) {
	    	onShowEvent = opt.onShow;
	    }
	    
	    // On create event
	    if (isDef(opt.onCreate)) {
	    	onCreateEvent = opt.onCreate;
	    }
    }
	
	this.showLightbox = function() {
		$('.lightbox').remove();
		var $lightbox = $('<div class="lightbox backdrop click-to-close no-select"></div>');
		$lightbox.html(generateLightboxHtml());
		$lightbox.hide();
    	$('body').append($lightbox);
    	
		startListeners();
    	
    	if (isDef(onCreateEvent)) {
    		onCreateEvent($lightbox);
    	}
    	
    	resizeLightbox();
    	
    	$('body').css('overflow', 'hidden');
    	
    	$lightbox.fadeIn(200, function() {
    		onShowEvent($lightbox);
    	});
    	
    	resizeLightbox();
    	
		$(window).on('resize', resizeLightbox);
		$(document).on('keyup', closeLightbox);
	} 
	
	/*
	* Generates global lightbox html
	*/
	function generateLightboxHtml() {
		var imageList = '';
		var defaultFileId = '';
		var isSelected = false;
		
		imgArray = [];
		
		_.each(lightboxContent.imageArray, function(img) {
			if(img._id == lightboxContent.defaultImage) { 
				defaultFileId = img.fileId;
				isSelected = true;
		    }
			
			imageList = imageList + 
				'<div class="image-view-list-item" lbid="' + img._id + '">' +
					(isSelected ? '<div class="image-view-thumbnail-selected"></div>' : '') +
		        	'<img class="image-view-thumbnail" src="/files/' + img.thumbnailId + '" />' +
		        '</div>';
		    
		    isSelected = false;
		    
		    var preImage = new Image();
		    preImage.src = '/files/' + img.fileId;
		    imgArray.push(preImage);
		});
		
		if (defaultFileId == "") {
			defaultFileId = lightboxContent.imageArray.first().fileId;
		}
		
		return  '<div class="x-container absolute-right">' +
					'<p class="lightbox-close click-to-close">&times</p>' +
				'</div>' +
				'<div class="image-view-container">' +
		            '<div class="image-view-large">' +
		                '<img class="image-view-main" src="/files/' + defaultFileId + '" />' +
		            '</div>' +
		            '<div class="image-view-list-container">' +
		                '<div class="image-view-list-scroll scroll-left absolute-left" style="display: none;">' +
		                    '<i class="fa fa-3x fa-chevron-left"></i>' +
		                '</div>' +
		                '<div class="image-view-list-scroll scroll-right absolute-right" style="display: none;">' +
		                    '<i class="fa fa-3x fa-chevron-right"></i>' +
		                '</div>' +
		                '<div class="image-view-list-item-container">' +
		                    '<div class="image-view-list">' +
		                        imageList +
		                    '</div>' +
		                '</div>' +
		            '</div>' +
		        '</div>';
	}
	
	function startListeners() {
		
		$(document).on('click', '.lightbox.backdrop', backdropCloseEvent);
		$(document).on('click', '.image-view-list-item', changeMainImageEvent);
		$(document).on('click', '.image-view-list-scroll', scrollImageListEvent);
		$(document).on('keydown', arrowKeyScrollEvent);
		$(document).on('click', '.lightbox-close', backdropCloseEvent);
		
		$('.image-view-list-container, .image-view-list-scroll').mouseover(function() {
			if ($('.image-view-list').width() > $('.image-view-list-item-container').width()) {
				$('.image-view-list-scroll').show();
			}	
		});
		
		$('.image-view-list-container').mouseout(function() {
			$('.image-view-list-scroll').hide();
		});
	}
	
	function stopListeners() {
		$(document).off('click', backdropCloseEvent);
		$(document).off('click', changeMainImageEvent);
		$(document).off('click', scrollImageListEvent);
		$(document).off('keydown', arrowKeyScrollEvent);
		$(document).off('click', backdropCloseEvent);
	}
	
	var backdropCloseEvent = function(e) {
		var $element = $(e.target);
		if ($element.hasClass('click-to-close')) {
			$(this).fadeOut(200, function() {
				if (isDef(onHideEvent)) {
					hideLightbox();
				}
				$(this).remove();
			});
		}
	}
	
	var changeMainImageEvent = function(e) {
		e.stopImmediatePropagation();
		var $this = $(this);
		var id = $this.attr('lbid');
		var img = _.findWhere(lightboxContent.imageArray, {_id: id});
		if (img) {
			changeMainImage(img, $this);
		}
		return false;
	};
	
	var scrollImageListEvent = function(e) {
	    var $scrollButton = $(this);
	    var $imageViewList = $('.image-view-list');
	    if ($scrollButton.hasClass('scroll-left')) {
	    	scrollLeft($imageViewList);
	    }
	    if ($scrollButton.hasClass('scroll-right')) {
	    	scrollRight($imageViewList);
	    }
	};
	
	var arrowKeyScrollEvent = function(e) {
			var $imageViewList = $('.image-view-list');
			var $selectedImage = $('.image-view-thumbnail-selected').first().parent();
			var $nextImage = $selectedImage.next();
			var $prevImage = $selectedImage.prev();
			var rightMin = $('.image-view-list-container').width() - 100;
			
			if (e.which == 37) { // left arrow key
				if ($prevImage.length) {
					var id = $prevImage.attr('lbid');
					var img = getNewImage(id);
					changeMainImage(img, $prevImage);
					if (($prevImage.position().left + $imageViewList.position().left) < 0) {
						scrollLeft($imageViewList);
					}
				}
			}
			if (e.which == 39) { // right arrow key
				if ($nextImage.length) {
					var id = $nextImage.attr('lbid');
					var img = getNewImage(id);
					changeMainImage(img, $nextImage);
					if ($nextImage.position().left > rightMin) {
						scrollRight($imageViewList);
					}
				}
			}
		};
	
	function scrollLeft($imageViewList) {
		var leftPos = Math.min($imageViewList.position().left + 103, 0);
		$imageViewList.css('left', leftPos);
	}
	
	function scrollRight($imageViewList) {
		var rightDelta = $imageViewList.width() - $('.image-view-list-item-container').width();
    	var newPos = Math.max(-1 * rightDelta, $imageViewList.position().left - 103);
    	$imageViewList.css('left', newPos);
	}
	
	function getNewImage(id) {
		return _.findWhere(lightboxContent.imageArray, {_id: id});
	}
	
	function changeMainImage(img, $selectedItem) {
		$('.image-view-large > img').attr('src', '/files/' + img.fileId);
		$('.image-view-thumbnail-selected').remove();
		$selectedItem.prepend('<div class="image-view-thumbnail-selected"></div>');
	}
	
	function hideLightbox() {
		stopListeners();
		$('body').css('overflow', 'auto');
		onHideEvent();
	}
	
	function closeLightbox(e) {
		if (e.keyCode == 27)  { // ESC
			var $lightbox = $('.lightbox');
		
			$lightbox.fadeOut(200, function() {
				if (isDef(onHideEvent)) {
					hideLightbox();
				}
				
				$lightbox.remove();
			});
		}
	}
	
	/*
	* Resizes the lightbox based on the window screen size.
	*/
	function resizeLightbox() {
		var windowHeight = $(window).height();
		// Lightbox max height = 855 = 750(main image) + 100(image list height) + 5(padding)
		var lbHeight = Math.min(Math.max(windowHeight - 160, 255), 855);
		var lbWidth = lbHeight - 105; // 105 = 100(image list height) + 5(padding)
		
		$('.image-view-container').css({
			height: lbHeight + 'px',
			width: lbWidth + 'px',
			maxWidth: lbWidth + 'px'
		});
		
		$('.image-view-large').css({
			maxHeight: lbWidth,
		   	maxWidth: lbWidth,
		   	height: lbWidth,
		   	width: lbWidth
		});
		
		$('.image-view-main').css({
			maxHeight: lbWidth,
			maxWidth: lbWidth
		});
		
		$('.image-view-list-container').css({
		   	width: lbWidth
		});
		
		$('.image-view-list-item-container').css({
			width: lbWidth,
			maxWidth: lbWidth
		});
		
		$('.lightbox').css('top', $(document).scrollTop());
	}
	
	//----------------------\
    // Start
    //----------------------/
    this.init(opt);
}



/*
* Name: ZumpSort
* Date: 01/07/2015
*/
var ZumpSort = function(opt) {
    
    //----------------------\
    // Javascript Objects
    //----------------------/
    var zumpSort = this;
    var sort = [];
    var triggerSort;
    
    //----------------------\
    //JQuery Objects
    //----------------------/
    var $sortToggle;
    var $sortContainer;
    var $addSortTrigger;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialization based on options
    */
    this.init = function(opt) {
        
        /*
        * Option configuration
        */
        
        // No options passed
        if (!isDef(opt)) return;
        
        // Set sort toggle
        if (isDef(opt.sortToggle)) {
            $sortToggle = $(opt.sortToggle);
        }
        
        // Set sort container
        if (isDef(opt.sortContainer)) {
            $sortContainer = $(opt.sortContainer);
            
            $sortContainer.sortable({
                placeholder: 'sort-field-placeholder',
                handle: '.sort-field-arrange',
                update: function(event, ui) {
                	updateSortFields();
                	triggerSort();
                }
            });
        }
        
        // Set add sort trigger
        if (isDef(opt.addSortTrigger)) {
            $addSortTrigger = $(opt.addSortTrigger);
        }
        
        // Set sort trigger
        if (isDef(opt.triggerSort)) {
            triggerSort = opt.triggerSort;
        }
        
        // Set sort fields
        if (isDef(opt.sortFields)) {
            sort = [];
            _.each(opt.sortFields, function(sortField) {
                if (isDef(sortField.property)) {
                    var field = {sortProp: sortField.property, sortOn: false, sortAsc: true, sortOrder: -1};
                    field.sortText = getSafe(sortField.text, sortField.property);
                    field.sortType = getSafe(sortField.type, 'text');
                    sort.push(field);
                }
            });
        }
        
        /*
        * Listeners/Events
        */
		
        // Toggle Sort Container
        $sortToggle.click(function(){
	       if ($dynamicHeader.is(':visible')) { 
	            $dynamicHeader.slideUp(300);
	            $sortToggle.css({
	       			'background-color' : 'initial',
	       			'color' : '#000',
	       			'border-color' : 'rgb(134, 134, 134)'
	       		});
	       } else {
	           	$dynamicHeader.slideDown(300);
	           	$sortToggle.css({
	       			'background-color' : 'rgb(0, 142, 221)',
	       			'color' : '#FFF',
	       			'border-color' : '#000'
	       		});
	       }
	    });
        
        // Add Sort Field
        $addSortTrigger.mousedown(function(){
            $(this).addClass('mdown');
        }).mouseup(function(){
            $(this).removeClass('mdown');
        }).click(function(){
           addSortField();
           triggerSort();
        });
        
        // Remove Sort Field
        $(document).on('click', '.sort-field-remove', function() {
            if ($('.sort-field-container').length > 1) {
                $(this).parents('.sort-field-container').remove();
        		updateSortFields();
                triggerSort();
            }
        });
        
        // Arrange Sort Field Styling
        $(document).on('mousedown', '.sort-field-arrange', function(){
            $(this).addClass('mdown');
        }).on('mouseup', '.sort-field-arrange', function(){
            $(this).removeClass('mdown');
        });
        
        // Change for Option Select
        $(document).on('change', '.sort-option-select', function(){
        	var val = $(this).val();
        	var sorter = getSorter(val);
        	if (sorter.sortOn) {
        		sorter = getSorterByIndex($(this).parents('.sort-field-container').index());
        		$(this).val(sorter.sortProp);
        		return;
        	}
        	
        	updateSortFields();
        	triggerSort();
        });
        
        // Change for Direction Select
        $(document).on('change', '.sort-option-direction', function(){
        	updateSortFields();
        	triggerSort();
        });
        
        if (opt.init) {
        	_.each(opt.init, function(initField) {
        		addSortField(true, initField.property, initField.sortAsc);
        	})
        }
    }
    
    /*
    * Sorts an array based on a sorter object
    */
    this.genericSort = function(sorter, array) {
    	if (sorter.sortType == 'number') {
    		array = _.sortBy(array, function(obj) { return parseInt(obj[sorter.sortProp])});
    	} else {
    		array = _.sortBy(array, function(obj) {
    			return obj[sorter.sortProp].toLowerCase();
    		});
    	}
    	
    	if (!sorter.sortAsc) {
    		array = array.reverse();
    	}
    	
    	return array;
    }
    
    /*
    * Sorts a provided array using the current sort configuration
    */
    this.doSort = function(arr) {
    	var toSort = _.sortBy(_.where(sort, {sortOn : true}), 'sortOrder');
    	return groupAndSort(arr, toSort, 0);
    }
    
    //----------------------\
    // Private Functions
    //----------------------/
    
    
    var simpleSort = function(sorter, arr) {
    	return zumpSort.genericSort(sorter, arr);
    }
    
    /*
    * Recursive Sort Routine
    */
    var groupAndSort = function(sorted, toSort, i) {
    	if (i == toSort.length) {
    		sorted = zumpSort.genericSort(toSort[i-1], sorted);
    		return sorted;
    	}
    	
    	var sorter = toSort[i];
    	
    	if (i == 0) {
    		sorted = zumpSort.genericSort(sorter, groupAndSort(sorted, toSort, i + 1));
    		return sorted;
    	} else {
    		var grouper = toSort[i-1];
    		var grouped = _.groupBy(sorted, function(obj) { return obj[grouper.sortProp]; });
    		var newArray = [];
    		_.each(grouped, function(valArray) {
    			valArray = zumpSort.genericSort(sorter, groupAndSort(valArray, toSort, i + 1));
    			newArray = newArray.concat(valArray);
    		});
    		sorted = newArray;
    		return sorted;
    	}
    }
    
    /*
    * Get Sorter By Sort Order
    */
    var getSorterByIndex = function(index) {
    	return _.first(_.where(sort, {'sortOrder': index}));
    }
    
    /*
    * Get Sorter By Property
    */
    var getSorter = function(property) {
    	return _.first(_.where(sort, {'sortProp': property}));
    }
    
    
    /*
    * Get Sorts that are not turned on
    */
    var getAvailableSorts = function() {
    	return _.filter(sort, function(sorter) {
    		return !sorter.sortOn;
    	})
    }
    
    /*
    * Generates the HTML to add a new sort field
    */
    var createSortField = function() {
    	var optionHTML = '';
    	
    	_.each(sort, function(sortOption) {
    		optionHTML = optionHTML + '<option value="' + sortOption.sortProp + '">' + sortOption.sortText + '</option>';
    	});
    	
        return '<div class="sort-field-container">' +
                    '<div class="sort-field-arrange float-left text-center no-select"> <!-- Arrange Icon -->' +
                        '<span><i class="fa fa-bars"></i></span>' +
                    '</div>' +
                    '<div class="sort-field-remove float-right text-center no-select"> <!-- Remove Icon -->' +
                        '<span><i class="fa fa-times"></i></span>' +
                    '</div>' +
                    '<div class="sort-field-form"> <!-- Form -->' +
                        '<div class="row">' +
                            '<div>' +
                                '<form class="form-inline" role="form">' +
                                    '<div class="form-group" style="margin-right: 30px">' +
                                        '<p class="form-control-static header-text">Field:</p>' +
                                        '<select class="form-control input-sm sort-option-select">' +
                                            optionHTML +
                                        '</select>' +
                                    '</div>' +
                                    '<div class="form-group">' +
                                        '<p class="form-control-static header-text">Direction:</p>' +
                                        '<select class="form-control input-sm sort-option-direction">' +
                                            '<option value="Ascending">Ascending</option>' +
                                            '<option value="Descending">Descending</option>' +
                                        '</select>' +
                                    '</div>' +
                                '</form>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }
    
    /*
    * Adds a new sort field to the sort container
    */
    var addSortField = function(quiet, property, isAsc) {
        var availableSorts = getAvailableSorts();
        
        if (availableSorts.length == 0) {
        	return;
        }
        
        $sortContainer.append(createSortField());
        var $sortField = $sortContainer.find('.sort-field-container:last-child');
        
        var sorter = availableSorts[0];
        
        if (isDef(property)) {
        	reqSorter = getSorter(property);
        	if (!reqSorter.sortOn) sorter = reqSorter;
        }
        
        
        $sortField.find('.sort-option-select').val(sorter.sortProp);
        
        if (isDef(isAsc)) {
        	$sortField.find('.sort-option-direction').val(isAsc ? 'Ascending' : 'Descending');
        }
        
        updateSortFields();
        
        if (!isDef(quiet) || !quiet) $sortField.find('.sort-option-select').trigger('change');
    }
    
    /*
    * Updates the sort array using the current sort fields
    */
    var updateSortFields = function() {
        
        // Reset sort
        _.each(sort, function(sortOption) {
    		sortOption.sortOn = false;
    		sortOption.sortOrder = -1;
    	})
    	
    	// Update Sort
    	$('.sort-field-container').each(function(i) {
    		sortFieldChange($(this), i);
    	});
    }
    
    /*
    * Uses the sort field values to update the sort object
    */
    var sortFieldChange = function($sortField, i) {
    	var option = $sortField.find('select.sort-option-select').val();
    	var order = $sortField.find('select.sort-option-direction').val() == 'Ascending';
    	
    	updateSort(option, true, order, i);
    }
    
    /*
    * Updatse a sort object with provided params
    */
    var updateSort = function(option, enable, isAsc, index) {
    	var sorter = getSorter(option);
    	if (sorter !== undefined) {
    		if (isDef(enable)) sorter.sortOn = enable;
    		if (isDef(isAsc)) sorter.sortAsc = isAsc;
    		if (isDef(index)) {
    			sorter.sortOrder = index;
    		} else {
    			sorter.sortOrder = -1;
    		}
    	}
    }
    
    //----------------------\
    // Construction
    //----------------------/
    this.init(opt);
}

/*
* Name: ZumpFilter
* Date: 01/07/2015
*/
var ZumpFilter = function(opt) {
    
    //----------------------\
    // Javascript Objects
    //----------------------/
    var filters = {};
    var filterItems = [];
    var filterOrder = [];
    var filterChangeEvent;
    var zumpFilter = this;
    var lastNav;
    
    //----------------------\
    //JQuery Objects
    //----------------------/
    var $filterToggle;
    var $filterContainer;
    var $currentFilterContainer;
    var $lastSidebar;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialization based on options
    */
    this.init = function(opt) {
        
        /*
        * Option configuration
        */
        
        // No options passed
        if (!isDef(opt)) return;
        
        if (isDef(opt.currentFilterContainer)) {
        	$currentFilterContainer = $(opt.currentFilterContainer);
        	$currentFilterContainer.append('<div class="clear-all-filters text-center" style="display: none;">Clear All</div>');
        }
        
        if (isDef(opt.filterContainer)) {
            $filterContainer = $(opt.filterContainer);
        }
        
        // Set filter toggle
        if (isDef(opt.filterToggle)) {
            $filterToggle = $(opt.filterToggle);
        }
        
        // Set filter array
        if (isDef(opt.items)) {
        	filterItems = opt.items;
            _.each(opt.items, function(item) {
                if (isDef(item.property)) {
                    // Create your div to add to screen using data
                    if (!item.hideContainer) createFilterItem(item);
                    
                    // Create your array based on data
                    filters[item.property] = [];
                }
            });
        }
        
        // Set filter change event
        if (isDef(opt.onFilterChange)) {
            filterChangeEvent = opt.onFilterChange;
        }
        
        /*
        * Listeners/Events
        */
        
        // Toggle Filter Container
        $filterToggle.click(function(){
	      	if ($('#sidebar-filter').is(':visible')) {
		    	$(lastNav).show();
	      		$lastSidebar.addClass('active');
	            $('#sidebar-filter').hide();
	            $filterToggle.css({
	      			'background-color' : 'initial',
	      			'color' : '#000',
	      			'border-color' : 'rgb(134, 134, 134)'
	      		});
	      	} else {
	      		$lastSidebar = $('.sidebar-nav-toolbar').find('.active')
	      		lastNav = $lastSidebar.attr('nav-select');
	          	$('#sidebar-filter').show();
	            $(lastNav).hide();
	            $lastSidebar.removeClass('active');
	          	$filterToggle.css({
	      			'background-color' : 'rgb(0, 142, 221)',
	      			'color' : '#FFF',
	      			'border-color' : '#000'
	      		});
	      	}
	    });
        
        $(document).on('click', '.filter-option', function(e){
			e.stopPropagation();
			
			var $parent = $(this).parents('.filter-item-parent');
			var option = $parent.attr('id').match(/-([a-zA-Z]+)/)[1];
			var val = $(this).attr('filterOn');
			
			toggleOption(option, val);
	    });
	    
	    $(document).on('click', '.clear-all-filters', function(e){
	    	zumpFilter.clearFilters();
	    });
	    
	    $(document).on('click', '.remove-filter-item', function(e){
		   	var curFilterId = $(this).parents('.current-filter-item').attr('curFilterId');
	    	var optionVal = curFilterId.substring(15);
	    	var option = optionVal.match(/([a-zA-z])+/)[0];
	    	var val = optionVal.match(/-(.+)/)[1];
	    	if (val === "- None -") val = "";
	    	
			toggleOption(option, val);
	    }); 
     
    	 $(document).on('click', '.filter-item', function(){
    	 	var $this = $(this);
   		
	   		if ($this.hasClass('active')) {
	   			$this.siblings('.filter-option-container').slideUp(300, function() {
	   				$this.removeClass('active');
	   				$this.find('i').removeClass('fa-angle-double-down').addClass('fa-angle-double-right');
	   			});
	   		} else {
	   			$this.addClass('active');
	   				$this.find('i').removeClass('fa-angle-double-right').addClass('fa-angle-double-down');
	   			$this.siblings('.filter-option-container').slideDown(300);
	   		}
		});
		
		/*
		* Start Events
		*/
        
    }
    
    this.getText = function(property) {
    	var prop = _.findWhere(filterItems, {property: property});
    	
    	if (typeof prop !== 'undefined') {
    		return prop.text;
    	} else {
    		return undefined;
    	}
    }
    
    /*
    * Returns the filter count
    */
    this.getCount = function() {
    	var count = 0;
    	
    	var filterArrays = _.values(filters);
    	_.each(filterArrays, function(filterArray) { count = count + filterArray.length})
    	return count;
    }
    
    /*
    * Trigger update of the filter
    */
    this.filter = function(arr) {
    	generateAllFilters(arr);
    	return filterList(arr);
    }
    
    /*
    * Add item to filter on
    */
    this.filterOnly = function(property, value) {
    	if (isDef(filters[property])) {
    		for (var filterProp in filters) {
	    		clearFilterItems(filterProp);
	    	}
	    	
	    	this.pushFilterItem(property, value);
    	}
    }
    
    
    /*
    * Add item to filter on
    */
    this.pushFilterItem = function(property, value, clearFirst) {
    	if (isDef(filters[property])) {
    		
    		if (clearFirst) {
    			clearFilterItems(property);
    		}
    		
	    	var $filterItem = $('#filter-' + property);
	    	
	    	if ($filterItem.length) {
	    		if (!_.contains(filters[property], value)) {
	    			var $filterOption = $filterItem.find('li.filter-option[filteron="' + value + '"]');
	    		
		    		if ($filterOption.length) {
		    			$filterOption.trigger('click');
		    		}
		    		
		    		pushFilterOrder(property);
	    		}
	    	} else {
	    		if (!_.contains(filters[property], value)) {
		    		filters[property].push(value);
		    		
		    		updateCurrentFilters({
						option: property,
						val: value,
						fn: 'add'
					});
		    		
		    		pushFilterOrder(property);
		    		
		    		if (isDef(filterChangeEvent)) filterChangeEvent();
	    		}
	    	}
    	}
    }
    
    /*
    * Remove item from the filter
    */
    this.removeFilterItem = function(property, value) {
    	if (isDef(filters[property]) && _.contains(filters[property], value)) {
    		filters[property] = _.without(filters[property], value);
	    	if (isDef(filterChangeEvent)) filterChangeEvent();
    	}
    }
    
    /*
    * Clear filter
    */
    this.clearFilter = function(property) {
    	clearFilterItems(property);
    	
    	if (isDef(filterChangeEvent)) filterChangeEvent();
    }
    
    /*
    * Clear all filters
    */
    this.clearFilters = function() {
    	clearAllFilters();
    	updateCurrentFilters({fn: 'removeall', val: ''});
    	if (isDef(filterChangeEvent)) filterChangeEvent();
    }
    
    
    //----------------------\
    // Private Functions
    //----------------------/
    
    var pushFilterOrder = function(property) {
    	if (!_.contains(filterOrder, property)) filterOrder.push(property);
    }
    
    var clearFilterOrder = function (property) {
    	filterOrder = _.without(filterOrder, property);
    }
    
    var toggleOption = function(option, val) {
    	var $option = $('#filter-' + option).find('.filter-option[filterOn="' + val + '"]');
    	
		if (!_.contains(filters[option], val)) {
			filters[option].push(val);
			pushFilterOrder(option);
			updateCurrentFilters({
				option: option,
				val: val,
				fn: 'add'
			});
		} else {
			filters[option] = _.without(filters[option], val);
			
			if (!filters[option].length) clearFilterOrder(option);
			
			updateCurrentFilters({
				option: option,
				val: val,
				fn: 'remove'
			});
		}
		
		if (isDef(filterChangeEvent)) filterChangeEvent();
    }
    
    var updateCurrentFilters = function(args) {
    	if (!args.val.length || args.val === 'undefined') args.val = "- None -";
    	
    	var filterHeading = args.option ? _.findWhere(filterItems, {property: args.option}).text : '';
    	
    	if (args.fn === 'add') {
    		var $curFilterItem = $('<li class="current-filter-item" curFilterId="current-filter-' + 
    			args.option + '-' + args.val + '" style="display: none;"><span class="pull-right"><i class="fa fa-times remove-filter-item"></i></span><b>' + filterHeading + ':</b> ' + 
    			args.val + '</li>');
    		$currentFilterContainer.append($curFilterItem);
    		setAllFilter(true);
    		$curFilterItem.slideDown(300, function() {
    		});
    	} else if (args.fn === 'remove') {
    		var $currentFilterOptionVal = $('.current-filter-item[curFilterId="current-filter-' + args.option + '-' + args.val + '"]');
    		if ($currentFilterOptionVal.length) {
		   		$currentFilterOptionVal.css('text-decoration', 'line-through').fadeOut(300, function() {
		   			$currentFilterOptionVal.remove();
		   		});
    			setAllFilter($('.current-filter-item').length - 1);
    		}
    	} else if (args.fn === 'removeall') {
    		$('.current-filter-item').css('text-decoration', 'line-through').fadeOut(300, function() { $(this).remove(); });
    		setAllFilter(false);
    	}
    }
    
    var setAllFilter = function(show) {
    	var $allFilters = $('.clear-all-filters');
    	if (show) {
    		if ($allFilters.is(':hidden')) $('.clear-all-filters').slideDown(300);
    	} else {
    		$('.clear-all-filters').slideUp(300);
    	}
    }
    
    var clearAllFilters = function() {
    	for (var filterProp in filters) {
    		clearFilterItems(filterProp);
    	}
    }
    
    var clearFilterItems = function(property) {
    	filters[property] = [];
    	clearFilterOrder(property);
    }
    
    
    /*
    * Create Filter Panel
    */
    var createFilterPanel = function(property, text, isGroup) {
        var emptyItem = '<li class="filter-option-static">' +
                                'No Items' +
                            '</li>';
        var $filterPanel  = $('<li class="filter-item-container"></li>');
        
        $filterPanel.attr('id', 'filter-container-' + property);
        $filterPanel.html('<div class="filter-item"><span class="pull-right"><i class="fa fa-angle-double-right"></i></span>' + text + '</div>' +
                        '<ul class="filter-option-container' + (!isGroup ? ' filter-item-parent" id="filter-' + property + '"' : '"' ) + ' style="display: none;">' +
                            (!isGroup ? emptyItem : '') + 
                        '</ul>');
                        
        return $filterPanel;
    }
    
    /*
    * Generates and adds the HTML for a new filter item
    */
    var createFilterItem = function(item) {
        var $filterPanel = undefined;
        var exists = false;
        var isGroup = isDef(item.groupProp);
        
        // Check if group already exists
        if (isGroup) {
            var $groupDiv = $('#filter-container-' + item.groupProp);
            if ($groupDiv.length) {
                $filterPanel = $groupDiv;
                exists = true;
            }
        }
        
        if (!isDef($filterPanel)) {
            $filterPanel = createFilterPanel(isGroup ? item.groupProp : item.property, 
                isGroup ? getSafe(item.groupText, item.groupProp) : getSafe(item.text, item.property), 
                isGroup);
        }
        
        var $panelBody = $($filterPanel).find('.filter-option-container');
        
        if (isGroup) {
            $panelBody.append('<div class="filter-option-multi filter-option-multi-open">' +
                                    getSafe(item.text, item.property) +
                                    '<span class="glyphicon glyphicon-screenshot pull-right" aria-hidden="true"></span>' +
                                    '<div class="filter-option-group filter-item-parent" style="display: block;" id="filter-' + item.property + '">' +
                                        '<div class="filter-option filter-option-static" style="display: none;">' +
                                            'No Items' +
                                        '</div>' +
                                '</div>');
        }
        
        if (!exists) $filterContainer.append($filterPanel);
    }
    
    /*
    * Generates the filter items within each filter
    */
    var generateAllFilters = function(arr) {
    	var arrList = arr;
	    var newFilters = {};
	    
	    for (var i = 0; i < filterOrder.length; i++) {
	        var prop = filterOrder[i];
	        generateFilters(prop, arrList, arr);
	        newFilters[prop] = filters[prop];
	        arrList = filterList(arrList, newFilters);
	    }
	    
	    for (var prop in filters) {
	        if (!_.has(newFilters, prop)) {
	    		generateFilters(prop, arrList, arr);
	        }
	    }
    }
    
    /*
    * Generates the filter items within a filter
    */
    var generateFilters = function(property, arr, fullArr) {
        var items = getProperties(property, arr);
        var $filterBody = $('#filter-' + property);
        
        // Get unique filter items based on property
    	items = _.sortBy(items, function(i) {
    		if (_.isNumber(i)) {
    			return parseInt(i);
    		}
    		if (_.isString(i)) {
    			if (i == '') {
    				return undefined;
    			} else {
    			    return i.toLowerCase();
    			}
    		}
    		return i;
    	});
    	
    	$filterBody.find('li.filter-option').remove();
    	if (items.length > 0) {
    		$filterBody.find('li.filter-option-static').hide();
    		_.each(items, function(item) {
    			var $filterOption = $(generateFilterOption(item)); 
    			if (_.contains(filters[property], item)) {
    				setFilterOption($filterOption, true);
    			}
    			$filterBody.append($filterOption);
    		});
    	} else {
    		$filterBody.find('li.filter-option-static').show();
    	}
    	
    	var toRemove = [];
    	_.each(filters[property], function(item) {
    		if (!_.contains(getProperties(property, fullArr), item)) {
    				toRemove.push(item);
    		}
    	});
    	
    	filters[property] = _.reject(filters[property], function(item) {
    			return _.contains(toRemove, item);
    	});
    	
    }
    
    /*
    * Programmatically check a filter option
    */
    var setFilterOption = function($filterOption, checked) {
    	if (!$filterOption.length) return;
    	var $icon = $filterOption.find('i.fa');
    	
    	if (!checked) {
    		$icon.removeClass('fa-dot-circle-o').addClass('fa-circle-o');
    		$filterOption.removeClass('active');
    	} else {
    		$icon.removeClass('fa-circle-o').addClass('fa-dot-circle-o');
    		$filterOption.addClass('active');
    	}
    }
    
    /*
    * Returns a div containing the filter option item
    */
    var generateFilterOption = function(option) {
    	var optionText = option;
    	
    	if(option === '' || typeof option === 'undefined') {
    		optionText = '- None -';
    	}
    	
    	return '<li class="filter-option" filterOn="' + option + '"><span class="pull-right"><i class="fa fa-circle-o"></i></span>' + optionText + '</li>'
    }
    
    /*
    * Filters the provided array based on the defined filters
    */
    var filterList = function(arr, arrFilters) {
    	
    	if (typeof (arrFilters) === 'undefined') arrFilters = filters;
    	
    	return _.filter(arr, function(obj) {
    		for (var property in arrFilters) {
    			if (arrFilters[property].length > 0) {
    				if (_.has(obj, property)) {
    					if (_.isArray(obj[property])) {
    						var hasProp = false;
    						_.each(obj[property], function(propVal) {
    							if (_.contains(arrFilters[property], String(propVal))) {
    								hasProp = true;
    							}	
    						});
    						if (!hasProp) {
    							return false;
    						}
    					} else {
    						if (!(_.contains(arrFilters[property], String(obj[property])))) {
    							return false;
    						}
    					}
    				} else {
    					if (!_.contains(arrFilters[property], 'undefined')) {
    						return false;
    					}
    				}
    			}
    		}
    		return true;
    	});
    }
    
    /*
    * Returns a unique list of values for an array at a specific property
    */
    var getProperties = function(prop, arr) {
    	var list = [];
    	if (arr.length && _.isArray(arr[0][prop])) {
    		var arrList = _.pluck(arr, prop);
    		_.each(arrList, function(arr) { 
    			list = list.concat(arr);	
    		});
    	} else {
    		list = _.pluck(arr,  prop);
    	}
    	
    	return _.uniq(list);
    }
    
    
    //----------------------\
    // Construction
    //----------------------/
    
    this.init(opt);
}


/*
* Name: ZumpTextAssist
* Date: 01/07/2015
*/
var ZumpTextAssist = function(opt) {
    
    //----------------------\
    // Javascript Objects
    //----------------------/
    var zumpTextAssist = this;
    var resultList;
    var property = '';
    var currentSearch = '';
    var onSelection;
    var tabTrigger = false;
    
    
    //----------------------\
    //JQuery Objects
    //----------------------/
    var $input;
    var $dropdown;
    var $dropdownList;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialization based on options
    */
    this.init = function(opt) {
        
        /*
        * Grab input element from options
        */
        if (isDef(opt.inputElement)) {
        	if (opt.inputElement instanceof jQuery) {
        		$input = opt.inputElement
        	} else if (_.isString(opt.intputElement)) {
            	$input = $(opt.inputElement);
        	}
            createDropdown();
        }
        
        /*
        * Grab search property from options
        */
        if (isDef(opt.searchProp)) {
            property = opt.searchProp;
        }
        
        /*
        * Grab current set of items
        */
        if (isDef(opt.items)) {
            if (_.isFunction(opt.items)) {
                resultList = opt.items;
            }
        }
        
        /*
        * Grab on enter event callback
        */
        if (isDef(opt.onSelection)) {
        	if (_.isFunction(opt.onSelection)) {
        		onSelection = opt.onSelection;
        	}
        }
        
        /*
        * Resize result container dropdown on resize of page
        */
        $(window).on('resize', function(){
           resizeResultContainer();
        });
        
        /*
        * Stop normal propagation on Up, Down, and Enter
        */
        $input.on('keydown', function(e) {
	    	var code = e.keyCode || e.which;
	    	var $curActive = $dropdownList.find('.dropdown-list-item.active');
	    	
	    	if (code == 13 || code == 38 || code == 40) {
		    	e.stopImmediatePropagation();
		    	return false;
	    	}
	    	
	    	else if (code == 9 && $curActive.length) {
	    		tabTrigger = true;
		    	e.stopImmediatePropagation();
		    	return false;
	    	}
	    	
	    	else if (code == 9) {
	    		setResultsVisibility(false);
	    	}
	    })
	    
	    /*
	    * Key Events within input box
	    */
	    .on('keyup', function(e){
	    	var code = e.keyCode || e.which;
	    	
	    	/*
	    	* Enter key - select active result item
	    	*/
	    	if (code == 13 || (code == 9 && tabTrigger)) {
	    		var $curActive = $dropdownList.find('.dropdown-list-item.active');
		        if ($curActive.length) {
		        	updateInput($curActive.attr('result'), true);
		        }
		        
		        if (onSelection) {
	        		onSelection($input.val(), zumpTextAssist.resetInput);
		        }
		        
		        tabTrigger = false;
			 	e.preventDefault();
      			return false;
	    	}
	    	
	    	/*
	    	* Up/Down keys - select prev/next result item
	    	*/
	    	else if (code == 38 || code == 40) {
			 	var $curActive = $dropdownList.find('.dropdown-list-item.active');
			 	var $nextActive;
			 	
			 	if ($curActive.length == 0) {
			 	    $nextActive = code == 38 ? 
			 	    	$dropdownList.find('.dropdown-list-item').last() : 
			 	    	$dropdownList.find('.dropdown-list-item').first();
			 	} else {
			 	    $curActive.removeClass('active');
			 	    $nextActive = code == 38 ? $curActive.prev() : $curActive.next();
			 	}
			 	
			 	if ($nextActive.length > 0) {
			    	$nextActive.addClass('active');
			    	updateScroll($nextActive);
			    	$input.val($nextActive.attr('result'))
			 	} else {
			 		$input.val(currentSearch);
			 	}
			 	
			 	e.preventDefault();
			 	return false;
			 }
			 
			 /*
			 * All other keys
			 */
			 else {
			     setInput($input.val());
			 }
			 
	    })
	    
	    /*
	    * Show results on click
	    */
	    .on('click', function(e){
	    	e.preventDefault();
	    	setInput($input.val());
	    	return false;
	    })
	    
	    /*
	    * Hide results on leave
	    */
        .on('focusout', function(e){
        	if ($(e.relatedTarget)[0] != $dropdown[0] && !$dropdownList.has(e.relatedTarget).length > 0) {
        		setResultsVisibility(false);
        	}
        	
        	e.preventDefault();
        	e.stopPropagation();
	    	return false;
        });
        
        /*
        * Click event on a result item
        */
        $dropdownList.on('click', '.dropdown-list-item', function(){
            updateInput($(this).attr('result'), true);
            
            if (onSelection) {
	        	onSelection($input.val(), zumpTextAssist.resetInput);
	        }
	        
        	$input.focus();
        });
        
        /*
	    * Hide results on leave
	    */
        $dropdown.on('focusout', function(e){
        	if ($(e.relatedTarget)[0] != $input[0] && !$dropdownList.has(e.relatedTarget).length > 0) {
        		setResultsVisibility(false);
        	}
        	
        	e.preventDefault();
        	e.stopPropagation();
	    	return false;
        });
        
	    /*
	    * Start up events
	    */
        resizeResultContainer();
    }
    
    this.resetInput = function() {
    	updateInput('', true);
    }
    
    this.triggerResize = function() {
    	resizeResultContainer();
    }
    
    
    //----------------------\
    // Private Functions
    //----------------------/
    
    /*
    * Update Results Container Scroll Position
    */
    var updateScroll = function($activeResult) {
    	var curTop = $dropdown.scrollTop();
    	var curBottom = $dropdown.height();
    	var resultTop = $activeResult.position().top;
    	var resultBottom = resultTop  + $activeResult.outerHeight();
    	
    	if (resultTop < curTop) { 
    		$dropdown.scrollTop(resultTop);	
    	} else if (resultBottom > curBottom) {
    		$dropdown.scrollTop(curTop + (resultBottom - curBottom));
    	}
    }
    
    /*
    * Update Input
    */
    var updateInput = function(newVal, hideAlways) {
    	if (isDef(newVal)) {
    		$input.val(newVal);
    	}
    	
    	setInput(newVal, hideAlways);
    }
    
    /*
    * Set Input
    */
    var setInput = function(newVal, hideAlways) {
    	if (isDef(newVal)) {
			currentSearch = $input.val();
    	}
    	setResultsVisibility(updateResults() && !hideAlways);
    }
    
    /*
    * Update Results
    */
    var updateResults = function() {
    	$dropdownList.empty();
    	
		var results = getResults(currentSearch);
		
		_.each(results, function(result) {
			var resultHtml = generateResult(result);
			$dropdownList.append(resultHtml);
		});
		
		return results.length > 0;
    }
    
    /*
    * Shows the results list
    */
    var setResultsVisibility = function(shouldShow) {
    	if (shouldShow && !$dropdown.is(':visible')) {
    		$dropdown.show();
    	}
    	
    	if (!shouldShow) {
    		$dropdown.hide();
    	}
    }
    
    /*
    * Resizes the result view to the width of the input
    */
    var resizeResultContainer = function() {
        
        if ($input) {
	        var leftOff = $input.position().left;
	    	var topOff = $input.position().top;
	    	
	    	$dropdown.css({width: $input.outerWidth() + 'px'});
	    	$dropdown.css({left: leftOff, 
	    		top: topOff + $input.outerHeight()});
        }
    }
    
    /*
    * Creates the dropdown div/list to hold result items
    */
    var createDropdown = function() {
        $input.after('<div class="dropdown-list-display" tabindex="-1">' +
                        '<ul class="list-unstyled dropdown-search-list">' +
                        '</ul>' +
                    '</div>');
        
        $dropdown = $input.siblings('div.dropdown-list-display');
        $dropdownList = $dropdown.find('.dropdown-search-list');
    }
    
    /*
    * Creates the dropdown div/list to hold result items
    */
    var generateResult = function(result) {
    	
        return '<li class="dropdown-list-item" tabindex="0" result="' + result + '">' +
                    result +
                '</li>';
    }
    
    /*
    * Returns a set of matched results for the provided input
    */
    var getResults = function(val) {
        if (!val || val == '') return [];
        var curItem;
        var results = getProperties(resultList());
        
    	var filtered = _.filter(results, function(item) {
    		if (typeof item === 'undefined') {
    			return false;
    		}
    		
    		if (_.isNumber(item)) {
    			curItem = String(item);
    		} else {
    			curItem = item;
    		}
    		return curItem.toLowerCase().indexOf(val.toLowerCase()) >= 0;	
    	});
    	
    	return filtered.sort();
    }
    
    /*
    * Returns a unique list of values for an array at a specific property
    */
    var getProperties = function(items) {
    	var list = [];
    	if (items.length && _.isArray(items[0][property])) {
    		var arrList = _.pluck(items, property);
    		_.each(arrList, function(arr) { 
    			list = list.concat(arr);	
    		});
    	} else {
    		list = _.pluck(items, property);
    	}
    	
    	return _.uniq(list);
    }
    
    
    this.init(opt);
}


/*
* Name: ZumpColorPicker
* Date: 05/13/2015
*/
var ZumpColorPicker = function(opt) {
    
    //----------------------\
    // Javascript Objects
    //----------------------/
    var zumpColorPicker;
    var baseColors = [];
    var colorIds = {};
    var colorIdCount = 1000;
    
    var rowCount = 7;
    var span = 0.6;
    var height, width;
    var showBottom, showRight;
    var dispTop, dispLeft;
    
    var callback;
    
    //----------------------\
    //JQuery Objects
    //----------------------/
    var $colorPicker;
    var $backdrop;
    var $curSelector;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialization based on options
    */
    this.init = function(opt) {
        
        zumpColorPicker = this;
        
        // Set base color array
        if (isDef(opt.baseColors)) {
            baseColors = opt.baseColors;
        }
        
        // Initialize color picker
        generateColorPicker();
        initListeners();
    }
    
    /*
    * Starts a get color selection which opens the color picker and 
    * sets a callback for a selection event
    */
    this.getColor = function($selector, colorCb) {
        
        // Check if a current selection should be closed
        if (typeof $curSelector !== 'undefined' && $curSelector[0] == $selector[0]) {
            endCurrentSelection();
            return;
        }
        
        // Check if an old selection should be closed and a new one initialized
        if (typeof callback !== 'undefined') {
            if (callback) callback(false);
            hideColorPicker(function() {
                callback = undefined;
                zumpColorPicker.getColor($selector, colorCb);
            });
            return;
        }
        
        // Set selector and callback
        $curSelector = $selector;
        callback = colorCb;
        
        // Caclulate location and show picker
        calculatePosition();
        showColorPicker();
    }
    
    //----------------------\
    // Private Functions
    //----------------------/
    
    /*
    * Sets up document events for color picker objects
    */
    var initListeners = function() {
        
        // Event to handle color click
        $(document).on('click', '.color-container', function(e) {
            e.preventDefault();
            var colorId = $(this).attr('colorid');
            var color = colorIds[colorId];
            
            hideColorPicker();
            
            if (typeof color === 'undefined') {
               if (callback) callback(false);
            } else {
               if (callback) callback(true, color);
            }
            
            callback = undefined;
            $curSelector = undefined;
        });
        
        // Event to handle window resize
        $(window).resize(function() {
           if (typeof $curSelector !== 'undefined') {
               calculatePosition();
               $colorPicker.css({
                    left: showRight ? dispLeft + 'px' : (dispLeft - width) + 'px',
                    top: showBottom ? dispTop + 'px' : (dispTop - height) + 'px'
               });
               $backdrop.css({
                   width: $(window).outerWidth(),
                   height: $(window).outerHeight()
               });
           }
        });
        
        // Event to handle backdrop click
        $(document).on('click', '.color-picker-backdrop', function() {
            endCurrentSelection();
        });
    }
    
    /*
    * Resets the color picker selection
    */
    var endCurrentSelection = function() {
        $curSelector = undefined;
        callback = undefined;
        hideColorPicker();
        if (callback) callback(false);
    }
    
    /*
    * Calculates the location to be used in the color picker show event
    */
    var calculatePosition = function() {
        var offset = $curSelector.offset();
        var sWidth = $curSelector.outerWidth();
        var sHeight = $curSelector.outerHeight();
        
        var okTop = ((offset.top - height) > 0);
        var okBot = ((offset.top + sHeight + height) < $(document).outerHeight());
        var okLeft = ((offset.left - height) > 0);
        var okRight = ((offset.left + sWidth + width) < $(document).outerWidth());
        
        showBottom = !(okTop && !okBot);
        showRight = !(okLeft && !okRight);
        
        dispTop = showBottom ? (offset.top + sHeight) : (offset.top);
        dispLeft = showRight ? (offset.left + sWidth) : (offset.left);
    }
    
    /*
    * Generates the HTML code for the color picker
    */
    var generateColorPicker = function() {
        $backdrop = $('<div class="color-picker-backdrop"></div>');
        $colorPicker = $('<div class="color-picker" style="display: none;"></div>');
        $colorPicker.append('<div class="pick-arrow"></div>');
        
        var $colorTable = $('<div class="color-table"></div>');
        
        // Loop through base colors and calculate shades
        _.each(baseColors, function(baseColor) {
            var $row = $('<div class="pick-row"></div>');
            var hslValue = convertToHSL(baseColor);
            
            for (var i = rowCount; i > 0 ; i--) {
                var factor = i * (span / rowCount) + ((1 - span)/2);
                
                var rgb = convertToRGB(hslValue.h, hslValue.s, factor);
                var color = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
                $row.append('<div class="color-container" style="background-color:' + color + '" colorid="' + colorIdCount + '"></div>');
                colorIds[colorIdCount.toString()] = color;
                colorIdCount++;
            }
            
            $colorTable.append($row);
        });
        
        
        $colorPicker.append($colorTable);
        
        // Setup width and height of color picker
        width = rowCount * 20 + (rowCount - 1) * 5 + 20;
        height = baseColors.length * 20 + (baseColors.length - 1) * 5 + 20;
    }
    
    /*
    * Shows the color picker at the location of the selector
    */
    var showColorPicker = function() {
        var $arrow = $colorPicker.find('.pick-arrow');
    
        var arrowBorderColor = '15px solid rgb(0, 142, 221)';
        var arrowBorderTrans = '15px solid transparent';
        var arrowBorderNone = '0px';
        
        $arrow.css({
            'border-top': showBottom ? arrowBorderColor : arrowBorderNone,
            'border-right': showRight ? arrowBorderTrans : arrowBorderNone,
            'border-bottom': !showBottom ? arrowBorderColor : arrowBorderNone,
            'border-left': !showRight ? arrowBorderTrans : arrowBorderNone,
            'top': showBottom ? '0' : 'auto',
            'right': showRight ? 'auto' : '0',
            'bottom': showBottom ? 'auto' : '0',
            'left': showRight ? '0' : 'auto'
        });
        
        $colorPicker.css({
            'border-radius': (showBottom && showRight ? '0' : '5') + 'px '
                                + (showBottom && !showRight ? '0' : '5') + 'px ' + 
                                + (!showBottom && !showRight ? '0' : '5') + 'px ' + 
                                + (!showBottom && showRight ? '0' : '5') + 'px'
        });
        
        var shadow = (showRight ? '2px' : '-2px') + ' ' + (showBottom ? '2px' : '-2px');
        
        $colorPicker.css({
            top: dispTop + 'px',
            left: dispLeft + 'px',
            width: '0px',
            height: '0px',
            '-webkit-box-shadow': shadow + ' 20px 0px rgba(0, 0, 0, 0.64)',
            '-moz-box-shadow': shadow + ' 20px 0px rgba(0, 0, 0, 0.64)',
            'box-shadow': shadow + ' 20px 0px rgba(0, 0, 0, 0.64)'
        });
        
        $backdrop.css({
           width: $(window).outerWidth(),
           height: $(window).outerHeight()
        });
        
        $('body').append($backdrop);
        $('body').append($colorPicker);
        
        $colorPicker.show(0, function() {
            $colorPicker.animate({
                width: width,
                height: height,
                left: showRight ? dispLeft + 'px' : (dispLeft - width) + 'px',
                top: showBottom ? dispTop + 'px' : (dispTop - height) + 'px'
            }, 100, 'linear');
        });
    }
    
    /*
    * Hides the current color picker
    */
    var hideColorPicker = function(complete) {
        var $colorTable = $colorPicker.find('.color-table');
        
        $colorPicker.animate({
                width: '0px',
                height: '0px',
                left: dispLeft + 'px',
                top: dispTop + 'px'
            }, 100, 'linear', function() {
                $colorPicker.hide(0, function() {
                    $colorPicker.remove();
                    $backdrop.remove();
                    if (complete) complete();
                });
            });
        
    }
    
    /*
    * COnverts an RGB object to an HSL object
    * Derived from: http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
    */
    var convertToHSL = function(rgbColor) {
        var r = rgbColor.r / 255;
        var g = rgbColor.g / 255;
        var b = rgbColor.b / 255;
        var max = Math.max(r, g, b)
        var min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;
        
        if (max == min) {
            h = s = 0;
        } else {
            var span = max - min;
            s = l > 0.5 ? span / (2 - span) : span / (max + min);
            switch(max){
                case r: h = (g - b) / span + (g < b ? 6 : 0); break;
                case g: h = (b - r) / span + 2; break;
                case b: h = (r - g) / span + 4; break;
            }
            h /= 6;
        }
        
        return {h: h, s: s, l: l};
    }
    
    /*
    * COnverts HSL colors to an RGB object
    * Derived from: http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
    */
    var convertToRGB = function (h, s, l){
         var r, g, b;

        if (s == 0) {
            r = g = b = l;
        } else {
            function hue2rgb(p, q, t){
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            }
    
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
    
        return {r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255)};
    }
    
    // Initialize
    this.init(opt);
}