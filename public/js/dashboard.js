// JQuery Objects
var $searchResults;
var $searchBar;
var $sidebar;
var $sidebarFilter;
var $loading;
var $sprite;
var $photoCrop;
var $cropImage;

// UI Objects
var pageSettings = {
	tableMode: true, 
	activePage: undefined, 
	pageCache: {},
	pageNav: [],
	panelNav: []
};
var sidebarSettings = {collapsed: false, locked: false};
var pageEvents = {};
var accountDropzone;
var cropLock;
var serverCallback = {};
var connectTries = 0;
var firstUse = false;
var serverURL = 'http://www.disczump.com';

// Library Instances
var main = this;
var myZumpColorPicker;
var myMessenger;
var myDashboard;
var myEditor;
var mySocial;
var accountValidation;
var myNotifier;

// Global vars
var socket;
var userCache = {};
var discs = [];
var fnLock = false;
var activePage = '#pg-dashboard';
var isFixed = false, isHidden = false;
var userPrefs;
var userAccount;

/*
* On Load
*/
$(document).ready(function(){
   
   	/* Init Variables */
    $searchResults = $('#sidebar-search');
	$sidebarFilter = $('#sidebar-filter');
    $searchBar = $('#search-dashboard');
	$sidebar = $('.sidebar');
	$loading = $('#loading-screen');
	$sprite = $('.loader-sprite');
	
	$.ajaxSetup({ cache: true });
	
	if (window.location.hash.indexOf('#_=_') > 0) {
		if (typeof (window.history.replaceState) == 'function') {
			window.history.replaceState(undefined, undefined, window.location.hash.replace('#_=_', ''));
		} else {
			window.location.hash = window.location.hash.replace('#_=_', '');
		}
	}
   	
   	var $serverParams;
   	if (($serverParams = $('#server-params')).length) {
   		serverURL = $serverParams.attr('serverURL');
   		firstUse = $serverParams.attr('firstUse') == 'true';
   	}
   	
   	setupFrameworkListeners();
    
    /*===================================================================*/
	/*                                                                   */
	/*                    Account Settings Listeners                     */
	/*                                                                   */
	/*===================================================================*/
    
    $('#account-save').click(function() {
    	var $accountForm = $('#account-form')
    	$('.page-alert').remove();
    	
    	if (!accountValidation.doValidate()) {
    		return false;
    	}
    	
    	var changes = accountValidation.getValidChanges();
    	
    	if (_.isEmpty(changes)) return false;
    	
    	var loc = changes['account-zip-code'];
    	
    	putAccount({
    		username : changes['account-username'],
    		firstName : changes['account-first-name'],
    		lastName : changes['account-last-name'],
    		locLat: loc ? loc.locLat : undefined,
    		locLng: loc ? loc.locLng : undefined,
    		pdgaNumber: changes['account-pdga']
    	}, function(success, retData) {
    		if (success) {
    			$('#account-username').val(retData.username);
    			$('#account-first-name').val(retData.firstName);
    			$('#account-last-name').val(retData.lastName);
    			$('#account-zip-code').val(retData.zipcode);
    			$('#account-pdga').val(retData.pdgaNumber);
    			generateSuccess('Account successfully updated.', 'Success', true);
    			
    			userAccount = retData;
    			userCache[userAccount._id] = userAccount;
    			accountValidation.setInitValues({
    				'account-username': retData.username,
	    			'account-first-name': retData.firstName,
	    			'account-last-name': retData.lastName,
	    			'account-zip-code': retData.zipcode,
	    			'account-pdga': retData.pdgaNumber
    			});
    			myNotifier.executeEvent('accountChange');
    		} else {
    			handleError(retData);
    		}
    	});
    });
    
    $('#account-delete').click(function() {
    	var body = {
    		text: 'Are you sure you want to delete your account?'
    	}
    	generateConfirmationModal('Wait!', body, 'Confirm', function() {
			window.location.href = '/account/delete';
		});
    });
    
    /*===================================================================*/
	/*                                                                   */
	/*                       Preferences Listeners                       */
	/*                                                                   */
	/*===================================================================*/
    
    $('#default-settings-save').click(function() {
    	$('.page-alert').remove();
    	
    	var defaultView = $('#default-view').val();
    	var displayCount = $('#display-count').val();
    	var galleryCount = $('#items-per-row').val();
    	var primarySort	= $('#sort-order-primary').val();
    	var primarySortDirection = $('#sort-order-primary-direction').val() == 'Ascending' ? true : false;
    	var secondarySort	= $('#sort-order-secondary').val();
    	var secondarySortDirection = $('#sort-order-secondary-direction').val() == 'Ascending' ? true : false;
    	var enableSecondarySort = $('#enable-secondary-sort').bootstrapSwitch('state');
    	var showTemplatePicker = $('#show-template-picker').bootstrapSwitch('state');
    	var defaultSortArray;
    	
    	if (enableSecondarySort) {
    		if (primarySort == secondarySort) {
	    		generateError('Sort properties must be different.', 'ERROR', false);
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
    		galleryCount : galleryCount,
    		showTemplatePicker: showTemplatePicker
    	}, function(success, retData) {
    		if (success) {
    			generateSuccess('Default settings saved successfully.', 'Success', true);
    			userPrefs = retData;
    		} else {
    			handleError(retData);
    		}
    	});
    });
    
    $('#default-settings-restore').click(function() {
    	var body = {
    		text: 'Are you sure you want to restore your preferences?'
    	};
    	
    	generateConfirmationModal('Warning!', body, 'Restore', function() {
			updatePreferences(undefined, function(success, retData) {
	    		if (success) {
	    			userPrefs = retData;
	    			setUserPrefs();
	    			generateSuccess('Default settings have been restored.', 'Success', true);
	    		} else {
	    			handleError(retData);
	    		}
	    	});
		});
    });
    
    $('#colorize-save').click(function() {
    	$('.page-alert').remove();
    	
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
    			generateSuccess('Colorize settings saved successfully.', 'Success', true);
    			userPrefs = retData;
    			myDashboard.showDiscs(true);
    		} else {
    			handleError(retData);
    		}
    	});
    });
    
    $('#notifications-save').click(function() {
    	$('.page-alert').remove();
    	
    	var messageAlert = $('#enable-message-alerts-email').is(':checked');
    	updatePreferences({
    		notifications : {
    			newMessage : messageAlert
    		}
    	}, function(success, retData) {
    		if (success) {
    			generateSuccess('Notification settings saved successfully.', 'Success', true);
    			userPrefs = retData;
    		} else {
    			handleError(retData);
    		}
    	});
    });
    
    $('#enable-secondary-sort').on('switchChange.bootstrapSwitch', function(event, state) {
		if (state) {
			$('#sort-order-secondary').removeAttr('disabled');
			$('#sort-order-secondary-direction').removeAttr('disabled');
		} else {
			$('#sort-order-secondary').attr('disabled', 'disabled');
			$('#sort-order-secondary-direction').attr('disabled', 'disabled');
		}
	});
	
	$('.colorize-item').click(function() {
		var $this = $(this);
		if ($this.parents('.colorize-container').hasClass('disabled')) return;
		
		myZumpColorPicker.getColor($this, function(success, color) {
			if (success) {
				$this.css('backgroundColor', color);
			} else {
				handleError(color);
			}
		});
	});

    /*===================================================================*/
	/*                                                                   */
	/*                       Start on-load commands                      */
	/*                                                                   */
	/*===================================================================*/
	
	pageEvents['pg-dashboard'] = {
		beforeShow: function(sender) {
			if (myDashboard.isPublicMode() && isDef(sender) && sender[0] == $('li.sidebar-select[pg-select="#pg-dashboard"]')[0]) {
				myDashboard.setDiscList(discs);
			}
		},
		onShow: function(sender) {
			if (myDashboard.isPublicMode()) {
				$('.sidebar-select[pg-select="#pg-dashboard"]').removeClass('active');
				hashDashboardView(myDashboard.CurrentUser());
			} else {
				hashDashboardView();
			}
	
			myDashboard.doResize();
		},
		onHide: function() {
		},
		isShowing: function(sender) {
			if (myDashboard.isPublicMode()) {
				if (isDef(sender) && sender[0] == $('li.sidebar-select[pg-select="#pg-dashboard"]')[0]) {
					myDashboard.setDiscList(discs);
					hashDashboardView();
				} else {
					$('.sidebar-select[pg-select="#pg-dashboard"]').removeClass('active');
					hashDashboardView(myDashboard.CurrentUser());
				}
			}
			
			myDashboard.doResize();
		}
	}
	
	pageEvents['pg-disc-view'] = {
		beforeShow: function() {
		},
		onShow: function() {
			hashDiscView(myDashboard.CurrentDisc()._id);
		},
		onHide: function() {
		},
		isShowing: function() {
		}
	}
	
	pageEvents['pg-profile'] = {
		beforeShow: function() {
		},
		onShow: function() {
   			hashProfileView(mySocial.CurrentUser());
   			mySocial.onShow();
		},
		onHide: function() {
			mySocial.onHide();
		},
		isShowing: function() {
   			hashProfileView(mySocial.CurrentUser());
		}
	}
	
	pageEvents['pg-inbox'] = {
		beforeShow: function() {
		},
		onShow: function() {
			myMessenger.initPage();
   			hashMessageView(myMessenger.CurrentThread());
		},
		onHide: function() {
			myMessenger.threadLeft();
		},
		isShowing: function() {
   			hashMessageView(myMessenger.CurrentThread());
		}
	}
	
	pageEvents['pg-settings'] = {
		beforeShow: function() {
		    initSettings();
		},
		onShow: function() {
			updateHash({view: 'settings'});
			accountValidation.triggerResize();
		},
		onHide: function() {
		},
		isShowing: function() {
			
		}
	}
	
	pageEvents['pg-preferences'] = {
		beforeShow: function() {
		    setUserPrefs();
		},
		onShow: function() {
			updateHash({view: 'preferences'});
		},
		onHide: function() {
		},
		isShowing: function() {
			
		}
	}
	
	pageEvents['pg-modify-disc'] = {
		beforeShow: function() {
			myEditor.beforeShow();
		},
		onShow: function() {
			myEditor.onShow();
			clearHash();
		},
		onHide: function() {
			if (myEditor.ModifyType() == "Edit") {
				myEditor.setModifyType("Add");
				myEditor.setDiscId(undefined);
				myEditor.clearForm();
			}
		},
		isShowing: function() {
			if (myEditor.ModifyType() == "Edit") {
				myEditor.clearForm();
				myEditor.setModifyType("Add");
				myEditor.setDiscId(undefined);
			}
			myEditor.beforeShow();
			myEditor.onShow();
		},
		canLeave: function() {
			return !myEditor.isProcessing();
		}
	}
    
    /* Initial Commands */
   	$('.page').hide();
    resizeSidebar();
    
    getSocketSession();
    
    getAccount(function(success, account) {
    	if (success) {
    		userAccount = account;
    		getUserPreferences(function(success, prefs) {
		    	if (success) {
		    		userPrefs = prefs;
		    		initializeTooltips();
		    		zumpLibraryInit();
    				setLoading(true);
		    		initializePage(function() {
		    			getAllDiscs(function(success, discsFromServer){
							if (success) {
								discs = discsFromServer;
	    						setLoading(false);
								myDashboard.initDiscList(discs);
							} else {
								handleError(discsFromServer);
							}
						});
		    		});
		     	} else {
		     		handleError(prefs);
		     	}
		    });
    	} else {
    		handleError(account);
    	}	
    });
    
    
   	if (isInternetExplorer()) {
   		generateInfo('This browser is not yet supported by disc|zump and therefore, certain features may not work as designed. Please see our <FAQ> for more information.', 'Unsupported Browser', false, ['/faq#faq-browsers']);
   	} else {
    	$('.page-alert').slideDown(300);
   	}
    
});

