var $optionsPanel;
var $page;
var $navUser;

$(document).ready(function() {
    $optionsPanel = $('#options-panel');
    $navUser = $('#nav-user');
    $page = $('body');
    
    $optionsPanel.on("panelopen", function (event, ui) { 
        $page.css('overflow', 'hidden');
        $navUser.addClass('active');
        $optionsPanel.on("touchmove", function() {
            return false;
        });
    }).on("panelclose", function (event, ui) {
        $page.css('overflow', 'auto');
        $navUser.removeClass('active');
        $optionsPanel.off("touchmove");
    });
    
    $optionsPanel.panel();
});