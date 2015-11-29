$(document).ready(function(){
    var firstSort = $('th[initSort="true"]').first().index();
    var idIndex = $('th[name="_id').index();
    var userIdIndex = $('th[name="userId').index();
    
    $(document).on('click', '#object-table tbody td.pg-link', function() {
        window.open($(this).attr('href'),'_blank');
    });
    
	$('#object-table').tablesorter({
	    sortList: [[firstSort,-1]],
        widgets: ['zebra', 'filter'],
        widgetOptions: {
            zebra: [
                "ui-widget-content even",
                "ui-state-default odd"
                ],
                
            filter_childRows: false,
            filter_columnFilters: true,
            filter_cssFilter: "tablesorter-filter",
            filter_ignoreCase: true,
            filter_searchDelay: 300,
            filter_startsWith: false,
            filter_useParsedData: false,
            resizable: true,
            saveSort: false,
            stickyHeaders: "tablesorter-stickyHeader"
        }
	});
	$('#object-table').tablesorterPager({
        container: $(".pager"),
        savePages: true,
        ajaxUrl: '/admin/api/feedback?size={size}&page={page+1}&{sortList:sort}&{filterList:filter}',
        ajaxObject: {
            dataType: 'json',
            contentType: "application/json",
        },
        ajaxProcessing: function(data){
            console.log(data);
            
            var feedback = [];
            
            _.each(data.feedback, function(feedbackItem) {
                
                var createDate = new Date(feedbackItem.createDate);
                var data;
                
                if (feedbackItem.feedback.length > 100) {
                    data = feedbackItem.feedback.substring(0, 100) + '...';
                } else {
                    data = feedbackItem.feedback;
                }
                
                feedback.push([
                    feedbackItem._id,
                    createDate.toLocaleDateString() + " " + createDate.toLocaleTimeString(),
                    feedbackItem.userId,
                    data
                ]);
            });
            
            return [data.total, feedback];
        },
        ajaxError: null,
        customAjaxUrl: function(table, url) {
          var sorts = url.match(/sort\[\d+\]=\d+/g);
          var filters = url.match(/filter\[\d+\]=[a-zA-Z0-9]+/g);
          var i = 0;
          _.each(sorts, function(sort){
              var sortOpt = /\[(\d+)\]=(\d+)/g.exec(sort);
              
              var name = $(table).find('th:nth-child(' + (parseInt(sortOpt[1]) + 1) + ')').attr('name');
              var newSort = 'sort[' + i++ + ']=' + name + ',' + (sortOpt[2] == 1 ? 1 : -1);
              url = url.replace(sort, newSort);
          });
          
          i = 0;
        _.each(filters, function(filter){
              var filterOpt = /\[(\d+)\]=([a-zA-Z0-9]+)/g.exec(filter);
              
              var name = $(table).find('th:nth-child(' + (parseInt(filterOpt[1]) + 1) + ')').attr('name');
              var newFilter = 'filter[' + i++ + ']=' + name + ',' + filterOpt[2];
              url = url.replace(filter, newFilter);
          });
          console.log(url);
          return url;
        },
        processAjaxOnInit: true,
        output: '{startRow} to {endRow} ({totalRows})',
        updateArrows: true,
        page: 0,
        size: 50,
        fixedHeight: true,
        removeRows: false,
        cssNext: '.next',
        cssPrev: '.prev',
        cssFirst: '.first',
        cssLast: '.last',
        cssGoto: '.gotoPage',
        cssPageDisplay: '.pagedisplay',
        cssPageSize: '.pagesize',
        cssDisabled: 'disabled'
    }).bind('pagerComplete', function(e, c){
        $('#object-table tbody tr').each(function() {
            var $userIdField = $($(this).children('td').get(userIdIndex));
            var $idField = $($(this).children('td').get(idIndex));
            $userIdField.addClass('dz-color pg-link').attr('href', '/admin/users/' + $userIdField.text());
            $idField.addClass('dz-color pg-link').attr('href', '/admin/feedback/' + $idField.text());
        });
    });
});