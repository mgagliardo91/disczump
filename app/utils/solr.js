var _ = require('underscore');
var logger = require('./logger.js');
var geoConfig = require('../../config/config.js').geo;

module.exports = {
    createUserReq: createUserReq,
    createDiscReq: createDiscReq,
    createFacetReq: createFacetReq
}

function checkGeo(geo) {
    if (typeof(geo.latitude) === 'undefined' || typeof(geo.longitude) === 'undefined') return false;
    
    return /^(\-?\d+(\.\d+)?)$/.test(geo.latitude) && /^(\-?\d+(\.\d+)?)$/.test(geo.longitude);
}

function createUserReq(opts) {
    var geoSet = false;
    var req = {
        filter: [],
        query: '',
        params: {
            wt: 'json',
            qf:"q_username^2 local.pdgaNumber^2 q_firstName q_lastName",
            lowercaseOperators:"true",
            stopwords:"true",
            defType:"edismax"
        },
        facet: {
            pdga: {type:"terms", field: 'account.verifications.pdga',mincount: 1,limit: 2, numBuckets: false},
            facebook: {type:"terms", field: 'account.verifications.facebook',mincount: 1,limit: 2, numBuckets: false}
        },
        sort: 'score asc,local.username asc',
        limit: typeof opts.limit !== 'undefined' ? opts.limit : 20,
        offset: opts.start || 0
    };
    
    if (typeof(opts.query) !== 'undefined') {
        req.query = opts.query !== '' ? '*' + opts.query.replace('*', '').replace(' ', '* *') + '*' : '*';
    }
    
    if (opts.geo && checkGeo(opts.geo)) {
        var distance = 5;
        if (opts.geo.distance && _.isNumber(opts.geo.distance) && opts.geo.distance > 0) {
            distance = opts.geo.distance;
        }
        
        req.params.sfield = (opts.geo.kilo === true ? 'geo_kilo' : 'geo_miles');
        req.params.pt = opts.geo.latitude + ',' + opts.geo.longitude;
        
        if (opts.geo.filter) {
            req.params.d = distance;
            req.params.fq = '{!tag=t_geo}{!geofilt}';
        }
        
        geoConfig.userFacetRanges.forEach(function(x) {
            req.facet['d_' + x] = {type:'query', q: '{!frange l=0 u=' + x + '}geodist()', mincount:'0'};
            if (opts.geo.filter) {
                req.facet['d_' + x].domain = {excludeTags: 't_geo'};
            }
        });
        geoSet = true;
    }
    
    if (opts.sort) {
        if (opts.sort == 'rel') {
            req.sort = 'score asc,local.username asc';
        } else if (opts.sort == 'proximity' && geoSet) {
            req.sort = 'score asc,geodist() asc';
        }
    }
    
    if (opts.filter) {
        var excludeActive = false;
        for (var i = opts.filter.length - 1; i >= 0; i--) {
            var field = opts.filter[i].name;
             
            if (req.facet[field] && opts.filter[i].fields.length) {
                var fieldName = req.facet[field].field;
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

                if (opts.geo.filter) {
                    req.facet[field].mincount = 0;
                }

                if (!excludeActive) {
                    excludeActive = true;
                    continue;
                }
                
                if (excludeActive) {
                    req.facet[field].mincount = 0;
                }
            }
        }
    }
    
    req.filter.unshift('local.active:true');
    return req;
}

function getSolrField(field) {
    var lcFields = ['brand', 'name', 'type', 'material', 'color', 'tag'];
    var normFields = ['weight'];
    if (lcFields.indexOf(field) > -1) {
        return 'q_' + field;
    } else if (normFields.indexOf(field) > -1) {
        return field;
    } else {
        return undefined;
    }
}

function createFacetReq(opts, userId) {
    var facetReq = {};
    var req = createDiscReq(opts, userId, undefined, true);

    if (opts.facet && opts.facet.name) {
        facetReq.filter = req.filter;
        facetReq.query = req.query;
        facetReq.params = req.params;
        facetReq.sort = req.sort;
        facetReq.limit = 0;
        
        var facet = req.facet[opts.facet.name];
        if (facet) {
            facet.limit = opts.facet.limit || 20;
            facet.offset = opts.facet.offset || 0;
            
            if (opts.facet.query) {
                var field = getSolrField(opts.facet.name);
                if (field) {
                    facetReq.params.qf = field;
                }
            }
        }
        
        facetReq.facet = {};
        facetReq.facet[opts.facet.name] = facet;
        
        return facetReq;
    }
    
    return req;
}

