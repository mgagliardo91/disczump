var $discImageTable = $('#disc-image-table');
var $publicUserDiscsTable = $('.public-user-discs-table');

var discId;
var currentDisc = {};
var imageArray = [];
var userPublicDiscs = [];
var interval;
var curIndex = 0;

$(document).ready(function() {
    discId = $('.public-disc-view').attr('id');
    
    $(document).on('click', '.image-preview', function(e) {
        $('.image-preview.active').removeClass('active');
        $(this).addClass('active');
        var id = $(this).children('img').attr('imgId');
        var img = _.findWhere(imageArray, {_id: id});
        if (img) {
            $('.image-block-frame > img').attr('src', '/files/' + img.fileId).attr('thumbnailId', img.thumbnailId);
        }
    });
    
    $(document).on('click', '.scroll-left', function(e) {
        if ((curIndex - interval) >= 0) {
            curIndex = curIndex - interval;
            getNext(curIndex, interval);
        }
    });
    
    $(document).on('click', '.scroll-right', function(e) {
        if ((curIndex + interval) < userPublicDiscs.length) {
            curIndex = curIndex + interval;
            getNext(curIndex, interval);
        }
    });
    
    $(window).on('resize', function() {
        resizeUserDiscList();
    });
    
    // Get disc object
    getDiscById(discId, function(success, disc) {
        if (success && typeof disc._id !== 'undefined') {
            currentDisc = disc;
            
            // Get disc images
            getAllDiscImages(discId, function(success, images) {
                if (success && images.length > 0) {
                    imageArray = images;
                    generateImageList();
                }
            });
            
            // Get public discs
            getAllPublicDiscsByUser(disc.userId, function(success, discs) {
                if (success && discs.length > 0) {
                    userPublicDiscs = _.reject(discs, function(disc) {
                        return disc._id == discId;
                    });
                    interval = Math.floor($('.public-user-discs-table-wrapper').width() / 110);
                    if (userPublicDiscs.length > interval) {
                        $('.scroll-chevron').removeClass('hidden');
                    }
                    getMargin(interval);
                    getNext(curIndex, interval);
                }
            });
        }
    });
});

function generateImageList() {
    $('.logo-placeholder').remove();
    _.each(imageArray, function(img) {
        $discImageTable.append('<div class="image-item-container">' +
                                    '<div class="image-item">' +
                                        '<div class="image-preview' + (img._id == currentDisc.primaryImage ? ' active' : '') + '">' +
                                            '<img src="/files/' + img.thumbnailId + '" imgId="' + img._id + '" class="fit-parent">' +
                                        '</div>' +
                                    '</div>' +
                                '</div>');
    });
}

function getNext(index, interval) {
    
    var lastIndex = Math.min(index + interval, userPublicDiscs.length);
    $publicUserDiscsTable.empty();
    
    for (var i = index; i < lastIndex; i++) {
        $publicUserDiscsTable.append('<div class="public-user-disc-item-container" discId="' + userPublicDiscs[i]._id + '">' +
                                        '<div class="public-user-disc-item">' +
                                            '<a href="/disc/' + userPublicDiscs[i]._id + '"><img src="' + getSafe(userPublicDiscs[i].primeImgObj, '/static/logo/logo_small_faded.svg') + '" class="fit-parent"></a>' +
                                        '</div>' +
                                        '<div class="public-user-disc-item-text">' +
                                            '<a href="/disc/' + userPublicDiscs[i]._id + '"><span>' + getSafe(userPublicDiscs[i].brand, '') + '<br>' + getSafe(userPublicDiscs[i].name, '') + '</span></a>' +
                                        '</div>' +
                                    '</div>');
        
        if (!userPublicDiscs[i].primeImgObj) {
            getPrimaryDiscImage(userPublicDiscs[i].primaryImage, function(success, image) {
                _.findWhere(userPublicDiscs, {'_id': image.discId}).primeImgObj = '/files/' + image.thumbnailId;
                $('.public-user-disc-item-container[discId="' + image.discId + '"]').find('img').attr('src', '/files/' + image.thumbnailId);
            });
        }
    }
}

function resizeUserDiscList() {
    interval = Math.floor($('.public-user-discs-table-wrapper').width() / 110);
    getMargin(interval);
    getNext(curIndex, interval);
    if (userPublicDiscs.length > interval) {
        $('.scroll-chevron').removeClass('hidden');
    } else {
        $('.scroll-chevron').addClass('hidden');
    }
}

function getMargin(interval) {
    var margin = ($('.public-user-discs-table-wrapper').width() - (interval * 110)) / 2;
    $('.public-user-discs-table').css('margin', '0px ' + margin + 'px')
}
