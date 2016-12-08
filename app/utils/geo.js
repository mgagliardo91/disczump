
var GeoConfig = require('../../config/auth.js').geocode;
var Error = require('./error');
var request = require('request');

var formatResult = function(result) {
    var ret = {
        geo: result.geometry.location.lat + ',' + result.geometry.location.lng,
        geoLat: result.geometry.location.lat,
        geoLng: result.geometry.location.lng
    };
    
    for (var i = 0; i < result.address_components.length; i++) {
        var comp = result.address_components[i];
        if (comp.types.indexOf('locality') > -1) {
            ret.city = comp.long_name;
        }
        
        if (comp.types.indexOf('administrative_area_level_1') > -1) {
            ret.administrationArea = comp.long_name;
            ret.administrationAreaShort = comp.short_name;
        }
        
        if (comp.types.indexOf('country') > -1) {
            ret.country = comp.long_name;
            ret.countryCode = comp.short_name;
        }
        
        if (comp.types.indexOf('postal_code') > -1) {
            ret.postalCode = comp.long_name;
        }
    }
    return ret;
}

var parseResults = function(results, filter) {
    if (!filter || !filter.length)
        return formatResult(results[0]);
    
    for (var i = 0; i < results.length; i++) {
        for (var j = 0; j < results[i].types.length; j++) {
            if (filter.indexOf(results[i].types[j]) > -1) {
                return formatResult(results[i]);
            }
        }
    }
    
    return undefined;
}

var getGeoUrl = function() {
    return 'https://maps.googleapis.com/maps/api/geocode/json?key=' + GeoConfig.apiKey;
}

var getReverse = function(lat, lng, callback, filter) {
    var options = {
        url: getGeoUrl() + '&latlng=' + lat + ',' + lng,
        json: true,
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'GET'
    }

    request(options, function (err, response, body) {
        if (err) {
            return callback(Error.createError('Error processing query request.', Error.internalError));
        }
        
        if (body.status !== 'OK')
            return callback(Error.createError('Unable to get location from coordinates.', Error.invalidDataError));
        
        if (!body.results.length)
            return callback(Error.createError('No location exsists for the provided coordinates.', Error.invalidDataError));

        return callback(null, parseResults(body.results, filter));
    })
}

module.exports = {
    getFormattedLoc: function(location) {
        switch (location.countryCode) {
            case 'US':
            case 'CAN':
                {
                    return {
                        shortLocation: location.city + ', ' + location.administrationAreaShort,
                        longLocation: location.city + ', ' + location.administrationArea + ', ' + location.countryCode
                    }
                    break;
                }
            default:
                {
                    return {
                        shortLocation: (location.city || location.administrationArea) + ', ' + location.countryCode,
                        longLocation: (location.city || location.administrationArea) + ', ' + location.country
                    }
                }
        }
    },
    
    getReverse: getReverse
}