function createDiscReq(opts, userId, reqId, includeTag) {
    var req = {
        filter: [],
        query: '',
        facet: {
            forSale: {type:"terms", field: 'marketplace.forSale',mincount: 1,limit: 2, numBuckets: false},
            forTrade: {type:"terms", field: 'marketplace.forTrade',mincount: 1,limit: 2, numBuckets: false},
            brand: {type:"terms", field: 'brand',mincount: 1,limit: 50, numBuckets: true},
            name: {type:"terms", field: 'name',mincount: 1,limit: 100, numBuckets: true},
            type: {type:"terms", field: 'type',mincount: 1,limit: 20, numBuckets: true},
            material: {type:"terms", field: 'material',mincount: 1,limit: 20, numBuckets: true},
            color: {type:"terms", field: 'color',mincount: 1,limit: 20, numBuckets: true},
            weight: {type:"terms", field: 'weight',mincount: 1,limit: 20, numBuckets: true},
            condition: {type:"terms", field: 'condition',mincount: 1,limit: 10, numBuckets: true},
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
    
    if (typeof(opts.query) !== 'undefined') {
        req.query = opts.query !== '' ? '*' + opts.query.replace('*', '').replace(' ', '* *') + '*' : '*';
    }
    
    if (opts.sort) {
        if (opts.sort == 'rel') {
            req.sort = 'score asc,createDate desc'
        } else if (opts.sort == 'createDate') {
            req.sort = 'createDate desc';
        } else if (opts.sort == 'alpha') {
            req.sort = 'brand asc,name asc'
        } else if (opts.sort == 'new') {
            req.sort = 'marketplace.postedDate desc'
        }
    }
    
    if (opts.group) {
        req.params.group = true;
        req.params["group.limit"] = opts.group.limit ? opts.group.limit : undefined;
        req.params["group.field"] = opts.group.field;
    }
    
    if (opts.valueRange) {
        req.facet.value = {
            type: 'range',
            field: 'marketplace.value',
            other: 'after',
            start: opts.valueRange.start || 0,
            end: opts.valueRange.end || 0,
            gap: opts.valueRange.gap || 0
        }
    }
    
    var marketActive = false;
    if (opts.marketplace) {
        var forSale = typeof(opts.marketplace.forSale) !== 'undefined' ? opts.marketplace.forSale ===  true : undefined;
        var forTrade = typeof(opts.marketplace.forTrade) !== 'undefined' ? opts.marketplace.forTrade === true : undefined;
        
        if (forSale && forTrade) {
            req.params.fq = '{!tag=t_marketplace}(marketplace.forSale:true OR marketplace.forTrade:true)';
            marketActive = true;
        } else if (forSale) {
            req.params.fq = '{!tag=t_marketplace}(marketplace.forSale:true)';
            marketActive = true;
        } else if (forTrade) {
            req.params.fq = '{!tag=t_marketplace}(marketplace.forTrade:true)';
            marketActive = true;
        }
        
        if (marketActive) {
            req.facet.forSale.domain = {excludeTags: 't_marketplace'};
            req.facet.forTrade.domain = {excludeTags: 't_marketplace'};
        }
    }
    
    if (userId || includeTag) {
        req.facet.tag = {type:"terms", field: 'tag', mincount: 1, limit: 50, numBuckets: true};
    }
    
    if (opts.filter) {
        var excludeActive = false;
        for (var i = opts.filter.length - 1; i >= 0; i--) {
            var field = opts.filter[i].name;
             
            if (req.facet[field] && opts.filter[i].fields.length) {
                var fieldName = req.facet[field].field;
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
                
                if (excludeActive) {
                    req.facet[field].mincount = 0;
                }
            }
        }
    }
    
    if (!reqId || reqId !== userId) {
        req.filter.unshift('visible:true');
    } else if (typeof(opts.visible) !== 'undefined') {
        req.filter.unshift('visible:' + opts.visible.toString());
    }
    
    if (userId) {
        req.filter.unshift('userId:' + userId);
    }
    
    return req;
}