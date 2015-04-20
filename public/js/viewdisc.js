var $discImageTable = $('#disc-image-table');

var discId;
var imageArray = [];

$(document).ready(function() {
    discId = $('.public-disc-view').attr('id');
    getAllDiscImages(discId, function(success, images) {
        if (success && images.length > 0) {
            imageArray = images;
            generateImageList();
            findActiveImage();
        }
    });
    
    $(document).on('click', '.image-preview', function(e) {
        $('.image-preview.active').removeClass('active');
        $(this).addClass('active');
        var id = $(this).children('img').attr('imgId');
        var img = _.findWhere(imageArray, {_id: id});
        if (img) {
            $('.image-block-frame > img').attr('src', '/files/' + img.fileId).attr('thumbnailId', img.thumbnailId);
        }
    });
    
    $('#ogBtn').click(function() {
        FB.ui({
            method: 'share_open_graph',
            action_type: 'testdisczumpfb:zump',
            action_properties: JSON.stringify({
                object:'https://disczumpserver-mgagliardo.c9.io/disc/5511c0e980a81f0a52be6baa',
                disc: 'https://disczumpserver-mgagliardo.c9.io/disc/5511c0e980a81f0a52be6baa'
            })
        }, function(response){});
    });
    
    
});

function generateImageList() {
    _.each(imageArray, function(img) {
        $discImageTable.append('<div class="image-item-container">' +
                                    '<div class="image-item">' +
                                        '<div class="image-preview">' + /*add/remove "active" class*/
                                            '<img src="/files/' + img.thumbnailId + '" imgId="' + img._id + '" class="fit-parent">' +
                                        '</div>' +
                                    '</div>' +
                                '</div>');
    });
}

function findActiveImage() {
    var thumbnailId = $('.image-block-frame > img').attr('thumbnailId');
    var img = _.find(imageArray, function(img) {
        return img.thumbnailId === thumbnailId;
    });
    $discImageTable.find("[imgId='" + img._id + "']").parent().addClass('active');
}