function openPopup(url, name) {
	var winTop = ($(window).height() / 2) - (500 / 2);
	var winLeft = ($(window).width() / 2) - (800 / 2);
	
	if (serverCallback[name]) {
		serverCallback[name]();
	}
	
	var popupWindow = window.open(url + '?popup=true', name, 'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + 800 + ',height=' + 500);
	
	serverCallback[name] = function() {
		if (popupWindow) popupWindow.close();
	}
	
}

function setupFrameworkListeners() {
	$('#facebook-link').click(function() {
		var resetWindow = openPopup('/account/link', 'FacebookLink');
	});
	
	$('#account-change-pwd').click(function() {
		var resetWindow = openPopup('/reset', 'ResetPassword');
		
		$(resetWindow).load(function() {
			$(resetWindow.document).find('#user-input-form').prepend('<input type="hidden" name="popup" value="true"></input>');	
		});
	});
	
	$(document).on('click', 'div.checkbox', function(e){
		var $cb = $(this).find('input[type="checkbox"]');
		if (e.target == $cb.get(0)) {
			return;
		}
		
		var val = $cb.is(':checked');
		if (val) {
			$cb.prop('checked', false).trigger('change');
		} else {
			$cb.prop('checked', true).trigger('change');
		}
	});
	
   	$('#menu-tutorial').click(function(e) {
   	    e.stopImmediatePropagation();
   	    new ZumpTutorial().showTutorial();
   	    return false;
   	});
   	
   	$('#menu-feedback').click(function(e) {
   		e.stopImmediatePropagation();
   		generateFeedbackModal('Feedback Form', 'Submit', function() {
   			if ($('#feedback-textarea').val().length < 1) {
   				return generateError('You must enter information into the text box before submitting the form.', 'ERROR', false);
   			} else {
   				$('.page-alert').remove();
   				var text = $('#feedback-textarea').val();
   				postFeedback(text, function(success, retData) {
   					if (success) {
   						$('.custom-modal').modal('hide');
   						generateInfo('Your feedback has been successfully submitted.', 'Thanks', true);
   					} else {
   						handleError(retData);
   					}
   				});
   			}
   		});
   		return true;
   	});
   	
	$('.sidebar-nav-select').click(function(e) {
		e.stopPropagation();
    	var $this = $(this);
    	var nav = $this.attr('nav-select');
       	changeSidebar(nav);
	});
	
   	$('.nav-sidebar li.sidebar-select.nav').click(function(e){
    	e.stopPropagation();
       	var $this = $(this);
       	var nav = $this.attr('pg-select');
       	triggerPageChange($(this), nav);
      	return false;
   	});
   	
   	$('.dz-page-back').click(function(e) {
   		e.stopPropagation();
       	pageBack();
      	return false;
   	});
   	
   	$(window).on('resize', function() {
        resizeSidebar();
   	});
     
    $(window).click(function(e) {
		$.each($('.hide-on-close'), function(index) {
			if ($(this).is(':visible')) {
				$(this).hide();
			}	
     	});
     	$.each($('.remove-on-close'), function(index) {
     		var domElem = $(this).get(0);
     		if (domElem == e.target || $.contains(domElem, e.target)) {
     			return;
     		}
     		
     		$(this).remove();
     	});
    });
  
	$(document).on('mouseenter', '.hover-active', function() {
		$(this).addClass('active');
	}).on('mouseleave', '.hover-active', function() {
		$(this).removeClass('active');
	});
}

/*
*
*/
function initSocket(sessionId) {
	socket = io.connect(serverURL, {
		'forceNew': true,
		reconnection: false
	});
	
	socket.on('connect', function() {
		socket.emit('initialize', {sessionId: sessionId});
	}).on('notification', function (notification) {
	    parseNotification(notification);
	}).on('disconnect', function() {
		generateError('Disconnected from disc|zump. Reconnecting...', 'Connection Error', true);
		setTimeout(getSocketSession, 1000);
	}).on('connect_error', function() {
		connectTries++;
		if (connectTries < 10) {
			setTimeout(getSocketSession, 1000);
		}
	});
}

function getSocketSession() {
	getSession(function(success, data) {
    	if (success) {
    		initSocket(data.sessionId);
    	} else {
    		generateError('Unable to connect to server. Please <refresh> your page.', 'Connection Error', false, ['/dashboard']);
    	}
    });
}

function parseNotification(notification) {
	if (notification.type == 'MessageNotification') {
		myMessenger.handleMessage(notification.data);
	// } else if (notification.type == 'ThreadUpdateNotification') {
	// 	myMessenger.handleThreadUpdate(notification.data);
	} else if (notification.type == 'InfoNotification') {
		generateInfo(notification.data, 'disc|zump Message', true);
	} else if (notification.type == 'CallbackNotification') {
		parseCallback(notification.data);
	}
}

function parseCallback(callbackNotification) {
	var cbName = callbackNotification.callbackName;
	var cbMessage = callbackNotification.message;
	
	if (serverCallback[cbName]) {
		serverCallback[cbName]();
		delete serverCallback[cbName];
	}
	
	if (cbName == 'ResetPassword') {
		generateInfo(cbMessage, 'Password Update', true);
	} else if (cbName == 'FacebookLink') {
		getAccount(function(success, account) {
			if (success) {
				userAccount = account;
				var image = getUserImage(userAccount);
				$('#account-image').find('img').attr('src', image);
				$('#nav-account').find('img').attr('src', image);
				fbLinked(userAccount.linked);
				generateInfo(cbMessage, 'Facebook Link Update', true);
			} else {
				handleError(account);
			}
		});
	}
}

function fbLinked(isLinked) {
	var fbImageContainer = $('#profile-image-fb-container');
	if (isLinked) {
		$('#facebook-link-status').text('Linked');
		fbImageContainer.closest('.account-image').removeClass('no-fb');
		fbImageContainer.append('<div class="profile-image-wrapper center">' +
									'<div class="profile-image upload">' +
						                '<img src="' + userAccount.facebookImage + '" />' +
                                    '</div>' +
                                '</div>' +
                            	'<button id="profile-image-fb-submit" class="btn btn-primary">Use Facebook Photo</button>');
	} else {
		$('#facebook-link-status').text('Not Linked');
		fbImageContainer.closest('.account-image').addClass('no-fb');
		fbImageContainer.empty();
	}
}

function resizeLoader() {
	$loading.css({
		width: $(document).width() - $('.sidebar').outerWidth(),
		left: $('.sidebar').outerWidth(),
		height: $(document).height()
	});
	
	$sprite.css({
		left: ($loading.width() - $sprite.width()) / 2,
		top: $(document).scrollTop() + ($(window).height() - $sprite.height()) / 2
	});
}

var loadId = 0;

function setLoading(visible) {
	if (visible) {
		loadId++;
		$('body').css('overflow', 'hidden');
		$loading.show();
		resizeLoader();
		$(window).on('resize', resizeLoader);
	} else {
		
		loadId--;
		if (loadId == 0) {
			$('body').css('overflow', 'auto');
			$loading.hide();
			$(window).off('resize', resizeLoader);
		}
	}
	
	return loadId;
}

function changeSidebar(nav) {
	if (nav == pageSettings.curPanel) return;
	
	toggleSidebar(nav);
}

function toggleSidebar(nav, complete) {
	var $nav = $(nav);
   	var $curNav = $('.nav-sidebar:visible');
   	
   	if ($nav.length) {
   		if ($nav.is(':visible') && pageSettings.panelNav.length > 0) {
   			var lastPanel = pageSettings.panelNav.pop();
	   		$nav = $(lastPanel);
	   	} else {
	   		pageSettings.panelNav = _.without(pageSettings.panelNav, '#' + $curNav.attr('id'));
	   		pageSettings.panelNav.push('#' + $curNav.attr('id'));
	   	}
	   	
	   	pageSettings.curPanel = '#' + $nav.attr('id');
	   	pageSettings.panelNav = _.without(pageSettings.panelNav, pageSettings.curPanel);
	   	
   		$curNav.fadeOut(0, function() {
   			$('.sidebar-nav-indicator').removeClass('active');
			$('.sidebar-nav-indicator[nav-select="#' + $nav.attr('id') + '"]').addClass('active');
   			$nav.fadeIn(0, function() {
   				resizeSidebarResults();
   				if (complete) complete();
   			});
   		});
   	}
}

function pageBack() {
	if (pageSettings.pageNav.length) {
		var page = pageSettings.pageNav.pop();
		triggerPageChange('dz-back', page);
	} else {
		changePage('#pg-dashboard');
	}
}

function changePage(page, callback) {
	triggerPageChange(undefined, page, callback);
}

function hideAllPages(callback) {
	triggerPageChange('dz-hide-all', callback);
}

/*
* Changes the current dashboard page
*/
function triggerPageChange(sender, page, callback) {
   	var $page = $(page);
   	var $curPage = $('.page:visible');
   	var $navItem = $('.nav-sidebar li.sidebar-select[pg-select="' + page + '"]');
   	
   	if (!$page.length && sender != 'dz-hide-all') {
   		return;
   	}
   	
   	if (!isDef(pageSettings.pageCache[$page.attr('id')])) {
   		pageSettings.pageCache[$page.attr('id')] = {};
   	}
   	
   	if (!$curPage.length) {
   		setLoading(true);
   		if (isDef(pageEvents[$page.attr('id')])) {
        	pageEvents[$page.attr('id')].beforeShow(sender);
       	}
   		setLoading(false);
   		
        $page.fadeIn(100, function() {
			if ($navItem.length) {
			   	$navItem.addClass('active');
			}
			
            if (isDef(pageEvents[$page.attr('id')])) {
            	pageEvents[$page.attr('id')].onShow(sender);
           	}
           	
           	pageSettings.activePage = page;
           	if (callback) callback();
        });
        return;
   	}
   
   	if ($page.is(':visible')) {
   		if ($navItem.length) {
        	$navItem.addClass('active');
		}
   		pageEvents[$page.attr('id')].isShowing(sender);
       	if (callback) callback();
   	} else {
   		var curPageEvents = pageEvents[$curPage.attr('id')];
   		
   		if (curPageEvents && curPageEvents.canLeave && !curPageEvents.canLeave()) {
   			return;
   		}
   		
   		pageSettings.pageCache[$curPage.attr('id')].scrollPos = $(document).scrollTop();
   		
   		if (sender != 'dz-back') {
	       	pageSettings.pageNav = _.reject(pageSettings.pageNav, function(page) {
	       		return page == '#' + $curPage.attr('id');
	       	});
	   		pageSettings.pageNav.push('#' + $curPage.attr('id'));
   		}
   		
   		$curPage.fadeOut(100, function() {
   			
           	if (isDef(curPageEvents)) {
            	curPageEvents.onHide();
           	}
           	
           	$('.nav-sidebar li.sidebar-select').removeClass('active');
           	
           	
   			setLoading(true);
           	if (isDef(pageEvents[$page.attr('id')])) {
        		pageEvents[$page.attr('id')].beforeShow(sender);
           	}
   			setLoading(false);
   			
            $page.fadeIn(100, function() {
                if ($navItem.length) {
                	$navItem.addClass('active');
				}
				
                if (isDef(pageEvents[$page.attr('id')])) {
            		pageEvents[$page.attr('id')].onShow(sender);
               	}
               	
               	var pageCache = pageSettings.pageCache[$page.attr('id')];
   				if (isDef(pageCache.scrollPos)) {
   					$("html, body").scrollTop(pageCache.scrollPos);
   				} else {
   					$("html, body").scrollTop(0);
   				}
               	
	           	pageSettings.activePage = page;
	           	if (callback) callback();
            });
       	});
   	}
}

/*
* Initialize based on search params
*/
function initializePage(callback) {
    var params = getSearchParameters();
    
    if ((isDef(params.firstUse) && params.firstUse == 'true') || firstUse) {
    	 new ZumpTutorial().showTutorial();
		 return callback();
    }
    
    if (isDef(params.view)) {
    	if (params.view == 'disc') {
    		initViewDisc(params, callback);
    	} else if (params.view == 'profile') {
    		initViewProfile(params, callback);
    	} else if (params.view == 'dashboard') {
    		initViewDashboard(params, callback);
    	} else if (params.view == 'inbox') {
    		initViewInbox(params, callback);
    	} else {
    		changePage('#pg-' + params.view);
    		callback();
    	}
    } else {
    	changePage('#pg-dashboard');
    	callback();
    }
}

function initViewProfile(params, callback) {
	if (isDef(params.user_id)) {
		mySocial.showProfile(params.user_id, function(err) {
			changePage('#pg-dashboard');
			generateError(err, 'Navigation Error', true);
		});
	} else {
    	changePage('#pg-dashboard');
    }
    callback();
}

function initViewDisc(params, callback) {
	if (isDef(params.disc_id)) {
		myDashboard.showPublicDisc(params.disc_id, function(err) {
			changePage('#pg-dashboard');
			generateError(err, 'Navigation Error', true);
		});
	} else {
    	changePage('#pg-dashboard');
    }
    callback();
}

function initViewInbox(params, callback) {
	if (isDef(params.thread_id)) {
		myMessenger.openThreadById(params.thread_id, function(err) {
			changePage('#pg-dashboard');
			generateError(err, 'Navigation Error', true);
		});
	} else {
    	changePage('#pg-dashboard');
    }
    callback();
}

function initViewDashboard(params, callback) {
	if (isDef(params.user_id) && params.user_id != userAccount._id) {
		setLoading(true);
		getUser(params.user_id, function(success, user) {
			if (success) {
				getAllPublicDiscsByUser(user._id, function(success, discs) {
					if (success) {
						setLoading(false);
						myDashboard.setDiscList(discs, user);	
						changePage('#pg-dashboard');
						callback();
					} else {
						handleError(discs);
					}
				});
			} else {
				changePage('#pg-dashboard');
				generateError('Unknown user identifier.', 'Navigation Error', true);
				setLoading(false);
				callback();
			}
		});
	} else {
    	changePage('#pg-dashboard');
    	callback();
    }
}

/*===================================================================*/
/*                                                                   */
/*              Account Settings & Preferences Functions             */
/*                                                                   */
/*===================================================================*/

var $profileDropzone;
var $placeholderText;
var $placeholder;

function resetUserImage() {
	if (userAccount.image) {
		$('#account-image').find('img').attr('src', userAccount.image);
		$('#nav-account').find('img').attr('src', userAccount.image);
	} else {
		$('#account-image').find('img').attr('src', '').hide();
		$('#nav-account').find('img').attr('src', '').hide();
	}
}

function initSettings() {
	if (!isDef(accountDropzone)) {
		
		$profileDropzone = $('#upload-profile-image');
		$placeholderText = $('.upload-placeholder-text');
		$placeholder = $('#image-upload-placeholder');
		
		$('#profile-image-local-clear').click(function() {
			accountDropzone.removeAllFiles();
			$placeholder.show();
			$('#profile-image-local-submit').attr('disabled', 'disabled');
		});
		
		$(document).on('click', '#profile-image-fb-submit', function() {
			var body = {
				text: 'This will remove your current account image, if one exists. Continue?'
			};
			generateConfirmationModal('Confirm Changes', body, 'Confirm', function() {
				deleteAccountImage(function(success, retData) {
					if (success) {
						userAccount = retData;
						userCache[userAccount._id] = userAccount;
						resetUserImage();
						generateSuccess('Account image successfully updated.', 'Update Successful', true);
						myNotifier.executeEvent('accountChange');
					} else {
						handleError(retData);
					}
				});
			});
		});
		
		$('#profile-image-local-submit').click(function() {
			if (accountDropzone && accountDropzone.getAcceptedFiles().length > 0) {
				accountDropzone.processQueue();
			}
		});
		
		var template = '<div style="position: relative"><img data-dz-thumbnail /><div class="image-progress" data-dz-uploadprogress=""></div></div>'
		
		accountDropzone = new Dropzone('#upload-profile-image', {
			url: '/api/account/image',
			method: "POST",
			thumbnailWidth: 150,
			thumbnailHeight: 150,
			parallelUploads: 1,
			maxFiles: 1,
			paramName: 'accountImage',
			previewTemplate: template,
			acceptedFiles: "image/*",
			autoProcessQueue: false,
			clickable: '#upload-profile-overlay',
			accept: function(file, done) {
				done();
			},
			init: function() {
				this.on("dragenter", function() {
					$profileDropzone.addClass('dragging');
					$placeholderText.text('drop|here');
				}).on("dragleave", function() {
					$profileDropzone.removeClass('dragging');
					$placeholderText.text('Click or drag image here');
				}).on("drop", function() {
					$profileDropzone.removeClass('dragging');
					$placeholderText.text('Click or drag image here');
				}).on('addedfile', function(file) {
					if (cropLock) {
				 		accountDropzone.removeFile(file);
				 		return;
				 	}
			        if (file.cropped) {
			        	$placeholder.hide();
						if (this.files[1] != null){
							this.removeFile(this.files[0]);
						}
						$('#profile-image-local-submit').removeAttr('disabled');
			            return;
			        }
			        
					$('body').css('overflow', 'hidden');
			        
			        if (file.width < 200) {
			            return;
			        }
			        
			        cropLock = true;
			        
			        var cachedFilename = file.name;
			        accountDropzone.removeFile(file);
			        
			        var reader = new FileReader();
			        reader.onloadend = function() {
			        	showPhotoCrop(file.name, reader.result, function(newFile) {
							cropLock = false;
			        		if (newFile) accountDropzone.addFile(newFile);
			        	});
	        		};
			        
			        reader.readAsDataURL(file);
				}).on("success", function(file, response) {
					if (!isDef(response.error)) {
						userAccount = response;
						userCache[userAccount._id] = userAccount;
						resetUserImage();
						$('#profile-image-local-clear').trigger('click');
						generateSuccess('Account image successfully updated', 'Update Successful', true);
    					myNotifier.executeEvent('accountChange');
					} else {
						handleError(response);
					}
				});
			}
		});
	}
}

function updateColorize(event, state) {
	if (!state) {
		$('.colorize-container').addClass('disabled');
	} else {
		$('.colorize-container').removeClass('disabled');
		
	}
}

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
		$('#sort-order-secondary').attr('disabled', 'disabled');
		$('#sort-order-secondary-direction').attr('disabled', 'disabled');
		$('#enable-secondary-sort').bootstrapSwitch('state', false);
		if (userPrefs.defaultSort.length == 2) {
			$('#enable-secondary-sort').bootstrapSwitch('state', true);
			$('#sort-order-secondary').removeAttr('disabled');
			$('#sort-order-secondary-direction').removeAttr('disabled');
			$('#sort-order-secondary').val(userPrefs.defaultSort[1].property);
			userPrefs.defaultSort[1].sortAsc ? $('#sort-order-secondary-direction').val("Ascending") : $('#sort-order-secondary-direction').val("Descending");
		}
	}
	$('#colorize-visibility').bootstrapSwitch('state', userPrefs.colorizeVisibility).off('switchChange.bootstrapSwitch').on('switchChange.bootstrapSwitch', updateColorize);
	updateColorize(null, userPrefs.colorizeVisibility);
	
	$('#show-template-picker').bootstrapSwitch('state', userPrefs.showTemplatePicker);
	
	if (isDef(userPrefs.colorize)) {
		$('#colorize-distance-driver').css('background-color', userPrefs.colorize.distance);
		$('#colorize-fairway-driver').css('background-color', userPrefs.colorize.fairway);
		$('#colorize-mid-range').css('background-color', userPrefs.colorize.mid);
		$('#colorize-putt-approach').css('background-color', userPrefs.colorize.putter);
		$('#colorize-mini').css('background-color', userPrefs.colorize.mini);
	}
	
	//set notification prefs
	if (isDef(userPrefs.notifications)) {
		userPrefs.notifications.newMessage ? $('#enable-message-alerts-email').attr('checked', 'checked') : $('#enable-message-alerts-email').removeAttr('checked');
	}
}

function initializeTooltips() {
	var ttDefaultView = generateTooltipOptions('top', 'hover', 'Select a default view to show every time your disc|zump account loads.', '200px');
	var ttDisplayCount = generateTooltipOptions('top', 'hover', 'Select a default number of discs to show per page when your disc|zump account loads the dashboard view.', '200px');
	var ttItemsPerRow = generateTooltipOptions('top', 'hover', 'Select a default number of discs to show per row when disc|zump loads the gallery view.', '200px');
	var ttPrimarySort = generateTooltipOptions('top', 'hover', 'Select a default primary sort property. This applies to any view.', '200px');
	var ttSecondarySort = generateTooltipOptions('top', 'hover', 'Select a default secondary sort property. This applies to any view and will sort within your primary property.', '200px');
	var ttEnableSecondarySort = generateTooltipOptions('top', 'hover', 'This switch toggles the secondary sort property.', '200px');
	var ttTemplatePicker = generateTooltipOptions('top', 'hover', 'Select whether the template auto-fill dialog is shown when a disc name is selected.', '200px');
	var ttColorizeVisibility = generateTooltipOptions('top', 'hover', 'Show or hide the color strips seen in the dashboard view.', '200px');
	var ttAccountFirstName = generateTooltipOptions('top', 'hover', 'Enter your first name to help people find you. (Cannot contain spaces)', '200px');
	var ttAccountLastName = generateTooltipOptions('top', 'hover', 'Enter your last name to help people find you. (Cannot contain spaces)', '200px');
	var ttAccountUsername = generateTooltipOptions('top', 'hover', 'This is how your name is displayed publicly. Username must be 6-15 characters and can only consist of letters, numbers, and underscore.', '200px');
	var ttAccountZipCode = generateTooltipOptions('top', 'hover', 'Enter 5 digit zip code.', '200px');
	var ttGraphBy = generateTooltipOptions('right', 'hover', 'This property will be used to generate the data in the graph.', '200px');
	var ttGraphType = generateTooltipOptions('right', 'hover', 'Select the type of graph to generate.', '200px');
	var ttNotifyNewMessages = generateTooltipOptions('right', 'hover', 'Use this option to be alerted when you receive a new message.', '200px');
	
	$('i[tt="default-view"]').tooltip(ttDefaultView);
	$('i[tt="display-count"]').tooltip(ttDisplayCount);
	$('i[tt="items-per-row"]').tooltip(ttItemsPerRow);
	$('i[tt="primary-sort"]').tooltip(ttPrimarySort);
	$('i[tt="secondary-sort"]').tooltip(ttSecondarySort);
	$('i[tt="enable-secondary-sort"]').tooltip(ttEnableSecondarySort);
	$('i[tt="show-template-picker"]').tooltip(ttTemplatePicker);
	$('i[tt="colorize-visibility"]').tooltip(ttColorizeVisibility);
	$('i[tt="account-first-name"]').tooltip(ttAccountFirstName);
	$('i[tt="account-last-name"]').tooltip(ttAccountLastName);
	$('i[tt="account-username"]').tooltip(ttAccountUsername);
	$('i[tt="account-zip-code"]').tooltip(ttAccountZipCode);
	$('i[tt="graph-base"]').tooltip(ttGraphBy);
	$('i[tt="graph-type"]').tooltip(ttGraphType);
	$('i[tt="notify-new-messages"]').tooltip(ttNotifyNewMessages);
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
	
	myNotifier = new ZumpNotifier();
	myNotifier.addListener('discCreated', main, function(event, disc) {
		discs.push(disc);
		myDashboard.setDiscList(discs);
	}).addListener('discUpdated', main, function(event, disc) {
		var index = discs.indexOf(getDisc(disc._id));
		discs[index] = disc;
		myDashboard.updateSingleDisc(disc);
	}).addListener('discDeleted', main, function(event, disc) {
		discs = _.filter(discs, function(discItem){
			return discItem._id != disc._id;
		});
		myDashboard.setDiscList(discs);
	});
	
	
	mySocial = new ZumpSocial();
	
	myDashboard = new ZumpDashboard({
		defaultView: userPrefs.defaultView,
		searchToggle: '#inventory-search-toggle',
		searchPanel: '#sidebar-search',
		searchResults: '#search-results-container',
		inventory: {
			inventoryHeader: '#inventory-header',
			inventoryContainer: '.disc-inventory-container'
		},
		paginate: {
			pageForward: '#page-forward',
			pageBack: '#page-back',
			paginateCount: '#paginate-display-count',
			displayCount: userPrefs.displayCount,
		},
		sort: {
			dynamicHeader: '#disc-inventory-header-dynamic',
			sortToggle: '#results-header-sort',
	    	sortContainer: '.current-sort-container',
	    	addSortTrigger: '.add-sort-container',
	    	defaultSort: userPrefs.defaultSort
		},
		filter: {
			filterResults: '#filter-results',
			filterCount: '#filter-count',
			filterToggle: '#dashboard-filter-toggle',
			currentFilterContainer: '#current-filter-container',
	    	filterContainer: '#filter-container'
		},
		gallery: {
			galleryContainer: '#gallery-container',
			galleryCount: userPrefs.galleryCount,
			gallerySlider: '#gallery-slider',
			galleryMenu: '#gallery-menu',
			galleryRowCount: '#gallery-row-count',
		},
		statistics: {
			statPlot: '#statistics-plot',
			renderGraph: '#render-graph'
		}
	});
	
	myEditor = new ZumpEditor();
    
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
	
	myMessenger = new ZumpMessenger({
		sidebarInbox: '#sidebar-inbox',
		threadTitle: '#thread-title',
		inboxList: '#inbox-list',
		addMessageContainer: '#add-message-container',
		messageContainer: '#message-container',
		loadMessages: '#load-messages',
		messageCount: '#message-count',
		sendMessageBtn: '#send-message-btn',
		newMessage: '#new-message',
		sendOnEnter: '#message-on-enter',
		searchInbox: '#search-inbox',
		activateThread: function() {
			changePage('#pg-inbox', function() {
				setLoading(false);
			});
		},
		deleteThread: '#delete-thread',
		sidebarLoading: '.sidebar-loading'
	});
	
	accountValidation = new ZumpValidate({
    	items: [
    		{id: 'account-username', optional: true, initVal: userAccount.username, type: 'username', output: 'account-username-feedback', min: 6, max: 15},
            {id: 'account-first-name', optional: true, initVal: userAccount.firstName, type: 'function', fn: function(val) { return val.length == 0 ? undefined : val.split(' ').length < 3 }},
            {id: 'account-last-name',  optional: true, initVal: userAccount.lastName, type: 'function', fn: function(val) { return val.length == 0 ? undefined : val.split(' ').length < 3 }},
            {id: 'account-zip-code', optional: true, initVal: userAccount.zipcode, type: 'zipcode', output: 'account-city-state'},
            {id: 'account-pdga', optional: true, initVal: userAccount.pdgaNumber, type:'function', fn: function(val) { return val.length == 0 ? undefined : /^[0-9]*$/.test(val) }, max: 6}
    	],
        feedbackOnInit: false
    });
}

/*===================================================================*/
/*                                                                   */
/*                          Dashboard                                */
/*                                                                   */
/*===================================================================*/

function resizeSidebar() {
	
	if ($sidebar.width() < 161) {
		$sidebar.addClass('collapsed');
		sidebarSettings.collapsed = true;
		
		$sidebarFilter.on('mouseenter', function() {
			sidebarControl('open');
		}).on('mouseleave', function() {
       		sidebarControl('close');
       	});
       	
       	$searchResults.on('mouseenter', function() {
			sidebarControl('open');
		}).on('mouseleave', function() {
       		sidebarControl('close');
       	});
       	
       	$searchBar.on('focusin', function() {
			expandSidebar();
			sidebarSettings.locked = true;
		}).on('focusout', function() {
       		collapseSidebar();
			sidebarSettings.locked = false;
       	});
	} else {
		$sidebar.removeClass('collapsed');
		sidebarSettings.collapsed = false;
		sidebarSettings.locked = false;
		$sidebar.css('width', '');
		$sidebarFilter.off('mouseenter').off('mouseleave');
       	$searchResults.off('mouseenter').off('mouseleave');
       	$searchBar.off('focusin').off('focusout');
	}
	
	resizeSidebarResults();
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
	$sidebar.stop().animate({width:'250px'}, 300);
}

function collapseSidebar() {
	$sidebar.stop().animate({width:'161px'}, 300, function() {
		$sidebar.css('width', '');
	});
}

