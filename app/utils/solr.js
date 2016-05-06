var _ = require('underscore');

module.exports = {
    createDiscReq: createDiscReq,
    createFacetReq: createFacetReq
}

function createFacetReq(opts) {
    var facetReq = {};
    var req = createDiscReq(opts);

    if (opts.facet && opts.facet.name) {
        facetReq.filter = req.filter;
        facetReq.query = req.query;
        facetReq.params = req.params;
        facetReq.sort = req.sort;
        facetReq.limit = 0;
        
        var facet = req.facet[opts.facet.name];
        if (facet) {
            facet.terms.limit = opts.facet.limit || 20;
            facet.terms.offset = opts.facet.offset || 0;
        }
        
        facetReq.facet = {};
        facetReq.facet[opts.facet.name] = facet;
        return facetReq;
    }
    
    return req;
}

function createDiscReq(opts, userId) {
    var req = {
        filter: [],
        query: '',
        facet: {
            forSale: {type:"terms", field: 'marketplace.forSale',mincount: 1,limit: 2, numBuckets: false},
            forTrade: {type:"terms", field: 'marketplace.forTrade',mincount: 1,limit: 2, numBuckets: false},
            fade: {type:"terms", field: 'fade',mincount: 1,limit: 20, numBuckets: true},
            brand: {type:"terms", field: 'brand',mincount: 1,limit: 50, numBuckets: true},
            name: {type:"terms", field: 'name',mincount: 1,limit: 100, numBuckets: true},
            type: {type:"terms", field: 'type',mincount: 1,limit: 20, numBuckets: true},
            material: {type:"terms", field: 'material',mincount: 1,limit: 20, numBuckets: true},
            color: {type:"terms", field: 'color',mincount: 1,limit: 20, numBuckets: true},
            weight: {type:"terms", field: 'weight',mincount: 1,limit: 20, numBuckets: true},
            speed: {type:"terms", field: 'speed',mincount: 1,limit: 20, numBuckets: true},
            glide: {type:"terms", field: 'glide',mincount: 1,limit: 20, numBuckets: true},
            turn: {type:"terms", field: 'turn',mincount: 1,limit: 20, numBuckets: true},
            fade: {type:"terms", field: 'fade',mincount: 1,limit: 20, numBuckets: true}
        },
        params: {
            wt: 'json',
            qf:"q_brand q_name q_type q_material q_color weight q_tag^0.2",
                lowercaseOperators:"true",
                stopwords:"true",
                defType:"edismax"
            },
        limit: typeof opts.limit !== 'undefined' ? opts.limit : 20,
        offset: opts.start || 0
    };
    
    if (opts.query) {
        req.query = opts.query != '' ? opts.query : '*';
    }
    
    if (opts.sort) {
        if (opts.sort == 'dAsc') {
            req.sort = 'createDate asc';
        } else if (opts.sort == 'dDesc') {
            req.sort = 'createDate desc';
        }
    }
    
    if (opts.group) {
        req.params.group = true;
        req.params["group.limit"] = opts.group.limit ? opts.group.limit : undefined;
        req.params["group.field"] = opts.group.field;
    }
    
    if (opts.valueRange) {
        req.facet.value_i = {
            type: 'range',
            field: 'value_i',
            other: 'after',
            start: opts.valueRange.start || 0,
            end: opts.valueRange.end || 0,
            gap: opts.valueRange.gap || 0
        }
    }
    
    // if (opts.filter) {
    //     var excludeTags = '';
    //     for (var i = opts.filter.length - 1; i >= 0; i--) {
    //         var field = opts.filter[i].name;
             
    //         if (req.facet[field] && opts.filter[i].fields.length) {
    //             var fieldName = req.facet[field].field;
                
    //             if (fieldName == 'marketplace.forSale' || fieldName == 'marketplace.forTrade') {
    //                 if (req.params.fq) {
    //                     req.params.fq = req.params.fq.substr(0, req.params.fq.length - 1) + ' OR ' + fieldName + ':true)';
    //                 } else {
    //                     req.params.fq = '{!tag=t_marketplace}(' + fieldName + ':true)';
    //                 }
    //                 req.facet['forSale'].domain = {excludeTags: 't_marketplace'};
    //                 req.facet['forTrade'].domain = {excludeTags: 't_marketplace'};
    //                 continue;
    //             }
                
    //             var filterString = '{!tag=t_' + fieldName  + '}';
    //             for (var j = 0; j < opts.filter[i].fields.length; j++) {
    //                 var value = opts.filter[i].fields[j];
    //                 value = /^\[.*\]$/.test(value) ? value : '"' + value + '"';
                    
    //                 filterString = filterString + (j > 0 ? ' OR ': '') + fieldName + ':' + value;
    //             }
    //             req.filter.unshift(filterString);
                
    //             excludeTags = 't_' + fieldName + (excludeTags.length ? ',' : '') + excludeTags;
    //             req.facet[field].domain = {excludeTags: excludeTags};
    //         }
    //     }
    // }
    
    if (opts.filter) {
        var excludeActive = false, marketActive = false;
        for (var i = opts.filter.length - 1; i >= 0; i--) {
            var field = opts.filter[i].name;
             
            if (req.facet[field] && opts.filter[i].fields.length) {
                var fieldName = req.facet[field].field;
                
                if (fieldName == 'marketplace.forSale' || fieldName == 'marketplace.forTrade') {
                    if (req.params.fq) {
                        req.params.fq = req.params.fq.substr(0, req.params.fq.length - 1) + ' OR ' + fieldName + ':true)';
                    } else {
                        req.params.fq = '{!tag=t_marketplace}(' + fieldName + ':true)';
                    }
                    req.facet['forSale'].domain = {excludeTags: 't_marketplace'};
                    req.facet['forTrade'].domain = {excludeTags: 't_marketplace'};
                    marketActive = true;
                } else {
                    var filterString = '{!tag=t_' + fieldName  + '}';
                    for (var j = 0; j < opts.filter[i].fields.length; j++) {
                        var value = opts.filter[i].fields[j];
                        value = /^\[.*\]$/.test(value) ? value : '"' + value + '"';
                        
                        filterString = filterString + (j > 0 ? ' OR ': '') + fieldName + ':' + value;
                    }
                    req.filter.unshift(filterString);
                    
                    if (!excludeActive) {
                        req.facet[field].domain = {excludeTags: 't_' + fieldName};
                    }
                    
                    if (marketActive) {
                        req.facet[field].mincount = 0;
                    }
                    
                    if (!excludeActive) {
                        excludeActive = true;
                        continue;
                    }
                }
                
                if (excludeActive) {
                    req.facet[field].mincount = 0;
                }
            }
        }
    }
    
    req.filter.unshift('visible:true');
    
    if (userId) {
        req.facet.tag = {type:"terms", field: 'tag', mincount: 1, limit: 50, numBuckets: true};
        req.filter.unshift('userId:' + userId);
    }
    
    return req;
}