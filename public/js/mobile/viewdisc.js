var navState = [];
var $optionsPanel;
var $discView;
var $galleryList;
var $footer;
var $navUser;
var $publicList;
var zGalList;
var disc;

var swipeLock = false;

$(document).on("pagecreate", "#disc-view", function () { 
    
    $optionsPanel = $('#options-panel');
    $discView = $('#disc-view-container');
    $navUser = $('#nav-user');
    $galleryList = $('.disc-gallery-list');
    $footer = $('.disc-footer');
    $publicList = $('#public-disc-list');
    
    $(document).on('vclick', '#nav-user', function(e) {
        e.stopPropagation();
        $optionsPanel.panel('toggle');
        return false;
    });
    
    $(document).on('vmousedown', '.clickable', function(){
        $(this).addClass('item-active'); 
    }).on('vmouseup', '.clickable', function() {
        $(this).removeClass('item-active');
    });
    
    $optionsPanel.on("panelopen", function (event, ui) {
        $footer.animate({
            bottom: '-140px'
        }, 100);
        $discView.css('overflow', 'hidden');
        $navUser.addClass('active');
        $optionsPanel.on("touchmove", function() {
            return false;
        });
    }).on("panelclose", function (event, ui) {
        $discView.css('overflow', 'auto');
        $navUser.removeClass('active');
        $optionsPanel.off("touchmove");
        $footer.animate({
            bottom: '0'
        }, 100);
    });
    
    $(document).on('vmousedown', '.options-menu li, .disc-btn', function() {
        $(this).addClass('active');
    }).on('vmouseup', '.options-menu li, .disc-btn', function() {
        $(this).removeClass('active');
    })
    
    $(document).on('vclick', '#share-disc', function() {
        var id = $(this).attr('discid');
        window.open('https://www.facebook.com/sharer/sharer.php?app_id=1433417853616595&u=disczump.com/disc/' + id + 
        	'&display=popup&ref=plugin&src=share_button', 'sharer');
    });
    
    $(document).on('vclick', '#view-more', function() {
        showPage('more-discs');
        $footer.animate({
            bottom: '-140px'
        }, 100);
        
    });
    
    $(document).on('vclick', '.dz-page-back', function(e) {
        $footer.animate({
            bottom: '0'
        }, 100);
        prevPage();
    });
    
    $(document).on('swipeleft', '.disc-gallery-list', function() {
        if (!swipeLock) {
            zGalList.nextItem(); 
        }
    }).on('swiperight', '.disc-gallery-list', function(){
        if (!swipeLock) {
            zGalList.prevItem(); 
        }
    });
    
    $(document).on('vclick', '.disc-item', function() {
        var id = $(this).attr('discid');
        location.href = '/disc/' + id;
    });
    
    $optionsPanel.panel();
    $('body').show();
    showPage('disc-view-container');
});

$(document).on('pageshow', "#disc-view", function() {
    
    zGalList = new ZumpSwipeGallery({
        galleryContainer: '.disc-gallery',
        galleryList: '.disc-gallery-list'
    });
    
    getDiscById($('#disc-view').attr('discid'), function(success, data) {
        if (success) {
            disc = data;
            loadDisc();
            loadPublicDiscs();
        }
    });
});

function prevPage(done) {
    if (navState.length) {
        navPage(navState.pop(), false, done);
    }
}

function showPage(page, done) {
        navPage($('#' + page), true, done);
}

function navPage($nextPage, forward, done) {
    var $currentPage = $('.dz-page.active');
    
    if ($nextPage.length) {
            
        if (!$currentPage.length) {
            $nextPage.addClass('active').show(done);
            navState.push($nextPage);
        } else {
            $currentPage.removeClass('active').fadeOut(300, function() {
               $nextPage.addClass('active').fadeIn(300, done);
            });
            
            if (forward) {
                navState.push($currentPage);
            }
        }
    }
}

function loadDisc() {
    getAllDiscImages(disc._id, function(success, images) {
        if (success) {
            _.each(images, function(image) {
                if (image._id != disc.primaryImage) {
                    zGalList.addItem(image);
                }
            });
        }
    });
}

