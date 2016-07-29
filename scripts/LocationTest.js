var _ = require('underscore');
var async = require('async');
var geolib = require('geolib');
var GeoConfig = require('../config/auth.js').geocode;
var geocoder = require("node-geocoder")('google', 'https', {apiKey : GeoConfig.apiKey, formatter: null});

if (process.argv.length != 3) {
    console.log('Invalid arguments');
    process.exit();
}

var search = process.argv[2];

geocoder.geocode(search, function(err, res) {
    if (err)
        return console.log(err);

    if (!res || !res.length)
        return console.log('No results.');
    
    return console.log(res[0]);
});