/*
* Generates a modal popup for users to submit feedback
*/
function generateFeedbackModal(title, btnText, submitFn) {
	var header = '<div class="modal-title">' + title + '</div>';
          
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
* Generates a modal popup to help users understand the Add/Edit disc page
*/
function generateHelpModal(title, bodyHTML) {
	var header = '<div class="modal-title"><span><i class="fa fa-info-circle fa-tools"></i></span>' + title + '</div>';
          
	var body = '<div class="popup-body">' +
					'<table>' +
						'<tr class="table-header-row">' +
							'<th>Field</th>' +
							'<th>Description</th>' +
							'<th>Example</th>' +
						'</tr>' +
						bodyHTML +
					'</table>' +
				'</div>';
			
	var footer = '<button type="button" class="btn btn-default" fn-title="close">Close</button>';
		
	var fns = [
				{
					name: 'close',
					function: function($btn, $inner, done) {
						done();
					}
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
* Generates text for general section of help modal
*/
function getGeneralText() {
	
	return 	'<tr>' +
				'<td class="help-label">Brand</td>' +
				'<td class="help-text">Enter the brand of the disc. (This is a required field)</td>' +
				'<td class="help-ex">Innova</td>' +
			'</tr>' +
			'<tr>' +
				'<td class="help-label">Name</td>' +
				'<td class="help-text">Enter the name/mold of the disc. (This is a required field)</td>' +
				'<td class="help-ex">Destroyer</td>' +
			'</tr>' +
			'<tr>' +
				'<td class="help-label">Type</td>' +
				'<td class="help-text">Select the type of the disc.</td>' +
				'<td class="help-ex">Distance Driver</td>' +
			'</tr>' +
			'<tr>' +
				'<td class="help-label">Material</td>' +
				'<td class="help-text">Enter the material of the disc. Most brands have at least 3 distinct material types.</td>' +
				'<td class="help-ex">Champion</td>' +
			'</tr>' +
			'<tr>' +
				'<td class="help-label">Weight</td>' +
				'<td class="help-text">Enter the weight of the disc in grams. The weight is frequently printed or written on the underside of the flight plate. ' +
					'<b>NOTE: </b>This field only accepts integers and weights typically range from 150 to 180.</td>' +
				'<td class="help-ex">172</td>' +
			'</tr>' +
			'<tr>' +
				'<td class="help-label">Color</td>' +
				'<td class="help-text">Enter the color of the disc.</td>' +
				'<td class="help-ex">Orange</td>' +
			'</tr>';
}

/*
* Generates text for advanced section of help modal
*/
function getAdvancedText() {
	return 	'<tr>' +
				'<td class="help-label">Speed</td>' +
				'<td class="help-text">Enter the speed of the disc. Speed is the first of four flight ' +
					'numbers, and it refers to the speed at which the disc must be thrown to achieve the designed flight path. ' +
					'<b>NOTE: </b>This field only accepts integers and speed values typically range from 1 to 15.</td>' +
				'<td class="help-ex">12</td>' +
			'</tr>' +
			'<tr>' +
				'<td class="help-label">Glide</td>' +
				'<td class="help-text">Enter the glide of the disc. Glide is the second of four flight ' +
					'numbers, and it refers to the disc\'s ability to stay afloat during it\'s flight. ' +
					'<b>NOTE: </b>This field only accepts integers and glide values typically range from 1 to 7.</td>' +
				'<td class="help-ex">5</td>' +
			'</tr>' +
			'<tr>' +
				'<td class="help-label">Turn</td>' +
				'<td class="help-text">Enter the turn of the disc. Turn is the third of four flight ' +
					'numbers, and it refers to the disc\'s resistance to turning during the high speed portion of it\'s flight. ' +
					'<b>NOTE: </b>This field only accepts integers and turn values typically range from -5 to 1.</td>' +
				'<td class="help-ex">-1</td>' +
			'</tr>' +
			'<tr>' +
				'<td class="help-label">Fade</td>' +
				'<td class="help-text">Enter the fade of the disc. Fade is the fourth of four flight ' +
					'numbers, and it refers to the disc\'s resistance to turning during the low speed portion of it\'s flight. ' +
					'<b>NOTE: </b>This field only accepts integers and fade values typically range from 0 to 6.</td>' +
				'<td class="help-ex">3</td>' +
			'</tr>' +
			'<tr>' +
				'<td class="help-label">Tags</td>' +
				'<td class="help-text">Enter tags associated with this disc. Use tags to group discs outside of inherent traits such as brand, material, color, etc. ' +
					'Tags are great ways to associate discs with specific collections, bags, or tournaments. They are completely customizable, and examples include ' +
					'"Thrower", "CFR", "Glow", "xxx Collection", "xxx Bag", etc. ' +
					'<b>NOTE: </b>A disc can have multiple tags, and a tag can be associated with multiple discs.</td>' +
				'<td class="help-ex">Thrower<br>Glow Bag<br>Zone Collection</td>' +
			'</tr>' +
			'<tr>' +
				'<td class="help-label">Notes</td>' +
				'<td class="help-text">Use the notes area to store detailed comments related to this disc only. Notes are completely customizable and examples may ' +
					'include "Found on hole 7 at...", "Won at...", "2008 World Championship stamp", "Only 1000 made", etc.</td>' +
				'<td class="help-ex"></td>' +
			'</tr>' +
			'<tr>' +
				'<td class="help-label">Public</td>' +
				'<td class="help-text">Toggle the visibility setting to allow or prevent other users from viewing your disc. If public mode is turned on, ' +
					'then your disc is visible to the public and can be shared via Facebook or public URL. If public mode is turned off, then your disc is only privately viewable by the ' +
					'creator and shareable links will not work. <b>NOTE: </b>Visibility is saved for each disc independently and it can be toggled directly from the dashboard by ' +
					'clicking on the eyeball icon.</td>' +
				'<td class="help-ex"></td>' +
			'</tr>' +
			'<tr>' +
				'<td class="help-label">Condition</td>' +
				'<td class="help-text">Enter the condition of the disc based on the sleepy scale. ' +
					'<b>NOTE: </b>This field only accepts integers from 0 to 10.</td>' +
				'<td class="help-ex">9</td>' +
			'</tr>';
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
	var width = '';
	
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
	
	if (isDef(opt.width)) {
		width = opt.width;
	}
	
	// Create modal
	var $modal = $('<div class="modal custom-modal fade" tabindex="-1" role="dialog" aria-hidden="true"></div>');
	$modal.html('<div class="modal-dialog">' + 
            '<div class="modal-content">' + 
              '<div class="modal-header">' + headerText +
              	'<div class="modal-header-logo">' +
              		'<img class="fit-parent" src="' + serverURL +'/static/logo/logo_high_nobg.svg">' +
              	'</div>' +
              	'<div class="clearfix"></div>' +
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
		myDashboard.doResize();
	  
	});
	
	// On shown event
	$modal.on('shown.bs.modal', function (e) {
		$('body').css('overflow', 'hidden');
		resizeModal();
		myDashboard.doResize();
		
	  	if (isDef(opt.onShow)) {
			opt.onShow($modal.find('.modal-body'));
		}
	});
	
	// On show event
	$modal.on('show.bs.modal', function (e) {
		$('.modal-dialog').css('width', width + 'px');
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
	var marginTop = parseInt($('.modal-dialog').css("margin-top"), 10);
	var marginBottom = parseInt($('.modal-dialog').css("margin-bottom"), 10);
	var height = Math.max((windowHeight - headerHeight - footerHeight - marginTop - marginBottom), 120);
	
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
							fileName = 'disc|zump_' + time;
						}
						
						var csvContent = "data:text/csv;charset=utf-8,";
						var writeHeaders = true;
						var list = discs;
						if (type == 'filtered') {
							list = myDashboard.Filter().filter(discs);
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
function generateConfirmationModal(title, bodyText, btnText, confirmFn) {
	var header = '<div class="modal-title">' + title + '</div>';
	
	var body = '';
    
    if (isDef(bodyText.strong)) {
    	body = '<p><strong>' + bodyText.strong + '</strong></p><br/>';
    }
    
    if (isDef(bodyText.text)) {
    	body = body + '<p>' + bodyText.text + '</p>';
    }
			
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
					function: function($btn, $inner, done) {
						done();
						confirmFn();
					}
				}
		];
		
	generateModal({
		header: header, 
		body: body, 
		footer: footer, 
		fns: fns,
		width: '500'
	});
}

/*===================================================================*/
/*                                                                   */
/*                    Notification Popup                             */
/*                                                                   */
/*===================================================================*/
function showNotification(title, content, action) {
	$('.notification-popup').remove();
	var $not = $('<div class="notification-popup">' +
			        '<div class="notification-container">' +
			            '<div class="notification-title">' +
			                '<span class="close-btn close"><i class="fa fa-close"></i></span>' +
			                title +
			            '</div>' +
			            '<div class="notification-body">' +
			                '<div class="notification-content">' +
			                    content +
			                '</div>' +
			            '</div>' +
			        '</div>' +
			    '</div>');
	$('body').append($not);
	$not.find('.close').click(function() {
		$not.animate({
			opacity: 0
		}, 1000, function() {
			$not.remove();
		});
	});
	
	if (action) {
		$not.find('.notification-body').click(function() {
			action();
			$not.remove();
		});
	}
	
	$not.animate({
		opacity: 1
	}, 1000, function() {
		autoCloseAlert($not, '.close', 3000);
	});
}

/*===================================================================*/
/*                                                                   */
/*                           Cropper                                 */
/*                                                                   */
/*===================================================================*/
var repositionPhotoCrop = function() {
	$('.photo-crop').css({
		top: $(document).scrollTop()
	});
	
	var $cropContainer = $photoCrop.find('.crop-container');
	var top = ($(window).height() - $cropContainer.outerHeight())/2;
	var left = ($(window).width() - $cropContainer.outerWidth())/2;
	$cropContainer.css({
		top: top,
		left: left
	});
}

/*
* Modal to handle image cropping
*/
var showPhotoCrop = function(name, blob, callback) {
	$('body').css('overflow', 'hidden');
	
	$photoCrop = $('<div class="backdrop backdrop-dark photo-crop"></div>');
	$photoCrop.append('<div class="crop-container">' + 
						'<div class="crop-area">' + 
							'<img filename="' + name + '" src="' + blob +'" />' + 
						'</div>' + 
						'<div class="crop-control-area">' + 
							'<div class="crop-control">' + 
								'<button type="button" class="btn btn-default" id="cancel-crop" discid=""><span><i class="fa fa-trash fa-tools"></i></span>Cancel</button>' + 
								'<button type="button" class="btn btn-primary" id="accept-crop" discid=""><span><i class="fa fa-save fa-tools"></i></span>Accept</button>' + 
							'</div>' +
						'</div>' + 
					'</div>');
	
	$cropImage = $photoCrop.find('.crop-area > img');
					
	$('body').append($photoCrop);
	$(window).on('resize', repositionPhotoCrop);
	
	$photoCrop.find('#accept-crop').click(function() {
		var fileName = $cropImage.attr('filename');
		var blob = $cropImage.cropper('getCroppedCanvas').toDataURL();
		var newFile = dataURItoBlob(blob);
		newFile.cropped = true;
		newFile.name = fileName;
		
		if ($photoCrop.length) {
			$photoCrop.remove();
		}
		
		$('body').css('overflow', 'auto');
		$(window).off('resize', repositionPhotoCrop);
		callback(newFile);
	});
	
	$photoCrop.find('#cancel-crop').click(function() {
		if ($photoCrop.length) {
			$photoCrop.remove();
		}
		$('body').css('overflow', 'auto');
		$(window).off('resize', repositionPhotoCrop);
		callback();
	});
    
	repositionPhotoCrop();
	
	$cropImage.cropper({
	  aspectRatio: 1/ 1,
	  autoCropArea: 1,
	  dragCrop: false,
	  cropBoxMovable: false,
	  cropBoxResizable: false
    });
}

/*
* Converts a dataURI to a blob
*/
var dataURItoBlob = function(dataURI) {
    var byteString = atob(dataURI.split(',')[1]);
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: 'image/jpeg' });
}

/* Global Methods */

jQuery.fn.extend({
    dzTriSwitch: function(opt, val) {
    	var $this = $(this);
    	
        var createSelector = function() {
            return $('<div class="dz-switch-selector dz-switch-on"></div>');
        }
    	
    	if (typeof(opt) === 'undefined' || opt.init) {
			$this.find('.dz-switch-opt').click(function(e) {
			    var $this = $(this);
			    var width = $this.outerWidth();
			    if ($this.hasClass('active')) return;
			    
			    var $active = $this.siblings('.dz-switch-opt.active');
			    var $activeSel = $active.find('.dz-switch-selector');
			    var select = createSelector();
			    
			    if ($this.isAfter($active)) {
			        width = -1 * width;
			    }
			    
			    if ($active.length) {
			        select.css({marginLeft: width + 'px'});
			        $this.prepend(select);
			        
			        $activeSel.animate({
			            marginLeft: (width * -1) + 'px'
			        }, 100, function() {
			            $active.removeClass('active');
			            $activeSel.remove();
			            
			        });
			        
			        select.animate({
			            marginLeft: '0px'
			        }, 100, function() {
			            $this.addClass('active');
			        	if (opt.init.onChange) opt.init.onChange($this.attr('value'));
			        });
			        
			    } else {
			        $this.addClass('active');
			        $this.prepend(select);
			        if (opt.init.onChange) opt.init.onChange($this.attr('value'));
			    }
			});
			return this;
    	}
    	
    	if (opt == 'change') {
    		this.find('.dz-switch-opt[value="' + val + '"]').trigger('click');
    		return this;
    	}
    },
    isAfter: function($elem){
        return this.index() > $elem.index();
    }
});

function updateLoc(array, to, from) {
	array.splice(to, 0, array.splice(from, 1)[0]);
}

/*
* Returns the current search params
*/
function getSearchParameters() {
	var prmstr = window.location.hash.substr(1);
	return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
}

/*
* Transforms a string to an object
*/
function transformToAssocArray( prmstr ) {
    var params = {};
    var prmarr = prmstr.split("&");
    for ( var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split("=");
        params[tmparr[0]] = tmparr[1];
    }
    return params;
}

function clearHash() {
	updateHash({});
}

function hashDiscView(discId) {
	updateHash({
		view: 'disc',
		disc_id: discId
	});
}

function hashProfileView(userId) {
	updateHash({
		view: 'profile',
		user_id: userId
	});
}

function hashMessageView(threadId) {
	updateHash({
		view: 'inbox',
		thread_id: threadId
	});
}

function hashDashboardView(userId) {
	var dashHash = {};
	dashHash.view = 'dashboard';
	if (userId) dashHash.user_id = userId;
	updateHash(dashHash);
}

/*
* Configures url hash
*/
function updateHash(urlHash) {
	var hashString = '';
	_.each(_.keys(urlHash), function(key) {
		if (hashString.length) hashString += '&';
		hashString += key + '=' + urlHash[key];
	});
	
	if (typeof (window.history.replaceState) == 'function') {
		window.history.replaceState(undefined, undefined, '#' + hashString);
	} else {
		window.location.hash = '#' + hashString;
	}
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

/*
* Check if user owns disc
*/
function isUserOwned(id) {
	return typeof _.findWhere(discs, {_id: id}) !== 'undefined';
}

function resizeSidebarResults() {
	
	$.each($('.sidebar-results-container:visible'), function() {
		var label = $(this).siblings('.sidebar-results-ref').last();
		var height = $(window).outerHeight(true) - (label.offset().top - $(window).scrollTop() - parseInt(label.css('margin-top')) + label.outerHeight(true));
		$(this).css({
			height: height + 'px',
			maxHeight: height + 'px'
		});
	});
}

function parseDate(date) {
	var arr = date.split('-');
	var year = arr[0];
	var month = getMonth(arr[1]);
	var day = arr[2].substring(0,2);
	
	return month + ' ' + day + ', ' + year;
}

function getMonth(month) {
	var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
					'August', 'September', 'October', 'November', 'December'];
	return months[month-1];
}

/*===================================================================*/
/*                                                                   */
/*                     Library Objects                               */
/*                                                                   */
/*===================================================================*/

/*
* Name: ZumpNotifier
* Date: 11/18/15
*/
var ZumpNotifier = function() {
	
	//----------------------\
    // Javascript Objects
    //----------------------/
    var zumpNotifier = this;
    var notifyTable = {
    	accountChange: [],
    	discCreated: [],
    	discUpdated: [],
    	discDeleted: []
    };
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    this.addListener = function(event, owner, callback) {
    	if (notifyTable[event]) {
    		notifyTable[event] = _.reject(notifyTable[event], function(listener) {
    			return listener.id == owner;
    		});
    		notifyTable[event].push({
    			id: owner,
    			callback: callback
    		});
    	}
    	
    	return zumpNotifier;
    }
    
    this.executeEvent = function(event, data) {
    	var eventListeners = notifyTable[event];
    	
    	if (eventListeners) {
    		_.each(eventListeners, function(listener) {
    			listener.callback(event, data);
    		});
    	}
    	
    	return zumpNotifier;
    }
    
    return zumpNotifier;
}

/*
* Name: ZumpTemplatePicker
* Date: 10/23/15
*/
var ZumpTemplatePicker = function(opt) {
	
	//----------------------\
    // Javascript Objects
    //----------------------/
    var zumpTemplatePicker = this;
    var items = [];
    var templates = [];
    var onSelect;
    var activeTemplate = undefined;
    var primaryParam = 'name';
    var compareParams = [
    		'brand',
    		'material',
    		'type',
    		'speed',
    		'glide',
    		'turn',
    		'fade'
    	];
    
    //----------------------\
    // JQuery Objects
    //----------------------/
    var $templatePicker;
    var $templatePickerContainer;
    var $templateLoading;
    var $templateList;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
	this.init = function(opt) {
		
	}
	
	this.setItems = function(itemSet) {
		items = itemSet;
		return zumpTemplatePicker;
	}
	
	this.show = function(value, callback) {
		onSelect = callback;
		templates = [];
		activeTemplate = undefined;
		$('body').css('overflow', 'hidden');
		$('body').append(createTemplatePicker(value));
		$(window).on('resize', resizeTemplatePicker);
		resizeTemplatePicker();
		getTemplates(value);
		generateTemplateItems();
		$templateLoading.hide();
		$templateList.find('.template-item').first().trigger('click');
	}
	
	//----------------------\
    // Private Functions
    //----------------------/
    var resizeTemplatePicker = function() {
    	$templatePicker.css({
			top: $(document).scrollTop()
		});
		
		var top = ($(window).height() - $templatePickerContainer.outerHeight())/2;
		var left = ($(window).width() - $templatePickerContainer.outerWidth())/2;
		$templatePickerContainer.css({
			top: top,
			left: left
		});
		
		$templateLoading.css({
			width: $templateList.outerWidth(),
			height: $templateList.outerHeight(),
			top: $templateList.position().top,
			left: $templateList.position().left
		});
    }
    
    var createTemplatePicker = function(value) {
    	$templatePicker = $('<div class="backdrop backdrop-light"></div>');
    	$templatePicker.append('<div class="template-picker">' +
						        '<div class="template-title">' +
						          'Auto|<span class="dz-color">Fill</span>' +
						        '</div>' +
						        '<div class="template-container-label">Templates Matching: <span id="template-name">' + value + '</span></div>' +
						        '<div class="template-loading"><div class="template-loading-icon"><i class="fa fa-spinner fa-spin"></i></div></div>' +
						        '<ul class="template-container" id="template-list">' +
						        '</ul>' +
						        '<div class="template-button-container">' +
						          '<button type="button" class="btn btn-default pull-left" id="template-skip"><span><i class="fa fa-reply fa-tools"></i></span>Skip</button>' +
						          '<button type="button" class="btn btn-primary pull-right" id="template-select"><span><i class="fa fa-upload fa-tools"></i></span>Select</button>' +
						          '<div class="checkbox"><input type="checkbox" id="template-never-show"></input>Don\'t show again</div>' +
						          '<div class="clearfix"></div></div>' +
						        '</div>' +
						      '</div>');
		$templatePickerContainer = $templatePicker.find('.template-picker');
		$templateLoading = $templatePicker.find('.template-loading');
		$templateList = $templatePicker.find('#template-list');
		startListeners();
		return $templatePicker;
    }
    
    var startListeners = function() {
    	$templatePicker.find('#template-select').click(function() {
    		if (typeof activeTemplate === 'undefined') {
    			return false;
    		}
    		
    		if (onSelect) {
    			onSelect(_.findWhere(templates, {_id : activeTemplate}));
    		}
    		
    		if ($templatePicker.find('#template-never-show').is(':checked')) {
    			updatePreferences({showTemplatePicker: false}, function(success, prefs) {
    				if (success) {
    					userPrefs = prefs;
						$('#show-template-picker').bootstrapSwitch('state', userPrefs.showTemplatePicker);
    				}
    			});
    		}
    		
    		closeTemplatePicker();
    	});
    	
    	$templatePicker.find('#template-skip').click(function() {
    		if ($templatePicker.find('#template-never-show').is(':checked')) {
    			updatePreferences({showTemplatePicker: false}, function(success, prefs) {
    				if (success) {
    					userPrefs = prefs;
						$('#show-template-picker').bootstrapSwitch('state', userPrefs.showTemplatePicker);
    				}
    			});
    		}
    		
    		closeTemplatePicker();
    	});
    	
    	$templatePicker.on('click', '.template-item', function() {
    		$(this).addClass('active').siblings().removeClass('active');
    		activeTemplate = $(this).attr('tempId');
    	});
    }
	
	var closeTemplatePicker = function() {
		$('body').css('overflow', 'auto');
		$(window).off('resize', resizeTemplatePicker);
		$templatePicker.remove();
	}
	
	var generateTemplateItems = function() {
		_.each(templates, function(template) {
			$templateList.append(generateTemplateItem(template));
		});
	}
	
	var generateTemplateItem = function(template) {
		return '<li class="template-item" tempId="' + template._id + '">' +
            '<table class="template-data-table table-main">' +
              '<tr>' +
                '<td>Brand: <span class="template-data-value">' + getSafe(template.brand, 'N/A') + '</span></td>' +
                '<td>Type: <span class="template-data-value">' + getSafe(template.type, 'N/A') + '</span></td>' +
                '<td>Material: <span class="template-data-value">' + getSafe(template.material, 'N/A') + '</span></td>' +
              '</tr>' +
            '</table>' +
            '<table class="template-data-table table-flight">' +
              '<tr>' +
                '<td>Speed: <span class="template-data-value">' + getSafe(template.speed, 'N/A') + '</span></td>' +
                '<td>Glide: <span class="template-data-value">' + getSafe(template.glide, 'N/A') + '</span></td>' +
                '<td>Turn: <span class="template-data-value">' + getSafe(template.turn, 'N/A') + '</span></td>' +
                '<td>Fade: <span class="template-data-value">' + getSafe(template.fade, 'N/A') + '</span></td>' +
              '</tr>' +
            '</table>' +
          '</li>';
	}
	
	var getTemplates = function(value) {
		var matches = _.filter(items, function(item) {
			var prop = item[primaryParam];
			
			return typeof prop !== 'undefined' && prop == value;
		});
		
		_.each(matches, function(match) {
			if (checkUnique(match)) {
				templates.push(createTemplateCopy(match));
			}
		});
	}
	
	var createTemplateCopy = function(match) {
		var copy = {_id: match._id};
		
		_.each(compareParams, function(param) {
			copy[param] = match[param];
		});
		
		return copy;
	}
	
	var checkUnique = function(match) {
		_.each(templates, function(template) {
			if (compareTemplate(template, match)) {
				return false;
			}
		});
		
		return true;
	}
	
	var compareTemplate = function(template, match) {
		_.each(compareParams, function(param) {
			if (template[param] != match[param]) {
				return false;
			}
		});
		
		return true;
	}
	
	this.init(opt);
}

/*
* Name: ZumpLink
* Date: 10/06/15
*/
var ZumpLink = function(opt) {
	
	//----------------------\
    // Javascript Objects
    //----------------------/
    var grabPath;
    var linkerWidth = 200;
    var linkerHeight = 200;
    var selector;
    	
	//----------------------\
    // JQuery Objects
    //----------------------/
    var $linker;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    this.init = function(opt) {
    	selector = opt.selector;
        $(document).on('click', selector, showLinker);
        $(document).on('click', '.link-btn', copyLink);
        $(window).on('resize', function() { resizeLink() });
        grabPath = opt.path;
    }
    
    this.doResize = function() {
    	resizeLink();
    }
    
    //----------------------\
    // Private Functions
    //----------------------/
    var resizeLink = function($curSelector) {
    	if (!$linker || !$.contains(document, $linker[0])) {
    		return;
    	}
    	
    	if (!$curSelector) {
    		$curSelector = $linker.prev(selector);
    	}
    	
        var left;
        var top;
        
        if ($(window).width() - $curSelector.offset().left - $curSelector.outerWidth() >= linkerWidth) {
            left = $curSelector.position().left + $curSelector.outerWidth();
        } else {
            left =  $curSelector.position().left - linkerWidth;
        }
        
        if ($(document).height() - $curSelector.offset().top - $curSelector.outerHeight() >= linkerHeight) {
            top = $curSelector.position().top + $curSelector.outerHeight();
        } else {
            top = $curSelector.position().top - linkerHeight;
        }
    	
    	$linker.css({
            left: left,
            top: top
        });
        
        return $linker;
    }
    
    var copyLink = function(event) {
    	event.stopPropagation();
        window.open($(this).attr('href'), '_blank');
        return false;
    }
    
    var createLinker = function(path) {
        if ($linker && $linker.length) {
            $linker.siblings('.link-active').removeClass('link-active');
            $linker.remove();
        }
        
        $linker = $('<div class="link-container remove-on-close"></div>');
        $linker.append('<button class="link-btn" type="button" href="' + serverURL + '/' + path + '"><span><i class="fa fa-retweet"></i></span></button>' +
            '<input class="link-input" type="text" value="' + serverURL + '/' + path + '"/>');
        return $linker;
    }
    
    var showLinker = function(event) {
    	event.stopPropagation();
        var $this = $(this);
        
        createLinker(grabPath($this)).insertAfter($this);
        resizeLink($this);
        $this.addClass('link-active');
        $linker.find('.link-input').select();
        return false;
    }
    
    this.init(opt);
}

/*
* Name: ZumpEditor
* Date: 08/31/2015
*/
var ZumpEditor = function(opt) {
	
	//----------------------\
    // Javascript Objects
    //----------------------/
    var myEditor = this;
	var textAssistArr = [];
	var dropzoneImageHandle = [];
	var templateCache = [];
	var curDisc = {};
	var modifyHandler = {lastType: undefined, type: 'Add', discId: undefined};
	var templatePicker;
	var dropzone;
	var isProcessing = false;
	var isInitialized = false;
	var discPhotoCrop = false;
    
    //----------------------\
    // JQuery Objects
    //----------------------/
    var $modifyForm;
    var $tagContainer;
    var $clearForm;
    var $saveDisc;
    var $cloneDisc;
    var $deleteDisc;
    var $tagInput;
    var $addCustomTag;
    var $dropzoneArea;
    var $discVisibility;
    var $pgTitle;
    var $imageContainer;
    var $curImagesSection;
    var $discNotes;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    this.init = function(opt) {
    	
    	$clearForm = $('#clear-modify-disc-form');
    	$saveDisc = $('#save-disc');
    	$cloneDisc = $('#clone-disc');
    	$deleteDisc = $('#modify-disc-delete');
    	$modifyForm = $('#modify-disc-form');
    	$tagContainer = $('#tag-list-container');
    	$tagInput = $('#add-disc-tag');
    	$addCustomTag = $('#add-custom-tag');
    	$dropzoneArea = $('#dropzone-area');
    	$discVisibility = $('#disc-visibility');
    	$pgTitle = $('#pg-modify-disc').find('.page-title');
    	$imageContainer = $('#existing-image-list');
    	$curImagesSection = $('#current-images-section');
    	$discNotes = $('#disc-notes');
    	
    	getTemplates(function(success, retData) {
    		if (success) {
    			templateCache = retData;
    		}
    	});
    	
    	setupListeners();
    }
    
    this.setModifyType = function(type) {
    	modifyHandler.type = type;
    }
    
    this.setDiscId = function(discId) {
    	modifyHandler.discId = discId;
    }
    
    this.ModifyType = function() {
    	return modifyHandler.type;
    }
    
    this.DiscId = function() {
    	return modifyHandler.discId;
    }
    
    this.isProcessing = function() {
    	return isProcessing;
    }
    
    this.beforeShow = function() {
    	if (!isInitialized) {
    		initialize();
    		isInitialized = true;
    	}
    	
    	stageModifyDiscPage();
    }
    
    this.onShow = function() {
    	_.each(textAssistArr, function(textAssist) {
			textAssist.triggerResize();
		});
		
		if (modifyHandler.type == 'Edit') {
			$('.sidebar-select.nav[pg-select="#pg-modify-disc"]').removeClass('active');
		}
		
    }
    
    this.clearForm = function() {
    	clearDiscForm();
    }
    
    //----------------------\
    // Private Functions
    //----------------------/
    var discEditorValidation = new ZumpValidate({
    	items: [
    		{id: 'disc-brand', type: 'text', min: 1},
    		{id: 'disc-name', type: 'text', min: 1},
    		{id: 'disc-type', optional: true, type: 'function', fn: function(val) {return val.length == 0 ? undefined : true}},
    		{id: 'disc-material', optional: true, type: 'function', fn: function(val) {return val.length == 0 ? undefined : true}},
    		{id: 'disc-weight', optional: true, type: 'number', max: 3},
    		{id: 'disc-color', optional: true, type: 'function', fn: function(val) {return val.length == 0 ? undefined : true}},
    		{id: 'disc-speed', optional: true, type: 'number', max: 2},
    		{id: 'disc-glide', optional: true, type: 'number', max: 2},
    		{id: 'disc-turn', optional: true, type: 'number', max: 2},
    		{id: 'disc-fade', optional: true, type: 'number', max: 2},
    		{id: 'disc-condition', optional: true, type:'function', fn: function(val) { return val.length == 0 ? undefined : /^(10|[0-9])$/.test(val) }, max: 2}
    	]
    });
    
    var setupListeners = function() {
	
	    $clearForm.click(function() {
	    	clearDiscForm();
	    });
		
		$(document).on('mouseenter', '.image-item', function(){
			var $this = $(this);
			if (!$this.parents('.image-item-container').hasClass('dz-processing')) {
				$(this).find('.image-overlay').show();
			}
		}).on('mouseleave', '.image-item', function(){
			$(this).find('.image-overlay').hide();
		});
		
		$(document).on('click', '.tag-item-remove', function(){
			var $parent = $(this).parents('.tag-item');
			$parent.remove();
			
			if ($tagContainer.is(':empty')){
				$tagContainer.empty();
			}
		});
		
		$(document).on('keyup paste change leave focusin focusout', $tagInput, function() {
			if ($tagInput.val().length > 0) {
				if (!$addCustomTag.hasClass('has-text')) $addCustomTag.addClass('has-text');
			} else {
				if ($addCustomTag.hasClass('has-text')) $addCustomTag.removeClass('has-text');
			}
		});
	    
	    $saveDisc.click(function() {
			$('.page-alert').remove();
			
			discEditorValidation.doValidate();
			
			var invalidItems = discEditorValidation.getInvalidItems();
			if (invalidItems.length) {
				generateInvalidDataError(invalidItems);
			} else if (modifyHandler.type == 'Add' || modifyHandler.type == 'Clone') {
	    		saveNewDisc();
	    	} else if (modifyHandler.type == 'Edit') {
	    		saveExistingDisc();
	    	}
	    });
	    
	    $cloneDisc.click(function() {
	    	modifyHandler.type = 'Clone';
	    	changePage('#pg-modify-disc');
	    });
	    
	    $deleteDisc.click(function() {
			var body = {
				text: 'Are you sure you want to delete this disc and all of its data?'
			};
			generateConfirmationModal('WARNING!', body, 'Delete', function() {
				deleteDisc(modifyHandler.discId, function(success, data) {
					if (success) {
						myNotifier.executeEvent('discDeleted', data);
						changePage('#pg-dashboard');
					} else {
						handleError(data);
					}
				});
			});
	    });
	    
	    $addCustomTag.click(function(){
	    	if ($tagInput.val().length > 0) {
				$tagContainer.append(generateTagItem($tagInput.val()));
	    		$tagInput.val('');
	    		$addCustomTag.removeClass('has-text');
	    	}
	    });
	    
	    $imageContainer.on('click', '.image-remove', function() {
	    	var $parent = $(this).parents('.image-item-container');
	    	var imageId = $parent.attr('imageid');
	    	
	    	$parent.remove();
	    	
	    	curDisc.imageList = _.reject(curDisc.imageList, function(item) {
	    		return item._id == imageId;
	    	});
	    	
	    	if (curDisc.primaryImage == imageId && curDisc.imageList.length) {
	    		curDisc.primaryImage = curDisc.imageList[0]._id;
	    		updateExistingImage(curDisc.primaryImage);
	    	} else {
	    		curDisc.primaryImage = undefined;
	    	}
	    	
	    	$('#existing-image-list').sortable('refresh');
	    	
	    	if (!curDisc.imageList.length) {
	    		$curImagesSection.hide();
	    	}
	    });
	    
	    $imageContainer.on('click', '.image-make-primary', function() {
	    	var $parent = $(this).parents('.image-item-container');
	    	var imageId = $parent.attr('imageid');
	    	curDisc.primaryImage = imageId;
	    	updateExistingImage(imageId);
	    });
	    
	    $('#modify-disc-form .row-label i[section="general"]').click(function() {
	    	var title = 'Modify Disc Help - General';
	    	var body = getGeneralText();
	    	generateHelpModal(title, body);
	    });
	    
	    $('#modify-disc-form .row-label i[section="advanced"]').click(function() {
	    	var title = 'Modify Disc Help - Advanced';
	    	var body = getAdvancedText();
	    	generateHelpModal(title, body);
	    });
    }
    
    var initialize = function() {
	    templatePicker = new ZumpTemplatePicker();

    	$modifyForm.find('.text-assist').each(function(index) {
    		var param = $(this).attr('param');
    		
			var textAssist = new ZumpTextAssist({
		        inputElement: $(this),
		        searchProp: param,
		        items: function() { return {userDiscs: _.union(discs, templateCache), templateDiscs: []}},
		        onSelection: function(item) {}
		    }); 
		    textAssistArr.push(textAssist);
		});
		
		$modifyForm.find('.text-assist-name').each(function(index) {
    		var param = $(this).attr('param');
    		
			var textAssist = new ZumpTextAssist({
		        inputElement: $(this),
		        searchProp: param,
		        items: function() { return {userDiscs: discs, templateDiscs: templateCache}},
		        onSelection: function(item) {
		        	if (userPrefs.showTemplatePicker) {
						templatePicker.setItems(_.union(discs, templateCache)).show(item, autoFillTemplate);
		        	}
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

		$modifyForm.find('[tt="condition"]').tooltip({
	    	delay: { "show": 200, "hide": 100 },
	    	placement: 'top',
	    	trigger: 'hover',
	    	title: 'Condition based on Sleepy Scale. Must be an integer from 0 to 10.',
	    	template: '<div class="tooltip" role="tooltip" style="width: 150px;">' +
	    				'<div class="tooltip-arrow"></div>' +
	    				'<div class="tooltip-inner"></div>' +
	    				'</div>'
	    });
	    
	    $modifyForm.find('.collapse').collapse({
		  toggle: false
		});
	    
		createDropZone($dropzoneArea);
	    clearDiscForm();
	    
	    $('#tag-list-container').sortable({
		    items:'> .tag-item',
		    cursor: 'move',
		    opacity: 0.5,
		    placeholder: 'tag-item-placeholder',
  			forcePlaceholderSize: false,
  			forceHelperSize: false,
		    start: function(e, ui) {
		        $(this).attr('data-previndex', ui.item.index());
		        $('#tag-list-container').find('.tag-item-placeholder').append($(ui.item[0]).html());
		        $(ui.item[0]).css({
		        	height: 'initial',
		        	width: 'initial'
		        });
		    },
		    update: function(e, ui){
		        var newIndex = ui.item.index();
		        var oldIndex = parseInt($(this).attr('data-previndex'));
		        $(this).removeAttr('data-previndex');
		        
		        updateLoc(curDisc.tagList, newIndex, oldIndex);
		    }
		});
		
		$('#existing-image-list').sortable({
		    items:'> .image-item-container',
		    cursor: 'move',
		    opacity: 0.5,
		    placeholder: 'image-item-placeholder',
  			forcePlaceholderSize: true,
		    start: function(e, ui) {
		        $(this).attr('data-previndex', ui.item.index());
		    },
		    update: function(e, ui){
		        var newIndex = ui.item.index();
		        var oldIndex = parseInt($(this).attr('data-previndex'));
		        $(this).removeAttr('data-previndex');
		        
		        updateLoc(curDisc.imageList, newIndex, oldIndex);
		    }
		});
    }
    
    var autoFillTemplate = function(template) {
    	$('#disc-brand').val(getSafe(template.brand, ''));
		$('#disc-material').val(getSafe(template.material, ''));
		$('#disc-type').val(getSafe(template.type, ''));
		$('#disc-speed').val(getSafe(template.speed, ''));
		$('#disc-glide').val(getSafe(template.glide, ''));
		$('#disc-turn').val(getSafe(template.turn, ''));
		$('#disc-fade').val(getSafe(template.fade, ''));
		discEditorValidation.doValidate();
		generateInfo('Template has been applied to form.', 'Template Applied', true);
    }
	
	/*
	* Setup for the modify disc page each time it's opened
	*/
	var stageModifyDiscPage = function() {
		var lastType = modifyHandler.lastType;
		modifyHandler.lastType = modifyHandler.type;
		
		if (modifyHandler.type == 'Add') {
			if (lastType != 'Add') {
				$pgTitle.text('Add Disc');
				$clearForm.show();
				$cloneDisc.hide();
				$deleteDisc.hide();
				populateDiscForm();
			}
			$curImagesSection.hide();
			clearDiscForm(true);
		} else if (modifyHandler.type == 'Edit') {
			$pgTitle.text('Edit Disc');
			clearDiscForm();
			$curImagesSection.show();
			$clearForm.hide();
			$cloneDisc.show();
			$deleteDisc.show();
			populateDiscForm(modifyHandler.discId);
		} else if (modifyHandler.type == 'Clone') {
			$pgTitle.text('Add Disc');
			$clearForm.show();
			$cloneDisc.hide();
			$deleteDisc.hide();
			clearDiscForm();
			populateDiscForm(modifyHandler.discId, true);
			$curImagesSection.hide();
			clearDiscForm(true);
			modifyHandler.type = 'Add';
			modifyHandler.discId = undefined;
		}
	}
	
	/*
	* Clears and resets the modify disc form.
	*/
	var clearDiscForm = function(imageOnly) {
		if (!imageOnly) {
			$modifyForm.trigger('reset');
			$modifyForm.find('.has-error').removeClass('has-error');
			$modifyForm.find('.has-success').removeClass('has-success');
			$('.page-alert').remove();
			$tagContainer.empty();
			$addCustomTag.removeClass('has-text');
			$discNotes.removeAttr('style');
			$discVisibility.bootstrapSwitch('state', true);
		}
		
		$imageContainer.empty();
		clearDropzone();
	}
	
	/*
	* Populate the Edit Disc form with existing disc data
	*/
	var populateDiscForm = function(discId, clone) {
		if (typeof discId === 'undefined') {
			curDisc = {imageList: [], primaryImage: ''};
			return;
		}
		
		curDisc = copyDisc(discId);
		
		var tagList = curDisc['tagList'];
	
		$('#disc-brand').val(getSafe(curDisc.brand, ''));
		$('#disc-name').val(getSafe(curDisc.name, ''));
		$('#disc-material').val(getSafe(curDisc.material, ''));
		$('#disc-type').val(getSafe(curDisc.type, ''));
		$('#disc-weight').val(getSafe(curDisc.weight, ''));
		$('#disc-color').val(getSafe(curDisc.color, ''));
		$('#disc-speed').val(getSafe(curDisc.speed, ''));
		$('#disc-glide').val(getSafe(curDisc.glide, ''));
		$('#disc-turn').val(getSafe(curDisc.turn, ''));
		$('#disc-fade').val(getSafe(curDisc.fade, ''));
		$('#disc-notes').val(getSafe(curDisc.notes, ''));
		$('#disc-condition').val(getSafe(curDisc.condition, ''));
		
		$('#disc-visibility').bootstrapSwitch('state', getSafe(curDisc.visible, true));
		
		_.each(tagList, function(tag) {
	    	$tagContainer.append(generateTagItem(tag));
	    });
	    
	    _.each(curDisc.imageList, function(image) {
			$imageContainer.append(generateImageItem(image));
		});
		
		if (clone) {
			curDisc._id = undefined;
			curDisc.imageList = [];
			curDisc.primaryImage = undefined;
		}
		
		discEditorValidation.doValidate();
		
		$('#tag-list-container').sortable('refresh');
	}
	
	/*
	* Clears dropzone
	*/
	var clearDropzone = function() {
		dropzone.removeAllFiles();
	}
	
	/*
	* Creating and saving a new disc
	*/
	var saveNewDisc = function() {
		if (isProcessing || (dropzone && dropzone.getAcceptedFiles() > 0)) return;
		
		isProcessing = true;
		setLoading(true);
		
		updateCurDisc();
	    
	    postDisc(curDisc, function(success, retData) {
			if (success) {
				generateSuccess(retData.brand + ' ' + retData.name + ' was successfully added.', 'Success', true);
				isProcessing = false;
				setLoading(false);
				stageModifyDiscPage();
				myNotifier.executeEvent('discCreated', retData);
			} else {
				handleError(retData);
				setLoading(false);
				isProcessing = false;
			}
		});
	}
	
	/*
	* Changing and saving an existing disc
	*/
	var saveExistingDisc = function() {
		if (isProcessing || (dropzone && dropzone.getAcceptedFiles() > 0)) return;
		
		isProcessing = true;
		setLoading(true);
		
		updateCurDisc();
	    
	    putDisc(curDisc, function(success, retData) {
			if (success) {
				generateSuccess(retData.brand + ' ' + retData.name + ' was successfully updated.', 'Success', true);
				isProcessing = false;
				setLoading(false);
				clearDropzone();
				myNotifier.executeEvent('discUpdated', retData);
			} else {
				handleError(retData);
				setLoading(false);
				isProcessing = false;
			}
		});
	}
	
	/*
	* Locates an image source and updates with correct file path
	*/
	var updateExistingImage = function(imageId) {
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
	* Creates a disc based on a HTML form
	*/
	var updateCurDisc = function() {
		var $fields = $modifyForm.find('input');
		
		$.each($fields, function(index) {
			var $field = $(this);
			if (hasAttr($field, 'param')) {
				if ($field.is(':checkbox')) {
					curDisc[$field.attr('param')] = $field.prop('checked');
				} else {
					curDisc[$field.attr('param')] = $field.val();
				}
			}
		});
		
		$fields = $modifyForm.find('select');
		$.each($fields, function(index) {
			var $field = $(this);
			curDisc[$field.attr('param')] = $field.val();	
		});
		
		$fields = $modifyForm.find('textarea');
		$.each($fields, function(index) {
			var $field = $(this);
			curDisc[$field.attr('param')] = $field.val();	
		});
		
		var tags = [];
		$fields = $modifyForm.find('.tag-item');
		$.each($fields, function(index) {
			var $field = $(this);
			tags.push($field.text().trim());
		});
		curDisc['tagList'] = _.unique(tags);
		
		return curDisc;
	}
	
	/*
	* Generates the HTML for a tag
	*/
	var generateTagItem = function(item) {
		return '<div class="tag-item" tagVal="' + item +  '">' +
			'<p class="tag-item-text">' + item + ' <span class="tag-item-remove"><i class="fa fa-times"></i></span></p>' +
			'</div>';
	}
	
	/*
	* Generates an image item for a disc
	*/
	var generateImageItem = function(image) {
		return '<div class="image-item-container" imageid="' + image._id + '">' +
					'<div class="image-item">' +
						'<div class="image-entity">' +
							'<img src="/files/' + image.thumbnailId +'" class="fit-parent">' +
						'</div>' +
						(curDisc.primaryImage == image._id ? 
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
	var createDropZone = function($div) {
		var template = '<div class="image-item-container image-template">' +
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
	    
		dropzone = new Dropzone('#' + $container.attr('id'), {
			url: "/api/images",
			method: "POST",
			thumbnailWidth: 100,
			thumbnailHeight: 100,
			parallelUploads: 10,
			maxFiles: 10,
			paramName: 'discImage',
			previewTemplate: template,
			acceptedFiles: "image/*",
			autoProcessQueue: true,
			previewsContainer: '#' + $table.attr('id'),
			clickable: '#' + $imageAdd.attr('id'),
			accept: function(file, done) {
				done();
			},
			init: function() {
				this.on("addedfile", function(file) {
					if (this.files[10] != null){
						return this.removeFile(this.files[10]);
					}
					
					if (file.cropped || file.width < 200) {
			            return;
			        }
			        
				 	dropzoneImageHandle.push(file);
        			dropzone.removeFile(file);
        			
				 	if (!discPhotoCrop) {
				 		handleDropzoneImage();
				 	}
					
					$imageAdd.insertAfter('#dropzone-previews > .image-item-container:last-child');
					$container.stop().animate({scrollLeft: $table.innerWidth()}, 2000);
					
				}).on('success', function(file, response){
					if (typeof response._id !== 'undefined') {
						pushNewImage(response);
					}
					
					this.removeFile(file);
				}).on('removedfile', function() {
					
				}).on('queuecomplete', function() {
					$saveDisc.removeAttr('disabled');
				}).on('processing', function() {
					$saveDisc.attr('disabled', 'disabled');
				});
			}
		});
	}
	
	var handleDropzoneImage = function() {
		var file = dropzoneImageHandle.shift();
		
		if (!file) {
			return;
		}
        
        discPhotoCrop = true;
        setLoading(true);
        
        var cachedFilename = file.name;
        
        var reader = new FileReader();
        reader.onloadend = function() {
        	showPhotoCrop(file.name, reader.result, function(newFile) {
				discPhotoCrop = false;
				
        		if (newFile) {
        			dropzone.addFile(newFile);
        		}
        		
        		setLoading(false);
				
				if (dropzoneImageHandle.length) {
					handleDropzoneImage();
				}
        	});
        };
        
        reader.readAsDataURL(file);
	}
	
	var pushNewImage = function(imageObj) {
		curDisc.imageList.push(imageObj);
		
		if (curDisc.imageList.length == 1) {
	    	curDisc.primaryImage = imageObj._id;
		}
		
		$imageContainer.append(generateImageItem(imageObj));
		
		if (!$curImagesSection.is(':visible')) {
			$curImagesSection.show();
		}
	}
    
    this.init(opt);
}

/*
* Name: ZumpDashboard
* Date: 08/31/2015
*/
var ZumpDashboard = function(opt) {
	
	//----------------------\
    // Javascript Objects
    //----------------------/
    
	var zumpDashboard = this;
	var mySort;
	var myFilter;
	var myGallery;
	var unfilteredList;
	var discList;
	var myLink;
	var refPageTop;
	var refContBottom;
	var activeView;
	var discViewDisc;
	var publicList = false;
	var currentUser;
	var forceRefresh = false;
	
	var paginateOptions = {displayCount: 20, currentPage: 1, lastPage: 1};
	var chartData = {};
	var searchFields = [{text: 'Name', property: 'name'},
				        {text: 'Brand', property: 'brand'},
				        {text: 'Tags', property: 'tagList'},
				        {text: 'Type', property: 'type'},
				        {text: 'Material', property: 'material'},
				        {text: 'Weight', property: 'weight'},
				        {text: 'Color', property: 'color'},
				        {text: 'Speed', property: 'speed'},
				        {text: 'Glide', property: 'glide'},
				        {text: 'Turn', property: 'turn'},
				        {text: 'Fade', property: 'fade'},
				        {text: 'Condition', property: 'condition'}];
	
	//----------------------\
    // JQuery Objects
    //----------------------/
	var $filterCount;
	var $filterResults;
	var $pageForward;
	var $pageBack;
	var $paginateCount;
	var $inventoryHeader;
    var $inventoryContainer;
    var $renderGraph;
    var $statPlot;
    var $searchToggle;
    var $searchPanel;
    var $searchResults;
	var $imageArea;
	var $paginateNav;
	var $galleryMenu;
	var $dashboardViewArea;
	var $sidebarLoading;

	//----------------------\
    // Prototype Functions
    //----------------------/
    
	this.init = function(opt) {
		
		$inventoryHeader = $(opt.inventory.inventoryHeader);
    	$inventoryContainer = $(opt.inventory.inventoryContainer);
    	$filterResults = $(opt.filter.filterResults);
		$filterCount = $(opt.filter.filterCount);
		$pageForward = $(opt.paginate.pageForward);
		$pageBack = $(opt.paginate.pageBack);
		$paginateCount = $(opt.paginate.paginateCount);
		$renderGraph = $(opt.statistics.renderGraph);
		$statPlot = $(opt.statistics.statPlot);
		$searchToggle = $(opt.searchToggle);
		$searchPanel = $(opt.searchPanel);
		$searchResults = $(opt.searchResults);
		$paginateNav = $('#paginate-nav');
		$imageArea = $('#view-disc-image-container');
		$dashboardViewArea = $('#dashboard-view-area');
		$sidebarLoading = $('.sidebar-loading');
		
		if (opt.paginate.displayCount) {
			setPaginateCount(opt.paginate.displayCount);
			$paginateCount.val(paginateOptions.displayCount);
		}
		
	   	/* Logic */
	    refPageTop = $('body').outerHeight() - $('body').height() - $('nav').outerHeight();
	    refContBottom = refPageTop + $inventoryContainer.outerHeight() - $inventoryHeader.outerHeight();
		
		/*
		* ZumpSort Initialization
		*/
		mySort = new ZumpSort({
			dynamicHeader: opt.sort.dynamicHeader,
		    sortToggle: opt.sort.sortToggle,
		    sortContainer: opt.sort.sortContainer,
		    addSortTrigger: opt.sort.addSortTrigger,
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
		        {text: 'Fade', property: 'fade', type: 'number'},
		        {text: 'Condition', property: 'condition', type: 'number'},
		        {text: 'Create Date', property: 'createDate', type: 'date'}
		    ],
		    triggerSort: showDiscs,
		    init: opt.sort.defaultSort
		});
		
		/*
		* ZumpFilter Initialization
		*/
		myFilter = new ZumpFilter({
			filterToggle: opt.filter.filterToggle,
			currentFilterContainer: opt.filter.currentFilterContainer,
		    filterContainer: opt.filter.filterContainer,
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
		        {text: 'Fade', property: 'fade'},
		        {text: 'Condition', property: 'condition'}
		    ],
		    onFilterChange: function() {
		        zumpDashboard.updateFilter();
		    }
		});
		
		/*
		* ZumpGallery Initialization
		*/
		myGallery = new ZumpGallery({
			galleryContainer: opt.gallery.galleryContainer,
			galleryCount: opt.gallery.galleryCount,
			gallerySlider: opt.gallery.gallerySlider,
			galleryMenu: opt.gallery.galleryMenu,
			galleryRowCount: opt.gallery.galleryRowCount,
			onItemClick: function(id) {
				showDiscView(id);
			},
			onGalleryChange: function() {
				resizeResultHeader();
			}
		});
		
		$galleryMenu = $(opt.gallery.galleryMenu);
		
		/*
		* Initialize Listeners
		*/
		initListeners(opt);
		
		if (opt.defaultView) {
			$('#dashboard-view-switch').dzTriSwitch('change', opt.defaultView);
		} else {
			$('#dashboard-view-switch').dzTriSwitch('change', 'inventory');
		}
	}
	
	this.bindPrivateListeners = function() {
		bindListeners();
	}
	
	this.unbindPrivateListeners = function() {
		unbindListeners();
	}
	
	this.isPublicMode = function() {
		return publicList;
	}
	
	this.CurrentUser = function() {
		return currentUser;
	}
	
	this.CurrentDisc = function() {
		return discViewDisc;
	}
	
	this.setView = function(view) {
		$('.dz-switch-opt[value="' + view + '"]').trigger('click');
	}
	
	this.Gallery = function() {
		return myGallery;
	}
	
	this.Filter = function() {
		return myFilter;
	}
	
	this.showDiscs = function(maintainPage) {
		showDiscs(maintainPage);
	}
	
	this.showPublicDisc = function(discId, fail) {
		showDiscView(discId, fail);
	}
	
	this.initDiscList = function(discs) {
		if (!publicList) {
			zumpDashboard.setDiscList(discs);
		}
	}
	
	this.setDiscList = function(discs, user) {
		unfilteredList = discs;
		
		if (typeof(user) !== 'undefined') {
			publicList = true;
			currentUser = user._id;
			$('#public-dashboard').text(user.username).attr('userId', user._id);
			$('.dashboard-title').show();
		} else {
			publicList = false;
			currentUser = userAccount._id;
			$('#public-dashboard').text('').attr('userId','');
			$('.dashboard-title').hide();
		}
		
		forceRefresh = true;
		myFilter.clearFilters();
		this.updateFilter(true);
	}
	
	this.updateSingleDisc = function(upDisc) {
		unfilteredList = _.filter(unfilteredList, function(disc){
			return disc._id != upDisc._id;
		});
		unfilteredList.push(upDisc);
		updateDiscItem(upDisc);
		if (discViewDisc._id == upDisc._id) forceRefresh = true;
	}
	
	/*
	* Filters the discs and redraws the results table
	*/
	this.updateFilter = function(generateFilters) {
		$filterCount.text(myFilter.getCount() > 0 ? myFilter.getCount() : '');
		discList = myFilter.filter(unfilteredList, generateFilters);
		showDiscs();
	}
	
	/*
	* Forces the UI to update based on screen size
	*/
	this.doResize = function() {
		resizeDashboard();
	}
	
	/*
	* Shows the gallery view
	*/
	this.showDiscGallery = function() {
		var sorted = mySort.doSort(discList);
		myGallery.showGallery();
	}
	
	/*
	* Hides the gallery view
	*/
	this.hideDiscGallery = function() {
		myGallery.hideGallery();
	}
	
	//----------------------\
    // Private Functions
    //----------------------/
	
	
	var resizeDashboard = function() {
		resizeResultHeader();
	    resizeTagLists();
	}
	
	/*
	* Global search method
	*/
	var doSearch = function() {
		var search = $searchBar.val();
		$searchResults.empty();
		containSearch(search, _.pluck(searchFields, 'property'), function(prop, list) {
			if (!list.length) return;
			
			var field = _.findWhere(searchFields, {property: prop});
			updateSearchResults(field.property, field.text, list);
		});
		
		if (!$searchResults.children().length && search.length) {
			$searchResults.append('<li class="sidebar-item-none"><div>No Results</div></li>');
		}
		
		$searchPanel.find($sidebarLoading).css('display', 'none');
	}
	
	/*
	* Shows search based on results
	*/
	var updateSearchResults = function(prop, propText, list) {
		var $container = $('<div class="result-section" id="results-' + prop + '">' +
                            '<div class="result-header">' + propText + '</div>' + 
                            '<div class="result-section-output">' + 
                            '</div>' + 
                        '</div>');
		var $output = $container.children('.result-section-output');
		
		_.each(list, function(result) {
			$output.append(generateResultItem(result));
		});
		
		$searchResults.append($container);
	}
	
	var clearSearchResults = function() {
		$('.result-section').find('li').remove();
	}

	/*
	* Generates the HTML for a search result item
	*/
	function generateResultItem(item) {
		return '<li>' + item + '<i class="fa fa-reply fa-search-results"></i></li>';
	}
	
	/*
	* Returns a list of properties for the given disc list
	*/
	function getProperties(prop) {
		var list = [];
		if (unfilteredList.length && _.isArray(unfilteredList[0][prop])) {
			var arrList = _.pluck(unfilteredList, prop);
			_.each(arrList, function(arr) { 
				list = list.concat(arr);	
			});
		} else {
			list = _.pluck(unfilteredList,  prop);
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
			return typeof(item) !== 'undefined' && item.toLowerCase().indexOf(val.toLowerCase()) >= 0;	
		});
		return filtered;
	}
	
	var changeView = function(view) {
		var $view = $('#view-' + view);
	    var $curView = $('.dashboard-view:visible');
	   	
	   	if ($view.length) {
	   		
		   	if (!$curView.length) {
		        $view.fadeIn(100, function() {
		        	onViewChange(view);
		        	activeView = view;
		        });
		        return;
		   	}
	   
	   		if (!$view.is(':visible')) {
	   			$curView.fadeOut(100, function() {
	   				preViewChange(view);
		            $view.fadeIn(100, function() {
						resizeDashboard();
	        			onViewChange(view);
	        			activeView = view;
		            });
		       	});
	   		}
	   	}
	}
	
	var preViewChange = function(view) {
		if (view == 'gallery') {
			$inventoryHeader.show();
			$paginateNav.hide();
			$galleryMenu.show();
			$paginateCount.attr('disabled', 'disabled');
		} else if (view == 'inventory') {
			$inventoryHeader.show();
			$paginateNav.show();
			$galleryMenu.hide();
			$paginateCount.removeAttr('disabled');
		} else if (view == 'statistics') {
			$inventoryHeader.hide();
		}
	}
	
	var onViewChange = function(view) {
		if (view == 'gallery') {
    	    zumpDashboard.showDiscGallery();
		} else if (view == 'inventory') {
		} else if (view == 'statistics') {
		}
	}
	
	/*
	* Initializes all of the listeners
	*/
	var initListeners = function(opt) {
		$(window).on('resize', function() {
	        resizeDashboard();
	   	});
	   	
	   	$('#dashboard-view-switch').dzTriSwitch({
	   		init: {
	   			onChange: function(value) {
		        	changeView(value);
		        }
	   		}
	    });
	    
	    /**************************
		* Handlers for search
		***************************/
		
	    $searchToggle.click(function(e) {
	    	toggleSidebar('#sidebar-search', function() {
	    		$searchBar.focus();
	    	});
	    });
	    
	    $searchBar.on('keyup', function(e) {
	    	delay(function() {
				$searchPanel.find($sidebarLoading).css('display', 'table');
				doSearch();
			}, 100 );
	    }).click(function(e) {
	    	e.stopPropagation();
	    });
		
		$(document).on('click', '.result-section-output li', function(e) {
			e.stopPropagation();
			var $parent = $(this).parents('.result-section');
			var option = $parent.attr('id').match(/-([a-zA-Z]+)/)[1];
			var val = $(this).text();
			
			$searchBar.val('');
			clearSearchResults();
			myFilter.clearFilters();
			myFilter.pushFilterItem(option, val, true);
			toggleSidebar('#sidebar-filter');
		});
	
		// $(document).on('vmouseup', 'input[type="text"]', function(e) {
		// 	e.stopImmediatePropagation();
		// 	e.stopPropagation();
		// 	return false;
		// });
	   	
	   	/**************************
		* Handlers for pagination
		***************************/
	   	$pageBack.click(function(){
			paginateOptions.currentPage -= 1;	
			showDiscs(true);
		});
		
		$pageForward.click(function(){
			paginateOptions.currentPage += 1;
			showDiscs(true);	
		});
		
		$paginateCount.on('change', function(){
			var val = $(this).val();
			setPaginateCount(val);
			
			showDiscs();
		});
	
		$(document).on('click', '.page-dynamic:not(.active)', function() {
			paginateOptions.currentPage = parseInt($(this).text(), 10);
			showDiscs(true);
		});
		
		/**************************
		* Handlers for dashboard
		***************************/
		$('#public-dashboard').click(function(e) {
			mySocial.showProfile($(this).attr('userId'));
		});
		
		$(document).on('click', '.filterable[filterable="true"]', function(e) {
			var filterOn = $(this).attr('filterOn');
			var property = $(this).attr('prop');
			
			if (filterOn.length && property.length) {
				myFilter.pushFilterItem(property, filterOn);
				changeSidebar('#sidebar-filter');
				changePage('#pg-dashboard');
			}
		});
		
		myLink = new ZumpLink({
			selector: '.fa-copy-link',
			path: function($item) {
				return 'disc/' + $item.attr('discid');
			}
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
				isScrolling();
			}
	    	
			if (isFixed &&  curTop < refPageTop) {
				$inventoryHeader.removeClass('header-fixed');
				isFixed = false;
				isAtTop();
			}
	    });
	   	
	   	$(document).on('click', '.fa-delete-disc-item', function() {
			var discId = $(this).parents('.disc-item').attr('discid');
			var body = {
				text: 'Are you sure you want to delete this disc and all of its data?'
			};
			generateConfirmationModal('WARNING!', body, 'Delete', function() {
				deleteDisc(discId, function(success, data) {
					if (success) {
						myNotifier.executeEvent('discDeleted', data);
					} else {
						handleError(data);
					}
				});
			});
		});
		
		$(document).on('click', '.fa-edit-disc-item', function() {
			var discId = $(this).parents('.disc-item').attr('discid');
			var nav = '#pg-modify-disc';
			myEditor.setModifyType("Edit");
			myEditor.setDiscId(discId);
			changePage(nav);
		});
		 
		$(document).on('click', '.share-disc-item', function() {
			var $this = $(this);
			var disc = getDisc($this.attr('discid'));
			$this.removeClass('fa-facebook-square').addClass('fa-spinner').addClass('fa-pulse').addClass('disabled');
			shareFacebook(disc._id, function() {
				$this.removeClass('fa-spinner').removeClass('fa-pulse').addClass('fa-facebook-square');
			});
		});
		 
		$(document).on('click', '.fa-visible-disc-item', function() {
			var disc = getDisc($(this).parents('.disc-item').attr('discid'));
			disc.visible = !disc.visible;
			putDisc(disc, function(success, retData) {
				if (success) {
					myNotifier.executeEvent('discUpdated', retData);
				} else {
					handleError(retData);
				}
			});
		});
		
		$(document).on('mouseenter', '.disc-info-name', function(e) {
			$('.view-action').remove();
			$(this).prepend('<div class="view-action"><i class="fa fa-binoculars fa-sm"></i></div>');
			$(this).find('.view-action').stop().animate({
				'margin-left': '0px'
			}, 100);
		}).on('mouseleave', '.disc-info-name', function() {
			var $action = $(this).find('.view-action');
			$action.stop().animate({
				'margin-left': '-' + $action.outerWidth(true)
			}, 100, function() {
				$action.remove();
			})
		});
		
		$(document).on('click', '.disc-info-name', function() {
			var discId = $(this).parents('.disc-item').attr('discId');
			showDiscView(discId);
		});
		 
		$(document).on('click', '.disc-content-image', function(e) {
			var discItem = $(this).parents('.disc-item');
			var disc = getDisc(discItem.attr('discid'));
			showDiscLightbox(disc);
		});
		
		/**************************
		* Handlers for statistics
		***************************/
		$('#render-graph').click(function() {
			var prop = $('#graph-base').val();
			var type = $('#graph-type').val();
			generatePlot(prop, type);
		});
		
		/**************************
		* Handlers for Disc View
		***************************/
		$(document).on('click', '#view-disc-image-container .image-preview', function(e) {
	        $imageArea.find('.image-preview.active').removeClass('active');
	        $(this).addClass('active');
	        var id = $(this).children('img').attr('imageId');
	        var img = _.findWhere(discViewDisc.imageList, {_id: id});
	        if (img) {
	            $('#view-disc-image').attr('src', '/files/' + img.fileId);
	        }
	    });
	    
	    $('#view-disc-owner').click(function() {
	    	mySocial.showProfile($(this).attr('userId'));
	    });
	    
	}
	
	
	/**************************
	* Dashboard
	***************************/
	var isScrolling = function() {
		myLink.doResize();
	}
	
	var isAtTop = function() {
		myLink.doResize();
	}
	
	var bindListeners = function() {
		$(document).on('click', '#view-disc-edit', function() {
			var discId = $(this).attr('discId');
			var nav = '#pg-modify-disc';
			myEditor.setModifyType("Edit");
			myEditor.setDiscId(discId);
			changePage(nav);
		});
	}
	
	var unbindListeners = function() {
		$(document).off('click', '#view-disc-edit');
	}
	
	var showDiscLightbox = function(disc) {
		var zumpLightbox = new ZumpLightbox({
			content: {
				imageArray: disc.imageList,
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
	
	/*
	* Ensures the header width maintains the result view width
	*/
	var resizeResultHeader = function() {
		if ($dashboardViewArea.is(':visible')) {
			$inventoryHeader.css({
				'width': $dashboardViewArea.outerWidth()
			});
		}
	}
	
	/*
	* Adds "more" button if tags exceed available width in dashboard view
	*/
	var resizeTagLists = function() {
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
	* Reloads a single disc item
	*/
	var updateDiscItem = function(disc) {
		var $discItem = $('div.disc-item[discId="' + disc._id + '"]');
		if ($discItem.length) {
			$discItem.empty().append(generateDiscData(disc));
			
			// Initialize notes tooltip
			$discItem.find('i[tt="notes"]').tooltip(generateTooltipOptions('left', 'hover', disc.notes, 'auto'));
			$discItem.find('i[tt="createDate"]').tooltip(generateTooltipOptions('left', 'hover', 'Added on ' + parseDate(disc.createDate), 'auto'));
			
			// resizes tag lists
			resizeTagLists();
		}
	}
	
	var stringifyDisc = function(disc) {
		var discString = {};
		
		discString.type = getSafe(disc.type, '');
		discString.material = getSafe(disc.material, '');
		discString.color = getSafe(disc.color, '');
		discString.weight = getSafe(disc.weight, '');
		discString.condition = getSafe(disc.condition, '');
		discString.speed = getSafe(disc.speed, '');
		discString.glide = getSafe(disc.glide, '');
		discString.turn = getSafe(disc.turn, '');
		discString.fade = getSafe(disc.fade, '');
		discString.notes = getSafe(disc.notes, '');
		
		return discString;
	}
	
	var showDiscView = function(discId, fail) {
		var disc = getDisc(discId);
		if (isDef(disc)) {
			showDisc(disc);
		}
		else {
			getDiscById(discId, function(success, disc) {
				if (success) {
					 showDisc(disc);
				} else {
					if (fail) fail('Unknown disc identifier.');
				}
			});
		}
	}
	
	var showDisc = function(disc) {
		
		if (discViewDisc && discViewDisc._id == disc._id && !forceRefresh) {
			changePage('#pg-disc-view');
			return;
		}
		
		forceRefresh = false;
		discViewDisc = disc;
		
		if (isUserOwned(disc._id)) {
			$('#view-disc-edit').closest('.page-title-btn').show();
			$('#view-disc-edit').attr('discId', discViewDisc._id);
			myDashboard.bindPrivateListeners();
		} else {
			$('#view-disc-edit').closest('.page-title-btn').hide();
			$('#view-disc-edit').attr('discId', '');
			myDashboard.unbindPrivateListeners();
		}
		
		var discString = stringifyDisc(disc);
		
		$('#view-disc-share').attr('discId', discViewDisc._id);
		$('#view-disc-link').attr('discId', discViewDisc._id);
		$('#view-disc-title').text(disc.brand + ' ' + disc.name);
		$('#view-disc-notes').text(discString.notes.length ? discString.notes : '-');
		
		setDiscViewItem($('#view-disc-type'), discString.type, '', '-');
		setDiscViewItem($('#view-disc-material'), discString.material, '', '-');
		setDiscViewItem($('#view-disc-color'), discString.color, '', '-');
		setDiscViewItem($('#view-disc-weight'), discString.weight, 'g', '-');
		setDiscViewItem($('#view-disc-condition'), discString.condition, '/10', '-');
		setDiscViewItem($('#view-disc-speed'), discString.speed, '', '--');
		setDiscViewItem($('#view-disc-glide'), discString.glide, '', '--');
		setDiscViewItem($('#view-disc-turn'), discString.turn, '', '--');
		setDiscViewItem($('#view-disc-fade'), discString.fade, '', '--');
		
		var user = userCache[disc.userId];
		if (isDef(user)) {
			setDiscOwner(user);
		} else {
			getUser(disc.userId, function(success, discUser) {
				if (success) {
					userCache[discUser._id] = discUser;
					setDiscOwner(discUser);
				} else {
					handleError(discUser);
				}
			});
		}
		
		var $tagArea = $('#view-disc-tagList');
		$tagArea.empty();
		_.each(disc.tagList, function(tag) {
			$tagArea.append('<div class="tag-item filterable" filterable="true" prop="tagList" filterOn="' + tag + '" tagval="' + tag + '">' +
	                            '<p class="tag-item-text">' + tag + '</p>' +
	                        '</div>');
		});
		
		clearDiscViewImages();
		updateDiscViewImages(disc);
		
		changePage('#pg-disc-view');
	}
	
	var setDiscOwner = function(user) {
		var $owner = $('#view-disc-owner');
		$owner.text(user.username).attr('userId', user._id).addClass('dz-link dz-color');
	}
	
	var setDiscViewItem = function($elem, val, append, def) {
		$elem.text(val.length ? val + append : def).attr('filterable', val.length ? 'true' : 'false').attr('filterOn', val ? val : '');
	}
	
	var clearDiscViewImages = function() {
		$imageArea.empty();
		$('#view-disc-image').attr('src', '/static/logo/logo_small.svg');
		$imageArea.append('<div class="image-item-container logo-placeholder">' +
		                '<div class="image-item">' +
		                    '<div class="image-preview active">' +
		                        '<img src="/static/logo/logo_small.svg" class="fit-parent">' +
		                    '</div>' +
		                '</div>' +
		            '</div>');
	}
	
	var updateDiscViewImages = function(disc) {
		if (disc.imageList.length) {
			$imageArea.empty();
			_.each(disc.imageList, function(image) {
				var $image = $('<div class="image-item-container">' +
                                            '<div class="image-item">' +
												'<div class="image-preview">' +
                                                    '<img src="/files/' + image.thumbnailId + '" imageId="' + image._id + '" class="fit-parent">' +
                                                '</div>' +
                                            '</div>' +
                                        '</div>');
				
				if (disc.primaryImage == image._id) {
					$('#view-disc-image').attr('src', '/files/' + image.fileId);
					$image.find('.image-preview').addClass('active');
				} else {
					preloadImage(image.fileId);
				}
				
				$imageArea.append($image);
			});
		}
	}
	
	var preloadImage = function(imageUrl) {
		var image = new Image();
    	image.src = '/files/' + imageUrl;
	}
	
	/*
	* Reloads the results section
	*/
	var showDiscs = function(maintainPage) {
		if (typeof(discList) === 'undefined') return;
		
		if (!maintainPage) {
			paginateOptions.currentPage = 1;
		}
		
		$filterResults.empty();
		var sorted = mySort.doSort(discList);
		myGallery.updateGallery(sorted);
		var paged = paginate(sorted);
		
		if (discList.length) {
			_.each(sorted, function(disc) {
				if (_.contains(paged, disc)) {
					var $discItem = generateDiscTemplate(disc);
					$discItem.find('i[tt="notes"]').tooltip(generateTooltipOptions('left', 'hover', disc.notes, 'auto'));
					$discItem.find('i[tt="createDate"]').tooltip(generateTooltipOptions('left', 'hover', 'Added on ' + parseDate(disc.createDate), 'auto'));
					$filterResults.append($discItem);
				}
			});
		} else {
			$filterResults.append(generateDiscTemplate('No Results'));
		}
		
		updateHeader(sorted.length);
		resizeDashboard();
		renderPlot();
	}
	
	/*
	* Updates the sort header
	*/
	var updateHeader = function(count) {
		$('#results-header-count').text('/ ' + count);
		
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
	* Generaes the container to hold the disc row
	*/
	var generateDiscTemplate = function(disc) {
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
	* Returns the color based on the user preferences
	*/
	var getColorize = function(type) {
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
	* Creates a standard disc data row
	*/
	var generateDiscData = function(disc) {
		var tagHTML = '';
		var tagDropdown = '';
		var tagDropdownInner = '';
		var flightNumbersHTML = '';
		var calendarHTML = '';
		var discImage = getPrimaryDiscImage(disc);
		
		_.each(disc.tagList, function(tag) {
			tagDropdownInner = tagDropdownInner + '<li class="disc-info-tag filterable filterable-text" filterable="true" prop="tagList" filterOn="' + tag + '"><a title="Filter: Tag = ' + tag + '">' + tag + '</a></li>';
			tagHTML = tagHTML + '<span title="Filter: Tag = ' + tag + '" class="disc-info-tag filterable filterable-text" filterable="true" prop="tagList" filterOn="' + tag + '">' + tag + '</span>';
		});
		
		tagDropdown = '<div class="dropdown tag-dropdown" style="display: none">' +
					  	'<button class="btn btn-default dropdown-toggle btn-tag-dropdown" type="button" id="tag-dropdown-menu" data-toggle="dropdown" aria-expanded="false">' + 
					  		'More... <span><i class="fa fa-caret-down"></i></span></button>' +
						  '<ul class="dropdown-menu tag-dropdown-menu" role="menu" aria-labelledby="tag-dropdown-menu">' +
						  tagDropdownInner +
						  '</ul>' +
						'</div>';
		
		var color = getColorize(disc.type);
		
		if (isDef(disc.createDate) && disc.createDate != '') {
			calendarHTML = '<span><i class="fa fa-calendar fa-lg fa-dim fa-disc-date" data-toggle="tooltip" tt="createDate"></i></span>';
		}
	
		if ((typeof disc.speed != 'undefined') || (typeof disc.glide != 'undefined') || (typeof disc.turn != 'undefined') || (typeof disc.fade != 'undefined')) {
			flightNumbersHTML = ((typeof disc.speed != 'undefined') ? '<span title="Filter: Speed = ' + disc.speed + '" class="filterable filterable-text" prop="speed" filterable="true" filteron="' + disc.speed + '">' + disc.speed + '</span>' : '??') + ' | ' +
		                        ((typeof disc.glide != 'undefined') ? '<span title="Filter: Glide = ' + disc.glide + '" class="filterable filterable-text" prop="glide" filterable="true" filteron="' + disc.glide + '">' + disc.glide + '</span>' : '??') +' | ' +
		                        ((typeof disc.turn != 'undefined') ? '<span title="Filter: Turn = ' + disc.turn + '" class="filterable filterable-text" prop="turn" filterable="true" filteron="' + disc.turn + '">' + disc.turn + '</span>' : '??') + ' | ' +
		                        ((typeof disc.fade != 'undefined') ? '<span title="Filter: Fade = ' + disc.fade + '" class="filterable filterable-text" prop="fade" filterable="true" filteron="' + disc.fade + '">' + disc.fade + '</span>' : '??');
		}
		return '<div class="disc-colorize"' + (isDef(color) && userPrefs.colorizeVisibility ? ' style="background-color: ' + color + '"' : ' style="background-color:#FFF"') + '>' + 
	                	'</div>' +
	                    '<div class="disc-content-image-container">' +
	                        '<div class="disc-content-image">' +
	                            '<img src="' + (discImage ? '/files/' + discImage.thumbnailId : '/static/logo/logo_small_faded.svg') + '" />' +
	                        '</div>' +
	                    '</div>' +
	                    '<div class="disc-content-action-container float-right">' +
	                		'<table>' +
	                			'<tbody style="text-align: center;">' +
		                            '<tr class="disc-item-actions-top">' +
		                            	'<td>' +
		                            		calendarHTML +
		                            	'</td>' +
		                                '<td>' +
		                                	(publicList ? '' :
		                                	'<span><i class="fa fa-trash fa-lg fa-dim fa-delete-disc-item" title="Delete Disc"></i></span>') +
		                                '</td>' +
		                            '</tr>' +
		                            '<tr class="disc-item-actions-middle">' +
		                            	'<td>' +
		                            		(disc.visible ?
		                            		'<span><i class="fa fa-link fa-lg fa-dim fa-copy-link" discId="' + disc._id + '" title="Copy Public URL"></i></span>' :
		                                	'') +
		                            	'</td>' +
		                                '<td>' +
		                                	(publicList ? '' :
		                                	'<span><i class="fa fa-pencil fa-lg fa-dim fa-edit-disc-item" title="Edit Disc"></i></span>') +
		                                '</td>' +
		                            '</tr>' +
		                            '<tr class="disc-item-actions-bottom">' +
		                            	'<td>' + 
		                            		(disc.visible ?
		                            		'<span><i class="fa fa-facebook-square fa-lg fa-dim share-disc-item" discId="' + disc._id + '" title="Share Disc"></i></span>' :
		                                	'') +
		                            	'</td>' +
		                                '<td>' +
		                                	(publicList ?
		                                	'' :
		                                	(disc.visible ?
		                                	'<span><i class="fa fa-eye fa-lg fa-dim fa-visible-disc-item" title="Make Private"></i></span>' :
		                                	'<span><i class="fa fa-eye-slash fa-lg fa-dim fa-visible-disc-item" title="Make Public"></i></span>')) +
		                                '</td>' +
		                            '</tr>' +
	                           	'</tbody>' +
	                        '</table>' +
	                    '</div>' +
	                    '<div class="disc-content-info-container">' +
	                        '<div class="disc-info-main-pane">' +
	                            '<div class="disc-info-left-pane div-inline float-left">' +
	                            	(disc.condition ? '<div title="Filter: Condition = ' + disc.condition + '" class="disc-info-condition float-right filterable filterable-text" prop="condition" filterable="true" filteron="' + disc.condition + '">' + disc.condition + '</div>' : '') +
	                            	'<div class="disc-info-name-container float-left">' +
		                                '<div class="disc-info-brand filterable filterable-text" prop="brand" filterable="true" filteron="' + disc.brand + '"">' + disc.brand + '</div>' +
		                                '<div class="disc-info-name">' + disc.name + '</div>' +
	                            	'</div>' +
	                            	'<div class="clearfix"></div>' +
	                            '</div>' +
	                            '<div class="disc-info-right-pane disc-specs div-inline float-left">' +
	                                '<div class="div-inline float-left div-split-horiz">' +
	                                	'<div class="disc-info-item">' +
		                                	'<span class="disc-info-label">Type:</span>' +
		                                	'<span class="disc-info-value' + (disc.type ? ' filterable filterable-text" prop="type" filterable="true" filteron="' + disc.type + '" title="Filter: Type = ' + disc.type + '"' : '"' ) + '>' + (disc.type ? disc.type : '') + '</span>' +
	                                	'</div>' +
	                                	'<div class="disc-info-item">' +
		                                	'<span class="disc-info-label">Material:</span>' +
		                                	'<span class="disc-info-value' + (disc.material ? ' filterable filterable-text" prop="material" filterable="true" filteron="' + disc.material + '" title="Filter: Material = ' + disc.material + '"' : '"' ) + '>' + (disc.material ? disc.material : '') + '</span>' +
	                                	'</div>' +
	                                '</div>' +
	                                '<div class="div-inline float-left div-split-horiz">' +
	                                	'<div class="disc-info-item">' +
		                                	'<span class="disc-info-label">Color:</span>' +
		                                	'<span class="disc-info-value' + (disc.color ? ' filterable filterable-text" prop="color" filterable="true" filteron="' + disc.color + '" title="Filter: Color = ' + disc.color + '"' : '"' ) + '>' + (disc.color ? disc.color : '') + '</span>' +
	                                	'</div>' +
	                                	'<div class="disc-info-item">' +
		                                	'<span class="disc-info-label">Weight:</span>' +
		                                	'<span class="disc-info-value' + (disc.weight ? ' filterable filterable-text" prop="weight" filterable="true" filteron="' + disc.weight + '" title="Filter: Weight = ' + disc.weight + '"' : '"' ) + '>' + ((typeof disc.weight != 'undefined') ? disc.weight + ' g': '') + '</span>' +
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
	
	/**************************
	* Pagination
	***************************/
	
	/*
	* Sets the paginate count
	*/
	var setPaginateCount = function(val) {
		val = parseInt(val);
		if (_.isNaN(val)) {
			paginateOptions.displayCount = -1;
			paginateOptions.currentPage = 1;
		} else {
			paginateOptions.displayCount = parseInt(val);
		}
	}
	
	/*
	* Paginates the provided array
	*/
	var paginate = function(toPaginate) {
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
	
	/**************************
	* Statistics
	***************************/
	
	/*
	* Generates the plot based on the property and type
	*/
	function generatePlot(prop, type) {
		var text = myFilter.getText(prop);
		
		if (typeof text !== 'undefined') {
			showPlot(prop, text, type);
		}
	}
	
	/*
	* Rerenders the current plot
	*/
	function renderPlot() {
		var chart = $statPlot.CanvasJSChart();
		if (typeof chart !== 'undefined') {
			showPlot();
		}
	}
	
	/*
	* Shows the plot based on the property, title and chart type
	*/
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
	   
		var plotData = _.groupBy(myFilter.filter(discList, false), chartData.chartProp);
	    var data = [];
	    var isSingleUnit = true;
	    
	    for(var group in plotData) {
	    	if (group == 'undefined') continue;
	    	if (isSingleUnit && plotData[group].length > 1) isSingleUnit = false;
	        data.push({
	           label: group,
	           y: plotData[group].length,
	           legendText: group
	        });
	    }
	    
	    var toChart = getChartData(chartData.chartType, 
	    	chartData.chartPropName, data.length == 1, isSingleUnit);
	    toChart.data[0].dataPoints = data;
	    
	   $statPlot.CanvasJSChart(toChart);
	   
	}
	
	/*
	* Returns the properties object based on chart type
	*/
	function getChartData(type, propName, isSingleCol, isSingleUnit) {
		var properties = { 
			exportFileName: "disc|zump - Discs by " + propName,
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
	
	/*
	* Returns a disc based on the id
	*/
	function getDisc(id) {
		return _.first(_.where(unfilteredList, {'_id' : id}));
	}
	
	this.init(opt);
}

/*
* Name: ZumpTutorial v2.0
* DAte: 10/13/15
*/
var ZumpTutorial = function(opt) {
	
	//----------------------\
    // Javascript Objects
    //----------------------/
	var zumpTutorial = this;
	var currentPage = 0;
	var $tutClick;
	var clickActive = true;
	var pageCache = {};
	var pageData = [
		{
			title: 'Welcome!',
			body: 'Welcome to <b>disc|zump</b>! This tutorial will give you a brief introduction' +
				' into the user interface so that you can become familiar with each feature.' + 
				' You can skip this tutorial by clicking the \'X\'.' + 
				'<br\><br\>' + 
				'<b>Hint:</b> You may access this tutorial at any time in the dropdown menu at the' + 
				' upper right corner.',
			bgColor: '#ffba00',
			position: 'bottom-right',
			open: function() {
				highlightNone();
			},
			close: function() {
				
			}
		},
		{
			title: 'Home Menu',
			body: 'Use the home tab on the left panel to access your personal <b>dashboard</b>, <b>add new' +
				' discs</b>, and update your account <b>settings</b> and <b>preferences</b>.',
			bgColor: '#ffba00',
			position: 'bottom-right',
			open: function() {
				highlightSidePanel()
			},
			close: function() {
				
			}
		},
		{
			title: 'Dashboard',
			body: 'Use the dashboard to view an inventory. Here you will have access' + 
				' to viewing a collection in three different ways - <b>list view</b>,' +
				' <b>gallery view</b> and <b>statistics view</b>. You can also modify ' +
				' the way your list is viewed by <b>sorting</b> and <b>filtering</b> any way' + 
				' you\'d like.',
			bgColor: '#ffba00',
			position: 'bottom-left',
			open: function() {
				showClick($('li.sidebar-select[pg-select="#pg-dashboard"]'), function() {
					changePage('#pg-dashboard');
					myDashboard.setView('inventory');
					highlightPage();
					getCache().animIndex = 1;
					getCache().animId = setInterval(function() {
						var id = getCache().animIndex;
						
						if (id == 0) {
							showClick($('.dz-switch-opt[value="inventory"]'), function() {
								myDashboard.setView('inventory');
							});
							id++;
						} else if (id == 1) {
							showClick($('.dz-switch-opt[value="gallery"]'), function() {
								myDashboard.setView('gallery');
							});
							id++;
						} else if (id == 2) {
							showClick($('.dz-switch-opt[value="statistics"]'), function() {
								myDashboard.setView('statistics');
							});
							id = 0;
						}
						
						getCache().animIndex = id;
					}, 2000);
				});
			},
			close: function() {
				clearInterval(getCache().animId);
				cancelClick();
				myDashboard.setView('inventory');
			}
		},
		{
			title: 'Sorting',
			body: 'You can adjust the order in which an inventory is displayed' + 
				' through the sort menu. Add more complex sorts to organize the data' +
				' to your preference and drag current sorts to reorder.',
			bgColor: '#ffba00',
			position: 'bottom-left',
			open: function() {
				highlightPage();
				changePage('#pg-dashboard', function() {
					showClick($('#results-header-sort'), function() {
						$('#results-header-sort').trigger('click');
					});
				});
			},
			close: function() {
				$('#results-header-sort').trigger('click');
			}
		},
		{
			title: 'Filtering',
			body: 'You can reduce the discs displayed in an inventory by filtering' +
				' on a variety of properties associated with a collection. Browse through' +
				' the many options available within the filter tab.' + 
				'<br/><br/>' +
				'<b>Hint:</b> Take advantage of <i>tagging</i> your discs to create a quick' +
				' way to see groupings of discs through the tag filter.',
			bgColor: '#ffba00',
			position: 'bottom-right',
			open: function() {
				highlightSidePanel();
				showClick($('#dashboard-filter-toggle'), function() {
					toggleSidebar('#sidebar-filter');
					getCache().animIndex = 0;
					var $filter = $('#filter-container-tagList');
					getCache().animId = setInterval(function() {
						var id = getCache().animIndex;
						
						if (id == 0) {
							showClick($filter.children('.filter-item'), function() {
								$filter.children('.filter-item').trigger('click');
							})
							id++;
						} else if (id == 1) {
							showClick($filter.find('.filter-option').first(), function() {
								$filter.find('.filter-option').first().trigger('click');
							});
							id++;
						} else if (id == 2) {
							showClick($('.clear-all-filters'), function() {
									myDashboard.Filter().clearFilters();
									$filter.children('.filter-item').trigger('click');
							});
							id = 0;
						}
						
						getCache().animIndex = id;
					}, 2000);
				});
			},
			close: function() {
				clearInterval(getCache().animId);
				cancelClick();
				myDashboard.Filter().clearFilters();
				toggleSidebar('#sidebar-filter');
			}
		},
		{
			title: 'Searching',
			body: 'Use the search panel as an alternative to the filter for a quick' +
				' way to find discs based on a single property (i.e. the disc name).',
			bgColor: '#ffba00',
			position: 'bottom-right',
			open: function() {
				highlightSidePanel();
				showClick($('#inventory-search-toggle'), function() {
					toggleSidebar('#sidebar-search');
					getCache().animIndex = 0;
					getCache().animId = setInterval(function() {
						var id = getCache().animIndex;
						
						if (id == 0) {
							$('#search-dashboard').val('d').trigger('keyup');
							id++;
						} else if (id == 1) {
							$('#search-dashboard').val('dr').trigger('keyup');
							id++;
						} else if (id == 2) {
							$('#search-dashboard').val('dri').trigger('keyup');
							id++;
						} else if (id == 3) {
							$('#search-dashboard').val('').trigger('keyup');
							id = 0;
						}
						
						getCache().animIndex = id;
					}, 1000);
				});
			},
			close: function() {
				clearInterval(getCache().animId);
				$('#search-dashboard').val('').trigger('keyup');
				toggleSidebar('#sidebar-search');
			}
		},
		{
			title: 'Social: Inbox',
			body: 'Send and receive messages to other disc|zump users. Use the inbox' + 
				' panel to access current message threads.',
			bgColor: '#ffba00',
			position: 'bottom-right',
			open: function() {
				highlightSidePanel();
				showClick($('#select-inbox-icon'), function() {
					toggleSidebar('#sidebar-inbox');
				});
			},
			close: function() {
				toggleSidebar('#sidebar-inbox');
			}
		},
		{
			title: 'Social: Profiles',
			body: 'Use the profile panel to search for other disc|zump users. Search' +
				' by username or first/last name. View profiles and access the ability' +
				' to send another user a message or view the user\'s public disc inventory.',
			bgColor: '#ffba00',
			position: 'bottom-right',
			open: function() {
				highlightSidePanel();
				showClick($('#select-profile-icon'), function() {
					toggleSidebar('#sidebar-profile');
				});
			},
			close: function() {
				toggleSidebar('#sidebar-profile');
			}
		},
		{
			title: 'Enjoy!',
			body: 'That completes the tutorial. If you ever need to access the tutorial' +
				' in the future, you can restart it by clicking the <b>Tutorial</b> item' +
				' in the upper right navigation menu.<br/><br/><a class="tut-close" style="cursor: pointer">Continue to Dashboard!</a>',
			bgColor: '#ffba00',
			position: 'bottom-left',
			open: function() {
				highlightPage();
			},
			close: function() {
			}
		}
		
	];
	
	//----------------------\
    // JQuery Objects
    //----------------------/
    var $tutorialContainer;
    var $tutorialBackdrop;
    var $tutorialAnimator;
    var $tutorialBack;
    var $tutorialNext;
    var $tutorialClose;
	
	//----------------------\
    // Protoype Functions
    //----------------------/
    this.init = function(opt) {
    	initTutorial();
    	
    	return zumpTutorial;
    }
    
    this.showTutorial = function() {
    	$('body').addClass('tutorial-active').append($tutorialBackdrop);
    	updateContent();
    }
    
    //----------------------\
    // Private Functions
    //----------------------/
    var initTutorial = function() {
    	$tutorialBackdrop = $('<div class="tutorial-backdrop"></div>');
    	$tutorialAnimator = $('<div class="tutorial-animator"></div>');
    	$tutorialContainer = $('<div class="tutorial-container">' +
            '<div class="tutorial-section tutorial-header">' +
                '<div><span class="tut-header"> </span><span class="pull-right"><i class="fa fa-close tut-close" title="Exit Tutorial"></i></span></div>' +
            '</div>' +
            '<div class="tutorial-body">' +
            '</div>' +
            '<div class="tutorial-section tutorial-footer">' +
                '<div><span><i class="fa fa-arrow-left tut-back" title="Back"></i></span><span class="float-right"><i class="fa fa-arrow-right tut-next" title="Next"></i></span></div>' +
            '</div>' +
        '</div>');
    	
    	$tutorialBackdrop.append($tutorialAnimator);
    	$tutorialBackdrop.append($tutorialContainer);
    	
    	$tutorialBack = $tutorialContainer.find('.tut-back');
    	$tutorialNext = $tutorialContainer.find('.tut-next');
    	$tutorialClose = $tutorialContainer.find('.tut-close');
    	initializeListeners();
    }
    
    var initializeListeners = function() {
    	$tutorialBack.click(function() {
    		pageBack();
    	});
    	
    	$tutorialNext.click(function() {
    		pageNext();
    	});
    	
    	$(document).on('click', '.tut-close', function() {
    		exitTutorial();
    	});
    }
    
    var cancelClick = function() {
    	clickActive = false;
    	$tutClick.stop().remove();
    }
    
    var showClick = function($element, callback) {
    	$tutClick = $('<div class="tutorial-click"></div>');
    	var startLeft = $element.offset().left + ($element.width() / 2);
    	var startTop =  $element.offset().top + ($element.height() / 2);
    	
    	$tutClick.css({
    		left: startLeft,
    		top: startTop
    	});
    	
    	$('body').append($tutClick);
    	
    	clickActive = true;
    	$tutClick.animate({
			width: '80px',
			height: '80px',
			top: startTop - 40,
			left: startLeft - 40,
			opacity: 0
		}, 500, function() {
    		$tutClick.remove();
    		if (clickActive) callback();
		});
    }
    
    var exitTutorial = function() {
    	pageData[currentPage].close();
    	$('body').removeClass('tutorial-active');
    	$tutorialBackdrop.remove();
    	myDashboard.doResize();
		changePage('#pg-dashboard');
    	
    }
    
    var pageNext = function() {
    	if (currentPage < pageData.length - 1) {
    		pageData[currentPage].close();
    		currentPage++;
    		
    		updateContent();
    	}
    }
    
    var pageBack = function() {
    	if (currentPage > 0) {
    		pageData[currentPage].close();
    		currentPage--;
    		
    		updateContent();
    	}
    }
    
    var updateContent = function() {
    	if (currentPage == 0) {
    		$tutorialBack.hide();
    		$tutorialNext.show();
    	} else if (currentPage == pageData.length - 1) {
    		$tutorialBack.show();
    		$tutorialNext.hide();
    	} else {
    		$tutorialBack.show();
    		$tutorialNext.show();
    	}
    	
    	var page = pageData[currentPage];
    	
    	$tutorialContainer.find('.tutorial-header').css('background-color', page.bgColor);
    	$tutorialContainer.find('.tut-header').text(page.title);
    	$tutorialContainer.find('.tutorial-body').empty().append(page.body);
    	
    	if (page.position == 'bottom-left') {
    		$tutorialContainer.css({
    			left: '10%',
    			right: 'auto',
    			bottom: '10%',
    			top: 'auto'
    		});
    	} else if (page.position == 'bottom-right') {
    		$tutorialContainer.css({
    			left: 'auto',
    			right: '10%',
    			bottom: '10%',
    			top: 'auto'
    		});
    	}
    	
    	page.open();
    }
    
    var highlightNone = function() {
    	$tutorialAnimator.css({
    		right: 'auto',
    		left: 0,
    		width: '100%'
    	});
    }
    
    var highlightSidePanel = function() {
    	$tutorialAnimator.css({
    		right: 0,
    		left: 'auto',
    		width: $(window).width() - $sidebar.outerWidth()
    	});
    }
    
    var highlightPage = function() {
    	$tutorialAnimator.css({
    		right: 'auto',
    		left: 0,
    		width: $sidebar.outerWidth()
    	});
    }
    
    var getCache = function() {
    	if (!pageCache[currentPage]) {
    		pageCache[currentPage] = {};
    	}
    	
    	return pageCache[currentPage];
    }
    
    this.init(opt);
	
}

/*
* Name: ZumpSocial
* Date: 09/01/2015
*/
var ZumpSocial = function(opt) {
	
	//----------------------\
    // Javascript Objects
    //----------------------/
    var zumpSocial = this;
    var curUser;
    var isShowing = false;
    var forceUpdate = false;
    
    //----------------------\
    // jQuery Objects
    //----------------------/
    var $sidebarProfile;
    var $searchProfile;
    var $profileList;
    var $searchContainer;
    var $viewContainer;
    var $profileUsername;
    var $profileName;
    var $profilePDGA;
    var $profilePictureContainer;
    var $profileLocation;
    var $profileJoinDate;
    var $profileDiscCount;
    var $profileViewDashboard;
    var $profileViewAll;
    var $profilSendMessage;
    var $sidebarLoading;
    var $discRow;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    this.init = function(opt) {
    	$sidebarProfile = $('#sidebar-profile');
    	$searchProfile = $('#search-profile');
    	$profileList = $('#profile-list');
		$searchContainer = $('#profile-search-container');
		$viewContainer = $('#profile-view');
		$profileUsername = $('#profile-username');
		$profileName = $('#profile-name');
		$profilePDGA = $('#profile-pdga');
		$profilePictureContainer = $('#profile-view-image-container');
		$profileLocation = $('#profile-location');
		$profileJoinDate = $('#profile-join-date');
		$profileDiscCount = $('#profile-disc-count');
		$profileViewDashboard = $('#profile-view-dashboard');
		$profileViewAll = $('#show-dashboard');
		$profilSendMessage = $('#profile-send-message');
		$sidebarLoading = $('.sidebar-loading');
		$discRow = $('.public-disc-row');
    	
    	setupListeners();
    }
    
    this.CurrentUser = function() {
    	return curUser;
    }
    
    this.showProfile = function(userId, fail) {
    	setProfile(userId, fail);
    }
    
    this.onShow = function() {
    	isShowing = true;
    }
    
    this.onHide = function() {
    	isShowing = false;
    }
    
    //----------------------\
    // Private Functions
    //----------------------/
    
    var setupListeners = function() {
    	$searchProfile.on('keyup', function() {
    		var query = $searchProfile.val().trim();
    		if (query.length) {
    			$sidebarProfile.find($sidebarLoading).css('display', 'table');
    			delay(function() {
					getProfiles(query, function(success, queryResult) {
						clearProfileList();
						if (success) {
							if (queryResult.query != query) {
								return false;
							}
							if (queryResult.results.length) {
								_.each(queryResult.results, appendProfileItem);
							} else {
								$profileList.append('<li class="sidebar-item-none"><div>No Results</div></li>');
							}
							$sidebarProfile.find($sidebarLoading).css('display', 'none');
						} else {
							handleError(queryResult);
						}
					});
				}, 500 );
    		} else {
    			clearProfileList();
    			$sidebarProfile.find($sidebarLoading).css('display', 'none');
    		}
			
    	});
    	
    	$(document).on('click', '.profile-item', function() {
    		var selectedUser = $(this).attr('userid');
    		
    		setProfile(selectedUser);
    	});
    	
    	$(document).on('click', '.public-disc-item', function() {
    		var id = $(this).attr('discId');
    		myDashboard.showPublicDisc(id);
    	});
    	
    	$profilSendMessage.click(function() {
    		myMessenger.openThread(curUser);
    	});
    	
    	$profileViewAll.click(showDashboard);
    	
    	$profileViewDashboard.click(showDashboard);
    	
    	$(window).on('resize', resize);
    	
    	myNotifier.addListener('accountChange', zumpSocial, function() {
    		if (curUser == userAccount._id) {
    			updateProfileItem(curUser);
    			forceUpdate = true;
    			
    			if (isShowing) {
    				setProfile(curUser);
    			}
    		}
    	});
    }
    
    var setProfile = function(userId, fail) {
    	
    	if (curUser == userId && !forceUpdate) {
			changePage('#pg-profile');
			return;
		}
		
		forceUpdate = false;
		setLoading(true);
		var user = userCache[userId];
		
		if (userId == userAccount._id) {
			$('.profile-action-container > button').attr('disabled', 'disabled');
		} else {
			$('.profile-action-container > button').removeAttr('disabled');
		}
		
    	if (typeof(user) !== 'undefined') {
    		curUser = userId;
			populateProfile(user);
			changePage('#pg-profile', function() {
				setLoading(false);
			});
    	} else {
    		getUser(userId, function(success, retUser) {
    			if (success) {
    				curUser = userId;
    				userCache[retUser._id] = retUser;
					populateProfile(retUser);
					changePage('#pg-profile', function() {
						setLoading(false);
					});
    			} else {
					if (fail) fail('Unknown profile identifier.');
					setLoading(false);
    			}
    		});
    	}
    }
    
    var showDashboard = function() {
    	getAllPublicDiscsByUser(curUser, function(success, discs) {
			if (success) {
				var user = userCache[curUser];
				myDashboard.setDiscList(discs, user);
				changePage('#pg-dashboard');
			} else {
				handleError(discs);
			}
		});
    }
    
    var populateProfile = function(user) {
    	var firstName = getSafe(user.firstName, '');
    	var lastName = getSafe(user.lastName, '');
    	var fullName = (firstName.length ? firstName + ' ' + lastName : lastName);
    	var pdga = getSafe(user.pdgaNumber, '');
    	var image = getSafe(user.image, '');
    	var dateJoined = parseDate(user.dateJoined);
    	
    	emptyProfileTemplate();
    	getPreview(user);
    	
    	if (fullName.length) {
    		$profileName.text(fullName);
    	}
    	
    	if (pdga.length) {
    		$profilePDGA.text('#' + pdga);
    	}
    	
    	$profilePictureContainer.find('img').attr('src', getUserImage(user));
    	
    	$profileUsername.text(user.username);
    	$profileLocation.text(user.shortLocation);
    	
    	$profileJoinDate.text(dateJoined);
    }
    
    var getPreview = function(user) {
    	$discRow.empty();
    	 getProfilePreview(user._id, function(success, retData) {
            if (success) {
            	if (retData.count > 0) {
            	
	            	$profileDiscCount.text(retData.count);
	            	var previewDiscs = retData.preview;
	                
	                for (var i = 0; i < 5; i++) {
	                    if (previewDiscs.length > i) {
	                        $discRow.append(publicDisc(previewDiscs[i]));
	                    }
	                }
	                resize();
            	}
            } else {
            	handleError(retData);
            }
        });
    }
    
    var resize = function() {
	    $('.public-disc-item').each(function() {
	        var font = 0.15 * parseInt($(this).width());
	        $(this).css({
	            'font-size': font
	        });
	    });
	}
    
    var emptyProfileTemplate = function() {
    	$profileUsername.text('');
    	$profileName.text('');
    	$profilePDGA.text('');
    	$profilePictureContainer.find('img').attr('src','');
    	$profileLocation.text('');
    	$profileJoinDate.text('');
    	$profileDiscCount.text('0');
    }
    
    var updateProfileItem = function(userId) {
    	var user = userCache[userId];
    	var $profileItem = $('.profile-item[userId="' + userId + '"]');
    	
    	if ($profileItem.length) {
    		$profileItem.empty().append(generateProfileItem(user).html());
    	}
    }
    
    var appendProfileItem = function(user) {
        $profileList.append(generateProfileItem(user));
    }
    
    var generateProfileItem = function(user) {
    	var pdga = getSafe(user.pdgaNumber, '');
    	var firstName = getSafe(user.firstName, '');
    	var lastName = getSafe(user.lastName, '');
    	var fullName = (firstName.length ? firstName + ' ' + lastName : lastName);
    	
    	var $profileItem = $('<li class="profile-item hover-active no-select" userId="' + user._id + '"></li>');
    	
    	$profileItem.append('<div class="profile-item-image" style="background-image:url(' + getUserImage(user) + ');"></div>' +
    						'<div class="profile-item-details-container">' +
	                            '<div class="profile-item-details">' +
	                                '<div class="profile-item-details-inner">' +
	                                    '<div class="profile-item-label">' + fullName + '</div>' +
	                                    '<div class="profile-item-text">' + user.username + '</div>' +
	                                    '<div class="profile-item-text">' + (pdga.length ? '#' + pdga : '') + '</div>' +
	                                    '<div class="profile-item-text city-state">' + user.shortLocation + '</div>' +
	                                '</div>' +
	                            '</div>' +
	                        '</div>' +
                            '<div class="clearfix"></div>');
        
        return $profileItem;
    }
    
    var clearProfileList = function() {
    	$profileList.empty();
    }
    
    var publicDisc = function(disc) {
	    var discImage = getPrimaryDiscImage(disc);
	    var $disc = $('<div class="public-disc-item disc-gallery-item" discid="' + disc._id + '"></div>');
	    $disc.append('<div class="disc-gallery-overlay" style="display: none;">' +
	                            '<div class="disc-gallery-text-container">' +
	                                '<div class="disc-gallery-text-wrapper">' +
	                                    '<div class="disc-gallery-overlay-text no-select">' + disc.brand + '</div>' +
	                                    '<div class="disc-gallery-overlay-text no-select">' + disc.name + '</div>' +
	                                '</div>' +
	                            '</div>' +
	                        '</div>' +
	                        '<div class="disc-gallery-image-container">' +
	                            '<div class="disc-gallery-image">' +
	                                '<img src="' + (discImage ? '/files/' + discImage.fileId : '/static/logo/logo_small.svg') + '">' +
	                            '</div>' +
	                        '</div>');
	    return $disc;
	}
    
    this.init(opt);
}

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
	var userCache = {};
	var newMessageCount = 0;
	var activeThread;
	var activateThread;
	var pullCount = 20;
	var sendOnEnter = true;
	var enterLock = true;
	var forceUpdate = false;
	var initialized = false;
	var postFunction;
	var isShowing = false;
	
	var urlRegex = /(https?:\/\/)?([\da-zA-Z\.-]+)\.([a-zA-Z]{2,6}\.?)([\/\w\.#=?-]*)*\/?/g;
	var protocolRegex = /(https?:\/\/)/;
	
    //----------------------\
    // JQuery Objects
    //----------------------/
    
    var $sidebarInbox;
    var $inboxList;
    var $messageContainer;
    var $loadMessages;
    var $addMessageContainer;
    var $messageCount;
    var $threadTitle;
    var $sendMessageBtn;
    var $newMessage;
    var $sendOnEnter;
    var $searchInbox;
    var $deleteThread;
    var $sidebarLoading;
    
    //----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialize with options
    */
	this.init = function(opt) {
		
		$sidebarInbox = $(opt.sidebarInbox);
		$messageCount = $(opt.messageCount);
		$threadTitle = $(opt.threadTitle);
		activateThread = opt.activateThread;
		$addMessageContainer = $(opt.addMessageContainer);
		$messageContainer = $(opt.messageContainer);
		$loadMessages = $(opt.loadMessages);
		$sendMessageBtn = $(opt.sendMessageBtn);
		$newMessage = $(opt.newMessage);
		$sendOnEnter = $(opt.sendOnEnter);
		$inboxList = $(opt.inboxList);
		$searchInbox = $(opt.searchInbox);
		$deleteThread = $(opt.deleteThread);
		$sidebarLoading = $(opt.sidebarLoading);
		
		initializeInboxList();
		setupListeners();
	}
	
	this.CurrentThread = function() {
		return activeThread ? activeThread.threadId : undefined;
	}
	
	this.openThread = function(receivingUser) {
		if (!initialized) {
			postFunction = function() { tryOpenThread(receivingUser); };
		} else tryOpenThread(receivingUser);
	}
	
	this.openThreadById = function(threadId, fail) {
		if (!initialized) {
			postFunction = function() { showThread(threadId, fail); };
		} else showThread(threadId, fail);
	}
	
	this.threadLeft = function() {
		$('.thread-container').removeClass('thread-open');
		$(window).off('resize', resizeMessageArea);
		isShowing = false;
	}
	
	this.initPage = function() {
		resizeMessageArea();
		$(window).on('resize', resizeMessageArea);
		isShowing = true;
		if (typeof(activeThread) !== 'undefined') {
			var $threadContainer = $('.thread-container[threadId="' + activeThread.threadId + '"]');
			$threadContainer.addClass('thread-open').siblings().removeClass('thread-open');
		}
	}
	
	this.handleMessage = function(message) {
		var threadObj = getThread(message.threadId);
		if (!threadObj) {
			getThreadState(message.threadId, function(success, thread) {
				if (success) {
    				threadCache[thread.threadId] = {thread: thread, messages: [], lastId: undefined};
					pushMessageUpdate(thread, message);
				}
			})
		} else {
			threadObj.thread.currentMessageCount += 1
			threadObj.thread.modifiedDate = message.createDate;
			threadObj.messages.unshift(message);
			pushMessageUpdate(threadObj.thread, message);
		}
	}
	
	this.handleThreadUpdate = function(threadState) {
		var threadObj = getThread(threadState.threadId);
		
		if (threadObj) {
			threadObj.thread = threadState;
			updateThread(threadObj.thread);
		}
	}
	
	//----------------------\
    // Private Functions
    //----------------------/
    
    var pushMessageUpdate = function(thread, message) {
    	if (activeThread && activeThread.threadId == message.threadId) {
    		appendMessage(message);
    		
	    	if (isShowing) {
	    		thread.messageCount += 1;
	    		$inboxList.prepend($('li.thread-container[threadId="' + message.threadId + '"]'));
	    		$messageContainer.animate({ scrollTop: $messageContainer[0].scrollHeight}, 100);
	    		putThreadState(thread.threadId, {messageCount: thread.messageCount});
	    		return;
	    	}
    	}
    	
    	updateThread(thread);
    	showNotification('Thread: ' + thread.threadTag, 'You have receieved a new message!', function() {
			myMessenger.openThreadById(thread.threadId);
		});
    }
    
    var resizeMessageArea = function() {
    	var height = $(window).height() - $messageContainer.offset().top - $addMessageContainer.outerHeight() - 20;
    	$messageContainer.css({
    		height: height + 'px',
    		maxHeight: height + 'px'
    	});
    	
    	$messageContainer.scrollTop($messageContainer[0].scrollHeight);
    }
    
    var setupListeners = function() {
    	
    	$searchInbox.keyup(function(e) {
    		$sidebarInbox.find($sidebarLoading).css('display', 'table');
    		doSearch($searchInbox.val());
    	});
    	
		$(document).on('click', '.thread-container', function() {
			showThread($(this).attr('threadid'));
		});
		
		$(document).on('click', '.message-user-overlay', function() {
			mySocial.showProfile($(this).parents('.thread-message').attr('userId'));
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
		
		$deleteThread.click(function() {
			deleteThreadItem(activeThread.threadId);
		});
		
		myNotifier.addListener('accountChange', zumpMessenger, function() {
			userCache[userAccount._id] = {photo: getUserImage(userAccount), username: userAccount.username};
			forceUpdate = true;
		});
    }
    
    /*
    * Sets up the inbox list
    */
    var initializeInboxList = function() {
    	userCache[userAccount._id] = {photo: getUserImage(userAccount), username: userAccount.username};
    	
    	getThreads(function(success, threadList) {
    		if (success) {
    			newMessageCount = 0;
    			_.each(threadList, function(thread) {
    				
    				if (thread.currentMessageCount > 0) {
	    				threadCache[thread.threadId] = {thread: thread, messages: [], lastId: undefined};
	    				appendThread(thread);
    				}
    			});
    		} else {
    			handleError(threadList);
    		}
    		
    		initialized = true;
    		if (typeof(postFunction) !== 'undefined') {
    			postFunction();
    			postFunction = undefined;
    		}
    	});
    }
    
    var doSearch = function(val) {
    	$('.thread-container').hide();
    	$inboxList.find('.sidebar-item-none').remove();
    	
    	var matchList = _.filter(_.values(threadCache), function(threadCacheObj) {
    		return threadCacheObj.thread.threadTag.toLowerCase().indexOf(val.toLowerCase()) > -1;
    	});
    	
    	if (matchList.length) {
    		_.each(matchList, function(threadCacheObj) {
	    		$('li.thread-container[threadId="' + threadCacheObj.thread.threadId + '"]').show();
	    	});
    	} else if (val.length) {
    		$inboxList.append('<li class="sidebar-item-none"><div>No Results</div></li>');
    	}
    	
    	$sidebarInbox.find($sidebarLoading).css('display', 'none');
    }
    
    var deleteThreadItem = function(threadId) {
		if (threadId) {
			deleteThread(threadId, function(success, retData) {
				if (success) {
					delete threadCache[threadId];
					$inboxList.find('li[threadid="' + threadId + '"]').remove();
					if (_.keys(threadCache).length) {
						$inboxList.find('li:first-child').trigger('click');
					} else {
						changePage('#pg-dashboard');
					}
				} else {
					handleError(retData);
				}
			});
		}
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
    
    var reorderThreads = function() {
    	var threads = _.pluck(_.values(threadCache), 'thread');
    	threads = _.sortBy(threads, function(element) { return new Date(element.modifiedDate); });
    	
    	_.each(threads, function(thread) {
    		var $thread = $('li.thread-container[threadId="' + thread.threadId + '"]');
    		$inboxList.prepend($thread.detach());
    	});
    }
    
    var updateThread = function(thread) {
    	var $thread = $('li.thread-container[threadId="' + thread.threadId + '"]');
    	if ($thread) {
	    	var isActive = $thread.hasClass('active');
	    	if ($thread.length) {
	    		$thread.empty();
	    		populateThreadContainer($thread, thread);
	    		if (isActive) $thread.addClass('active');
	    	}
	    	updateMessageCount();
	    	reorderThreads();
    	}
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
    	
    	var date = new Date(thread.modifiedDate);
    	
    	$threadContainer.append('<div class="thread-image" style="background-image:url(/static/logo/logo_small_nobg.svg);">' +
                            '</div>' +
                            '<div class="thread-icon">' +
                                '<span><i class="fa fa-square-o"></i></span>' +
                            '</div>' +
                            '<div class="thread-details-container">' +
                                '<div class="thread-details">' +
                                    '<div class="thread-details-inner">' +
                                        '<div class="thread-tag-label"></div>' +
                                        '<div class="thread-date">' + date.toLocaleString() + '</div>' +
                                   '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="clearfix"></div>');
                            
       	var recUser = _.without(thread.users, userAccount._id)[0];
       	
        var user = userCache[recUser];
        if (typeof(user) !== 'undefined') {
        	if (user.photo != '') $threadContainer.find('.thread-image').css('background-image', 'url("' + user.photo + '")');
        	if (user.username != '') $threadContainer.find('.thread-tag-label').text(user.username);
        } else {
        	userCache[recUser] = {photo: '', username: ''};
        	getUser(recUser, function(success, user) {
        		if (success) {
        			userCache[user._id].photo = getUserImage(user);
        			userCache[user._id].username = user.username;
        			$threadContainer.find('.thread-image').css('background-image', 'url("' + userCache[user._id].photo + '")');
        			$('.thread-message[userId="' + user._id + '"]').find('.message-user').css('background-image', 'url("' + userCache[user._id].photo + '")');
        			
        			if (thread.threadTag != userCache[user._id].username) {
        				putThreadState(thread.threadId, {threadTag: userCache[user._id].username});
        				thread.threadTag = userCache[user._id].username;
        			}
        			
        			$threadContainer.find('.thread-tag-label').text(thread.threadTag);
        			if (activeThread && activeThread.threadId == thread.threadId) {
						$threadTitle.text(thread.threadTag);
        			}
        		} else {
        			$threadContainer.find('.thread-tag-label').text(thread.threadTag);
        			if (activeThread && activeThread.threadId == thread.threadId) {
						$threadTitle.text(thread.threadTag);
        			}
        		}
        	});
        }                    
        
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
    
    var tryOpenThread = function(receivingUser) {
    	var threadQuery = _.filter(_.values(threadCache), function(threadCacheObj) {
    		return _.contains(threadCacheObj.thread.users, receivingUser);
    	});
    	
    	if (threadQuery.length) {
    		showThread(threadQuery[0].thread.threadId);
			changeSidebar('#sidebar-inbox');
    		
    	} else {
    		postThread(receivingUser, function(success, thread) {
    			if (success) {
					threadCache[thread.threadId] = {thread: thread, messages: [], lastId: undefined};
					prependThread(thread);
	    			showThread(thread.threadId);
					changeSidebar('#sidebar-inbox');
    			} else {
    				handleError(thread);
    			}
    		});
    	}
    }
    
    var showThread = function(threadId, fail) {
    	setLoading(true);
    	var threadCacheObj = getThread(threadId);
    	
		if (!threadCacheObj) {
			if (fail) fail('Unknown thread identifier.');
			setLoading(false);
			return;
		}
		
		var thread = threadCacheObj.thread;
    	
    	threadCacheObj.thread.messageCount = threadCacheObj.thread.currentMessageCount;
		
		var $threadContainer = $('.thread-container[threadId="' + threadId + '"]');
		setThreadState($threadContainer, false);
		$threadContainer.addClass('thread-open').siblings().removeClass('thread-open');
		$threadTitle.text(thread.threadTag);
    	
    	if (forceUpdate || typeof(activeThread) === 'undefined' || activeThread.threadId != threadId) {
			setThread(threadCacheObj);
    	} else {
    		putThreadState(threadCacheObj.thread.threadId, {messageCount: threadCacheObj.thread.currentMessageCount});
    		updateMessageCount();
    	}
    	
    	activeThread = thread;
		activateThread();
		forceUpdate = false;
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
	    $loadMessages.hide();
    	if (threadCacheObj.messages.length < Math.min(pullCount, threadCacheObj.thread.currentMessageCount)) {
    		pullMessages(threadCacheObj, callback);
    	} else {
			putThreadState(threadCacheObj.thread.threadId, {messageCount: threadCacheObj.thread.currentMessageCount});
			_.each(threadCacheObj.messages, function(message) {
				prependMessage(message);
			});
			
			callback();
    	}
    }
    
    var pullMessages = function(threadCacheObj, callback) {
    	getMessages(threadCacheObj.thread.threadId, getParams(threadCacheObj), function(success, messages) {
    		if (success) {
    			
    			if (messages.length) {
	    			threadCacheObj.messages = threadCacheObj.messages.concat(messages);
	    			threadCacheObj.lastId = messages[messages.length - 1]._id;
	    			threadCacheObj.sepId = messages[0]._id;
    			}
    			
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
    		} else {
    			handleError(messages);
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
    	var thread = getThread(message.threadId).thread;
    	var incoming = message.userId != userAccount._id;
    	var date = new Date(message.createDate);
    	var body = processMessage(message.body);
    	var $message = $('<div class="thread-message message-' + (incoming ? 'incoming' : 'outgoing') + '" messageId="' + message._id +  '"  userId="' + message.userId + '"></div>');
    	$message.append('<div class="thread-message-area">' +
    							'<div class="message-user-overlay"></div>' +
                                '<div class="message-user" style="background-image:url(/static/logo/logo_small_nobg.svg)"></div>' +
                                '<div class="message-content">' +
                                    '<div class="message-date">' + date.toLocaleString() + '</div>' +
                                    '<div class="message-bubble message-body">' + body.replace(/\n/g, '<br>') +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="clearfix"></div>');
        
        var user = userCache[message.userId];
        if (typeof(user) !== 'undefined') {
        	if (user != '') $message.find('.message-user').css('background-image', 'url("' + user.photo + '")');
        } else {
        	userCache[message.userId] = {photo: '', username: ''};
        	getUser(message.userId, function(success, user) {
        		if (success) {  
        			userCache[user._id].photo = getUserImage(user);
        			userCache[user._id].username = user.username;
        			
        			var messageList = getThread(activeThread.threadId).messages;
        			var msgByUser = _.where(messageList, {userId: user._id});
        			_.each(msgByUser, function(msg) {
        				$messageContainer.find('.thread-message[messageId="' + msg._id + '"]').find('.message-user').css('background-image', 'url("' + userCache[user._id].photo + '")');
        			});
        		} else {
        			//handleError(user);
        		}
        	})
        }
        
        return $message;
    }
    
    var processMessage = function(body) {
    	var res = _.uniq(body.match(urlRegex));
    	
    	if (res.length) {
    		_.each(res, function(url) {
    			
    			var protocol = url.match(protocolRegex) ? '' : 'http://';
    			
	    		body = body.replace(url, '<a href="' + protocol + url + '" target="_blank">' + url + '</a>');
	    	});
    	}
    	
    	return body;
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
			} else {
				handleError(message);
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
	var itemClick;
	var objList = [];
	var onGalleryChange;
	
    //----------------------\
    // JQuery Objects
    //----------------------/
    
	var $galleryContainer;
	var $galleryTable;
	var $gallerySlider;
	var $galleryMenu;
	var $galleryRowCount;
	
	//----------------------\
    // Prototype Functions
    //----------------------/
    
    /*
    * Initialize with options
    */
	this.init = function(opt) {
		
		if (isDef(opt.onGalleryChange)) {
			onGalleryChange = opt.onGalleryChange;
		}
		
		if (isDef(opt.galleryMenu)) {
			$galleryMenu = $(opt.galleryMenu);
		}
		
		if (isDef(opt.gallerySlider)) {
			$gallerySlider = $(opt.gallerySlider);
		}
		
		if (isDef(opt.galleryRowCount)) {
			$galleryRowCount = $(opt.galleryRowCount);
		}
		
		if (isDef(opt.galleryContainer)) {
			$galleryContainer = $(opt.galleryContainer);
			createGallery();
			setupListeners();
		}
		
		
		if (isDef(opt.galleryCount)) {
			itemsPerRow = opt.galleryCount;
		}
		
		if (isDef(opt.onItemClick)) {
			itemClick = opt.onItemClick;
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
		$galleryTable.show();
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
	        '<table class="gallery-table">' +
	        '</table>'
		);
		
		$galleryTable = $galleryContainer.find('.gallery-table');
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
		$galleryRowCount.text(itemsPerRow);
		
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
		onGalleryChange();
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
		var discImage = getPrimaryDiscImage(obj);
		
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
							'<img src="' + (discImage ? '/files/' + discImage.fileId : '/static/logo/logo_small_faded.svg') + '" />' + 
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
		$(document).on('click', '.disc-gallery-row > .disc-gallery-item', showPublicView);
	}
	
	/*
	* Destroys the event listeners
	*/
	var removeListeners = function() {
		$(window).off('resize', resizeGallery);
		$(document).off('mouseenter', '.disc-gallery-item', showOverlay);
		$(document).off('mouseleave', '.disc-gallery-item', hideOverlay);
		$(document).off('click', '.disc-gallery-row > .disc-gallery-item', showPublicView);
		
	}
	
	var showPublicView = function(e) {
		var id = $(this).attr('objid');
		itemClick(id);
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
		if (!$galleryContainer.is(':visible')) return;
		
		var width = $galleryContainer.width();
		var colCount = itemsPerRow;
		var itemWidth = Math.min(500, Math.floor(width / colCount * 0.99));
		var fontsize = getGalleryFontSize(itemWidth);
		
		$('.disc-gallery-row > .disc-gallery-item').css({
			width: itemWidth + 'px',
			height: itemWidth + 'px',
			maxWidth: itemWidth + 'px',
			maxHeight: itemWidth + 'px',
			'font-size': fontsize
		}).show();
		
		$('.disc-gallery-row > .disc-gallery-item').find('img').css({
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
	var imgArray = new Array();
	
	//----------------------\
    // JQuery Objects
    //----------------------/
    var $lightbox;
    var $imageViewList;
    var $imageViewListItemContainer;
    var $imageViewListContainer;
	
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
		$lightbox = $('<div class="lightbox backdrop backdrop-dark click-to-close no-select"></div>');
		$lightbox.html(generateLightboxHtml());
		$imageViewListContainer = $lightbox.find('.image-view-list-container');
		$imageViewListItemContainer = $lightbox.find('.image-view-list-item-container');
		$imageViewList = $lightbox.find('.image-view-list');
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
		            	'<div class="image-view-list-scroll scroll-left absolute-left">' +
		                '</div>' +
		                '<div class="image-view-list-scroll scroll-right absolute-right">' +
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
		$(document).on('keydown', arrowKeyScrollEvent);
		$(document).on('click', '.lightbox-close', backdropCloseEvent);
		$(window).on('resize', resizeLightbox);
		$(document).on('keyup', closeLightbox);
		$(document).on('mouseenter', '.image-view-list-scroll', scrollImageListEvent);
		$(document).on('mouseleave', '.image-view-list-scroll', stopScrollImageListEvent);
	}
	
	function stopListeners() {
		$(document).off('click', backdropCloseEvent);
		$(document).off('click', changeMainImageEvent);
		$(document).off('keydown', arrowKeyScrollEvent);
		$(document).off('click', backdropCloseEvent);
		$(window).off('resize', resizeLightbox);
		$(document).off('keyup', closeLightbox);
		$(document).off('mouseenter', scrollImageListEvent);
		$(document).off('mouseleave', stopScrollImageListEvent);
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
	    var delta = $imageViewList.width() - $imageViewListContainer.width();
	    if (delta < 0) {
	    	return;
	    } else if ($scrollButton.hasClass('scroll-left')) {
	    	scrollLeft(delta);
	    } else if ($scrollButton.hasClass('scroll-right')) {
	    	scrollRight(delta);
	    }
	};
	
	var stopScrollImageListEvent = function(e) {
		$imageViewList.stop();
	};
	
	var arrowKeyScrollEvent = function(e) {
			var $selectedImage = $('.image-view-thumbnail-selected').first().parent();
			var $nextImage = $selectedImage.next();
			var $prevImage = $selectedImage.prev();
			var curPos = $imageViewList.position().left;
			
			if (e.which == 39) { // right arrow key
				if ($nextImage.length) {
					var id = $nextImage.attr('lbid');
					var img = getNewImage(id);
					changeMainImage(img, $nextImage);
					var pos = $nextImage.position().left + curPos;
					var rightMin = $imageViewListContainer.width() - 100;
					if (pos > rightMin) {
						var delta = pos - rightMin;
						$imageViewList.css('left', curPos-delta + 'px');
					}
				}
			} else if (e.which == 37) { // left arrow key
				if ($prevImage.length) {
					var id = $prevImage.attr('lbid');
					var img = getNewImage(id);
					changeMainImage(img, $prevImage);
					var pos = $prevImage.position().left;
					if (pos + curPos < 0) {
						var delta = pos + curPos;
						$imageViewList.css('left', curPos-delta + 'px');
					}
				}
			}
		};
	
	function scrollLeft(delta) {
		var scroll = Math.min(-1 * $imageViewList.position().left, 50);
		$imageViewList.stop().animate({left:'+=' + scroll}, 300, 'linear', function() {
			scrollLeft(delta);
		});
	}
	
	function scrollRight(delta) {
		var scroll = Math.min(delta + $imageViewList.position().left, 50);
		$imageViewList.stop().animate({left:'-=' + scroll}, 300, 'linear', function() {
			scrollRight(delta);
		});
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
		
		$imageViewListContainer.css({
		   	width: lbWidth
		});
		
		$imageViewListItemContainer.css({
			width: lbWidth,
			maxWidth: lbWidth
		});
		
		$imageViewList.css('left', '0px');
		$lightbox.css('top', $(document).scrollTop());
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
    var $dynamicHeader;
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
        
        if (isDef(opt.dynamicHeader)) {
            $dynamicHeader = $(opt.dynamicHeader);
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
	            $sortToggle.removeClass('active');
	       } else {
	           	$dynamicHeader.slideDown(300);
	           	$sortToggle.addClass('active');
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
    	} else if (sorter.sortType == 'date') {
    		array = _.sortBy(array, function(obj) { return new Date(obj[sorter.sortProp])});
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
    var filters = {}; // Current filters by filter property
    var filterItems = []; // List of filter properties to use
    var filterOrder = []; // Current order of filtering
    var filterCache = {}; // Caches filter items to be searched upon
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
            filterChangeEvent = function() {
            	if (zumpFilter.getCount() > 0) {
					$filterToggle.addClass('filtering');
				} else {
					$filterToggle.removeClass('filtering');
				}
            	opt.onFilterChange();
            }
        }
        
        /*
        * Listeners/Events
        */
        
        // Toggle Filter Container
        $filterToggle.click(function(){
       		toggleSidebar('#sidebar-filter');
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
		
		$(document).on('keyup', '.filter-search', function() {
			filterCache[$(this).attr('prop')].search = $(this).val();
			doSearchFilter($(this).attr('prop'));	
		});
		
		$(document).on('click', '.filter-expand', function() {
			var $this = $(this);
			var prop = $this.attr('prop');
			var state = $this.attr('state');
			filterCache[prop].viewAll = state == '0';
			doSearchFilter(prop);
			
			var count = getSafe(filterCache[prop].searchCount, filterCache[prop].items.length);
			
			if (state == '1') {
				$this.text('(5/' + count + ') More...').attr('state','0');
			} else {
				$this.text('Less...').attr('state','1');
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
    		
    		if (!_.contains(filterCache[property].items, value)) return;
    		
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
    
    var doSearchFilter = function(property) {
    	var items = filterCache[property].items;
    	var val = filterCache[property].search;
    	
    	var filtered = _.filter(items, function(item) { return typeof(item) === 'undefined' || item.toLowerCase().indexOf(val.toLowerCase()) > -1 });
    	filterCache[property].searchCount = filtered.length;
    	var $container = $('#filter-' + property);
    	$container.find('.filter-option').hide();
    	
    	for (var i = 0; i < filtered.length; i++) {
    		var item = filtered[i];
    		var $item = $container.find('.filter-option[filterOn="' + item + '"]');
    		if (i < 5 || filterCache[property].viewAll) {
    			$item.show();
    		}
    	}
    	
    	if (filtered.length < 5) {
    		$container.find('.filter-expand').hide();
    	} else {
    		$container.find('.filter-expand').show();
    	}
    }
    
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
    	var searchItem = '<li class="filter-option-search">' +
                                '<input type="text" class="filter-search" prop="' + property + '" placeholder="Search Filters...">'
                            '</li>';
        var emptyItem = '<li class="filter-option-static">' +
                                'No Items' +
                            '</li>';
        var $filterPanel  = $('<li class="filter-item-container"></li>');
        
        $filterPanel.attr('id', 'filter-container-' + property);
        $filterPanel.html('<div class="filter-item"><span class="pull-right"><i class="fa fa-angle-double-right"></i></span>' + text + '</div>' +
                        '<ul class="filter-option-container' + (!isGroup ? ' filter-item-parent" id="filter-' + property + '"' : '"' ) + ' style="display: none;">' +
                            (!isGroup ? searchItem : '') + 
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
    	
    	if (typeof(filterCache[property]) === 'undefined') {
    		filterCache[property] = { items: items, search: ''};
    	} else {
    		filterCache[property].items = items;
    	}
    	
    	$filterBody.find('li.filter-option').remove();
    	$filterBody.find('li.filter-expand').remove();
    	
    	if (items.length > 0) {
    		$filterBody.find('li.filter-option-static').hide();
    		
    		for (var i = 0; i < items.length; i++) {
    			var item = items[i];
    			var $filterOption = $(generateFilterOption(item)); 
    			if (_.contains(filters[property], item)) {
    				setFilterOption($filterOption, true);
    			}
    			$filterBody.append($filterOption);
    			if (i > 4 && !filterCache[property].viewAll) $filterOption.hide();
    		}
    		
    		if (items.length > 5) {
    			var count = '(5/' + items.length + ')';
		        $filterBody.append('<li class="filter-expand" state="' + (filterCache[property].viewAll ? '1' : '0') + '" prop="' + property + '">' +
                        (filterCache[property].viewAll ? 'Less...' : count + ' More...') +
                    '</li>');
    		}
    		
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
    	
    	doSearchFilter(property);
    	
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
        	} else if (_.isString(opt.inputElement)) {
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
    	var curBottom = curTop + $dropdown.height();
    	var resultTop = $activeResult.position().top;
    	var resultBottom = resultTop  + $activeResult.outerHeight(true);
    	
    	if (resultTop < curTop) { 
    		$dropdown.scrollTop(resultTop);	
    	} else if (resultBottom > curBottom) {
    		$dropdown.scrollTop(resultBottom - $dropdown.height());
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
	    	
	    	$dropdown.css({
	    		width: $input.outerWidth() + 'px',
	    		left: leftOff, 
	    		top: topOff + $input.outerHeight()
	    	});
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
    * Creates the result items for dropdowns
    */
    var generateResult = function(result) {
    	
        return '<li class="dropdown-list-item" tabindex="0" result="' + result.item + '">' +
                    result.item + (result.type == 'template' ? '<span class="pull-right"><i class="fa fa-globe"></i></span>' : '') + 
                '</li>';
    }
    
    /*
    * Returns a set of matched results for the provided input
    */
    var getResults = function(val) {
        if (!val || val == '') return [];
        var curItem;
        var result = resultList();
        
        var templateResults = getProperties(result.templateDiscs);
        var userResults = getProperties(result.userDiscs);
        
        templateResults = _.filter(templateResults, function(item) {
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
    	
    	userResults = _.filter(userResults, function(item) {
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
        
        var results = [];
        
        _.each(templateResults, function(templateResult) {
        	results.push({item: templateResult, type: 'template'});
        });
        
        _.each(userResults, function(userResult) {
        	var item = _.find(results, {item: userResult});
        	
        	if (!item) {
        		results.push({item: userResult, type: 'user'});
        	}
        });
    	
    	return _.sortBy(results, function(result) {
    		return result.item.toLowerCase();
    	});
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