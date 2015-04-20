var discList;

$(document).ready(function(){
   
   $('.page').hide();
   
   $('.nav-sidebar > li').click(function(e){
       e.stopPropagation();
       var $this = $(this);
       var nav = $(this).attr('pg-select');
       var $page = $(nav);
       console.log($page);
       
       if ($page.length && !$page.is(':visible')) {
           $('.page').fadeOut(100, function() {
               $('.nav-sidebar > li').removeClass('active');
                $page.fadeIn(100, function() {
                    $this.addClass('active');
                });
           });
       } else {
           $this.addClass('active').siblings().removeClass('active');
       }
       
      return false;
   });
  
  $('.nav-sidebar > li.active').trigger('click');
  
  getAllDiscs(function(success, discs) {
      if (success) {
            discList = discs;
            createTypePie();
            createBrandPie();
      } else {
          console.log('Error initializing.');
      }
  });
    
});

function createTypePie() {
    var discs = _.groupBy(discList, 'type');
    var data = [];
    console.log(discs);
    
    for(var group in discs) {
        data.push({
           label: group,
           y: discs[group].length,
           legendText: group
        });
    }
    
    $("#discByType").CanvasJSChart({ 
		title: { 
			text: "Discs by Type",
			fontSize: 24
		},
		width: 600,
		axisY: { 
			title: "Products in %" 
		}, 
		legend :{ 
			verticalAlign: "center", 
			horizontalAlign: "right" 
		}, 
		data: [ 
		{ 
			type: "pie", 
			showInLegend: true, 
			toolTipContent: "{label} <br/> {y} discs", 
			indexLabel: "#percent%", 
			dataPoints: data
		} 
		] 
	});
}

function createBrandPie() {
    var discs = _.groupBy(discList, 'brand');
    var data = [];
    console.log(discs);
    
    for(var group in discs) {
        data.push({
           label: group,
           y: discs[group].length,
           legendText: group
        });
    }
    
    $("#discByBrand").CanvasJSChart({ 
		title: { 
			text: "Discs by Brand",
			fontSize: 24
		},
		width: 600,
		axisY: { 
			title: "Products in %" 
		}, 
		legend :{ 
			verticalAlign: "center", 
			horizontalAlign: "right" 
		}, 
		data: [ 
		{ 
			type: "pie", 
			showInLegend: true, 
			toolTipContent: "{label} <br/> {y} discs", 
			indexLabel: "#percent%", 
			dataPoints: data
		} 
		] 
	});
}