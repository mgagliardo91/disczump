var currentDisc;
var $discImageTable;
var imageArray = [];
var userPublicDiscs = [];
var dzID = '1433417853616595';
var $discRow;
var serverURL = 'https://www.disczump.com';

$(document).ready(function() {
  	var $serverParams;
  	if (($serverParams = $('#server-params')).length) {
  		serverURL = $serverParams.attr('serverURL');
  	}
  	
  	$('.disc-image').click(function() {
  	    if (isDef(currentDisc) && currentDisc.primaryImage) {
  	        $('#view-disc').hide();
  	        $('#view-image').show();
  	        $('#nav-home').hide();
  	        $('#nav-back').show();
  	    }
  	});
  	
  	$('#nav-home').click(function() {
  	    window.location.href = '/dashboard';
  	});
  	
  	$('#go-back').click(function() {
  	    $('#image-container').hide();
  	    $('#disc-container').show();
  	});
  	
  	$('#disc-primary-image').click(function() {
  	    if (currentDisc.imageList.length) {
  	    $('#disc-container').hide();
  	    $('#image-container').show();
  	    }
  	});
  	
  	$('#nav-back').click(function() {
       $('#view-image').hide();
  	   $('#view-disc').show();
       $('#nav-back').hide();
       $('#nav-home').show();
  	});
  	
  	$('#show-options').click(function(){
  	    var opts = $('#options-container');
  	    
  	    if (opts.is(':visible')) {
  	        $('#options-container').fadeOut(200); 
  	    } else {
  	        $('#options-container').fadeIn(200); 
  	    }
  	});
  	
  	$('#share-facebook').click(function() {
  	    shareFacebook(currentDisc._id);
  	});
    
    $(window).on('resize', resize);
    
    initialize();
});

function resize() {
    var width = $(window).innerWidth() - 20;
    
    $('.disc-image').each(function() {
       $(this).css({
           width: width + 'px',
           height: width + 'px'
    
       })
   });
    
}

function initialize() {
    var discId = $('#public-disc-view').attr('discid');
    $discImageTable = $('.disc-image-list');
    
     getDiscById(discId, function(success, disc) {
        if (success) {
            currentDisc = disc;
            generateImageList();
            if (!disc.imageList.length) $('.disc-icon').hide(); 
            $('#disc-loading').hide();
        } else {
            handleError(disc);
        }
    });   
}

function generateImageList() {
    var width = $(window).innerWidth() - 20;
    
    _.each(currentDisc.imageList, function(img) {
        $discImageTable.append('<li class="disc-image" style="width:' + width + 'px;height:' + width + 'px">' +
                                    '<a href="/files/' + img.fileId + '"><img src="/files/' + img.fileId + '" /></a>' +
                                '</li>');
    });
}