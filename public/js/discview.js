var currentDisc;
var $discImageTable;
var imageArray = [];
var userPublicDiscs = [];
var dzID = '1433417853616595';
var $discRow;
var serverURL = 'http://www.disczump.com';

$(document).ready(function() {
    $discRow = $('.public-disc-row');
   	
   	var $serverParams;
   	if (($serverParams = $('#server-params')).length) {
   		serverURL = $serverParams.attr('serverURL');
   	}
    
    $(window).click(function(e) {
     	$.each($('.remove-on-close'), function(index) {
     		var domElem = $(this).get(0);
     		if (domElem == e.target || $.contains(domElem, e.target)) {
     			return;
     		}
     		
     		$(this).remove();
     	});
    });
    
    $(document).on('click', '#view-disc-image-container .image-preview', function(e) {
        $discImageTable.find('.image-preview.active').removeClass('active');
        $(this).addClass('active');
        var id = $(this).children('img').attr('imageId');
        var img = _.findWhere(imageArray, {_id: id});
        if (img) {
            $('#view-disc-image').attr('src', '/files/' + img.fileId);
        }
    });
    
    $('#share-disc').click(function() {
		var $this = $(this);
		$this.removeClass('fa-facebook-square').addClass('fa-spinner').addClass('fa-pulse').addClass('disabled');
        shareFacebook(currentDisc._id, function() {
			$this.removeClass('fa-spinner').removeClass('fa-pulse').addClass('fa-facebook-square');
		});
	});
	
	$(document).on('mouseenter','.disc-gallery-item', function() {
	    $(this).find('.disc-gallery-overlay').show();
	}).on('mouseleave', '.disc-gallery-item', function() {
	    $(this).find('.disc-gallery-overlay').hide();
	}).on('click', '.disc-gallery-item', function() {
	    var id = $(this).attr('discid');
		var win = window.open('/disc/' + id);
  		win.focus();
	});
	
	new ZumpLink({
		selector: '#copy-link',
		path: function($item) {
			return 'disc/' + currentDisc._id;
		}
	});
    
    $(window).on('resize', resize);
    
    initialize();
});

function resize() {
    $('.public-disc-item').each(function() {
        var font = 0.15 * parseInt($(this).width());
        $(this).css({
            'font-size': font
        });
    });
}

function initialize() {
    var discId = $('.public-disc-view').attr('id');
    $discImageTable = $('#view-disc-image-container');
    
     getDiscById(discId, function(success, disc) {
        if (success) {
            currentDisc = disc;
            
            // Get disc images
            getAllDiscImages(currentDisc._id, function(success, images) {
                if (success) {
                    if (images.length > 0) {
                        imageArray = images;
                        generateImageList();
                    }
                } else {
                    handleError(images);
                }
            });
            
            getPublicPreview(currentDisc.userId, currentDisc._id, function(success, retData) {
                if (success) {
                    if (retData.count > 0) {
                        userPublicDiscs = _.reject(retData.preview, function(disc) {
                            return disc._id == currentDisc._id;
                        });
                        
                        for (var i = 0; i < 5; i++) {
                            if (userPublicDiscs.length > i) {
                                $discRow.append(publicDisc(userPublicDiscs[i]));
                            }
                        }
                        resize();
                    }
                } else {
                    handleError(retData);
                }
            });
        } else {
            handleError(disc);
        }
    });   
}

function generateImageList() {
    $('.logo-placeholder').remove();
    _.each(imageArray, function(img) {
        preloadImage(img.fileId);
        $discImageTable.append('<div class="image-item-container">' +
                                    '<div class="image-item">' +
                                        '<div class="image-preview' + (img._id == currentDisc.primaryImage ? ' active' : '') + '">' +
                                            '<img src="/files/' + img.thumbnailId + '" imageId="' + img._id + '" class="fit-parent">' +
                                        '</div>' +
                                    '</div>' +
                                '</div>');
        
    });
}

function preloadImage(imageUrl) {
	var image = new Image();
	image.src = '/files/' + imageUrl;
}

function publicDisc(disc) {
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
