
$(document).ready(function(){
    $('#dashboard-view-switch').dzTriSwitch({
        change: function(value) {
            console.log(value);
        }
    });
    
    $('#test-frame').click(function() {
        generateCircle($(this));
    });
    
    Dropzone.autoDiscover = false;
    var myDropzone = new Dropzone(
        "#dropit",
        {
            autoProcessQueue: false,
            url: "/file/post"
            // ..your other parameters..
        }
    );
    
    var $img;
    
    myDropzone.on('thumbnail', function (file) {
        if (file.cropped) {
            return;
        }
        if (file.width < 800) {
            // validate width to prevent too small files to be uploaded
            // .. add some error message here
            return;
        }
        
        var cachedFilename = file.name;
        // remove not cropped file from dropzone (we will replace it later)
        myDropzone.removeFile(file);
        
        $img = $('<img />');
        var reader = new FileReader();
        reader.onloadend = function() {
            $('#image-container').html($img);
            $img.attr('src', reader.result);
            
            $img.cropper({
                aspectRatio: 1/1,
                autoCropArea: 0.8,
                movable: false,
                cropBoxResizable: true,
                minCropBoxWidth: 200,
                minCropBoxHeight: 200,
                strict: true
            });
        };
        
        reader.readAsDataURL(file);
        
        
        $('#clickme').click(function() {
           var blob = $img.cropper('getCroppedCanvas').toDataURL();
           var newFile = dataURItoBlob(blob);
           newFile.cropped = true;
           newFile.name = cachedFilename;
           myDropzone.addFile(newFile);
        });
    });
    
    
});

// transform cropper dataURI output to a Blob which Dropzone accepts
function dataURItoBlob(dataURI) {
    var byteString = atob(dataURI.split(',')[1]);
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: 'image/jpeg' });
}

function generateCircle($element) {
    var $circle = $('<div class="action-circle"><div class="action-fill"></div><span class="action-top"><i class="fa fa-pencil fa-lg"></i></div></div>');
    var elemHeight = $element.outerHeight();
    var elemWidth = $element.outerWidth();
    var circleDiam = Math.max(elemHeight, elemWidth) + 75;
    var left = $element.position().left - (circleDiam - elemWidth)/2;
    var top = $element.position().top - (circleDiam - elemHeight)/2;
    
    $circle.css({
        left: $element.position().left + elemWidth/2,
        top: $element.position().top + elemHeight/2
    });
    $circle.insertBefore($element);
    $circle.animate({
        width: circleDiam + 'px',
        height: circleDiam + 'px',
        left: left,
        top: top
    }, 500);
    
}

jQuery.fn.extend({
    dzTriSwitch: function(opt) {
        var change = opt.change;
        
        this.find('.dz-switch-opt').click(function(e) {
            var $this = $(this);
            var width = $this.outerWidth();
            var mult = 1;
            if ($this.hasClass('active')) return;
            
            var $active = $this.siblings('.dz-switch-opt.active');
            var $activeSel = $active.find('.dz-switch-selector');
            var select = createSelector();
            
            if ($this.isAfter($active)) {
                width = -1 * width;
            }
            
            mult = Math.abs($this.index() - $active.index());
            
            if ($active.length) {
                select.css({marginLeft: mult* width + 'px'});
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
                    if (change) change($this.attr('value'));
                });
                
            } else {
                $this.addClass('active');
                $this.prepend(select);
                if (change) change($this.attr('value'));
            }
        });
        
        var createSelector = function() {
            return $('<div class="dz-switch-selector"></div>');
        }
    },
    isAfter: function($elem){
        return this.index() > $elem.index();
    }
});