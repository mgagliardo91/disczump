var currentDisc;
var $discImageTable;
var imageArray = [];
var userPublicDiscs = [];
var dzID = '1433417853616595';
var $discRow;

$(document).ready(function() {
    $discRow = $('.public-disc-row');
    
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
		var winTop = ($(window).height() / 2) - (300 / 2);
		var winLeft = ($(window).width() / 2) - (600 / 2);
        window.open('http://www.facebook.com/sharer/sharer.php?app_id=' + dzID + '&u=disczump.com/disc/' + currentDisc._id + 
        	'&display=popup&ref=plugin&src=share_button', 'sharer', 'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + 600 + ',height=' + 300);
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
                if (success && images.length > 0) {
                    imageArray = images;
                    generateImageList();
                }
            });
            
            getPublicPreview(currentDisc.userId, currentDisc._id, function(success, retData) {
                if (success && retData.discs.count > 0) {
                    userPublicDiscs = _.reject(retData.discs.preview, function(disc) {
                        return disc._id == currentDisc._id;
                    });
                    
                    for (var i = 0; i < 5; i++) {
                        if (userPublicDiscs.length > i) {
                            $discRow.append(publicDisc(userPublicDiscs[i]));
                        }
                    }
                    resize();
                }
            });
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
                                '<img src="/static/logo/logo_small.svg">' +
                            '</div>' +
                        '</div>');
    
    if (disc.primaryImage) {
        getPrimaryDiscImage(disc.primaryImage, function(success, primaryImage) {
            if (success) {
                $('.public-disc-item[discid="' + primaryImage.discId + '"]').find('.disc-gallery-image > img').attr('src', '/files/' + primaryImage.thumbnailId);
            }
        });
    }
    
    return $disc;
}