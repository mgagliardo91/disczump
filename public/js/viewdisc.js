var $discImageTable = $('#disc-image-table');
var $publicUserDiscsTable = $('.public-user-discs-table');

var discId;
var currentDisc = {};
var imageArray = [];
var userPublicDiscs = [];

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
                    generatePublicDiscsByUser();
                }
            });
        }
    });
    
});

function generateImageList() {
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

function generatePublicDiscsByUser() {
    _.each(userPublicDiscs, function(disc) {
        $publicUserDiscsTable.append('<div class="public-user-disc-item-container" discId="' + disc._id + '">' +
                                        '<div class="public-user-disc-item">' +
                                            '<a href="/disc/' + disc._id + '"><img src="/static/logo/logo_small_faded.svg" class="fit-parent"></a>' +
                                        '</div>' +
                                        '<div class="public-user-disc-item-text">' +
                                            '<a href="/disc/' + disc._id + '"><span>' + disc.brand + '<br>' + disc.name + '</span></a>' +
                                        '</div>' +
                                    '</div>');
        getPrimaryDiscImage(disc.primaryImage, function(success, image) {
            $('.public-user-disc-item-container[discId="' + image.discId + '"]').find('img').attr('src', '/files/' + image.thumbnailId);
        });
    });
}