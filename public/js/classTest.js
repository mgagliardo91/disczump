




// Usage
var zumpFilter = new ZumpFilter({
    filterContainer: '#filter-content',
    items: [
        {text: 'Brand', property: 'brand'},
        {text: 'Tags', property: 'tagList'},
        {text: 'Type', property: 'type'},
        {text: 'Material', property: 'material'},
        {text: 'Weight', property: 'weight'},
        {text: 'Color', property: 'color'},
        {text: 'Speed', property: 'speed', groupText: 'Flight Numbers', groupProp: 'flightNumbers'},
        {text: 'Glide', property: 'glide', groupText: 'Flight Numbers', groupProp: 'flightNumbers'},
        {text: 'Turn', property: 'turn', groupText: 'Flight Numbers', groupProp: 'flightNumbers'},
        {text: 'Fade', property: 'fade', groupText: 'Flight Numbers', groupProp: 'flightNumbers'}
    ],
    onFilterChange: function() {
        
    }
});