function loadPublicDiscs() {
    getAllPublicDiscsByUser(disc.userId, function(success, discs) {
        if (success) {
            _.each(discs, function(pubDisc) {
                
                console.log(pubDisc.name + ": " + pubDisc.primaryImage);
                
                if (disc._id == pubDisc._id) return;
                
                var $disc = $('<div class="disc-info-wrapper clickable"></div>');
                $disc.append('<div class="disc-item" discid="' + pubDisc._id + '">' +
                                '<div class="disc-content-image-container">' +
                                    '<div class="disc-content-image">' +
                                        '<img src="/static/logo/logo_small_faded.svg">' +
                                        '<i class="fa fa-spinner fa-spin"></i>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="disc-content-info-container">' +
                                    '<div>' +
                                        '<div class="disc-info-brand">' + pubDisc.brand + '</div>' +
                                        '<div class="disc-info-name">' + pubDisc.name + '</div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>');
                $publicList.append($disc);
                
                if (isDef(pubDisc.primaryImage)) {
                    getPrimaryDiscImage(pubDisc.primaryImage, function(success, image) {
                        if (success) {
                            var $discItem = $publicList.find('.disc-item[discid="' + image.discId + '"]');
                            $discItem.find('.disc-content-image img').attr('src', '/files/' + image.thumbnailId);
                            
                        	$discItem.find('.disc-content-image').find('i.fa-spinner').remove();
                        	$discItem.find('.disc-content-image').find('img').show();
                        } else {
                            $disc = $publicList.find('.disc-item[discid="' + pubDisc._id + '"]');
                        	$disc.find('.disc-content-image').find('i.fa-spinner').remove();
                        	$disc.find('.disc-content-image').find('img').show();
                        }
                    });
                } else {
                    $disc = $publicList.find('.disc-item[discid="' + pubDisc._id + '"]');
                	$disc.find('.disc-content-image').find('i.fa-spinner').remove();
                	$disc.find('.disc-content-image').find('img').show();
                }
            });
        }
    });
}

var ZumpSwipeGallery = function(opt) {
    var $galleryContainer;
    var $galleryList;
    var pad;
    var itemWidth;
    
    
    this.init = function(opt) {
        
        if (opt.galleryContainer) {
            $galleryContainer = $(opt.galleryContainer);
        }
        
        if (opt.galleryList) {
            $galleryList = $(opt.galleryList);
        }
        
        itemWidth = $galleryContainer.width() * .8;
        $galleryList.find('.disc-gallery-item').css({
            width: itemWidth + 'px',
            height: itemWidth + 'px'
        }).find('img').css({
           width: itemWidth + 'px' 
        });
        
        pad = ($galleryContainer.width() - itemWidth - 50) / 2;
        
        configureList();
    }
    
    this.addItem = function(image) {
        var $galItem = $('<div class="disc-gallery-item"></div>');
        $galItem.append('<img src="/files/' + image.fileId + '" />');
        $galItem.css({
            width: itemWidth + 'px',
            height: itemWidth + 'px'
        }).find('img').css({
           width: itemWidth + 'px' 
        });
        $galleryList.append($galItem);
    }
    
    this.nextItem = function(){
        var $active = $galleryList.find('.disc-gallery-item.active');
        var $next = $active.next('.disc-gallery-item');
        if ($next.length) {
            animateMove($next);
        }
    }
    
    this.prevItem = function() {
        var $active = $galleryList.find('.disc-gallery-item.active');
        var $next = $active.prev('.disc-gallery-item');
        if ($next.length) {
            animateMove($next, true);
        }
    }
    
    var configureList = function() {
        var $active = $galleryList.find('.disc-gallery-item.active');
        if (!$active.length) {
            $active = $galleryList.find('.disc-gallery-item').first();
        }
        
        animateMove($active);
    }
    
    var animateMove = function($next, dirLeft) {
        var $active = $galleryContainer.find('.disc-gallery-item.active');
        var padAmt = dirLeft ? 0 : pad;
        var move = Math.max(-25, $next.position().left - padAmt*2 - 25) * -1;
        
        swipeLock = true;
        
        $.when(
            $galleryList.animate({
                left: move + 'px'
            }, 200).promise(),
        
            $active.animate({
                paddingRight: '0px',
                paddingLeft: '0px'
            }, 200).promise(),
                
            
            $next.animate({
                paddingLeft: pad + 'px',
                paddingRight: pad + 'px'
            }, 200).promise()
        ).done(function() {
            swipeLock = false;
            $active.removeClass('active');
            $next.addClass('active');
        });
        
        
        
        
    }
    
    this.init(opt);
}