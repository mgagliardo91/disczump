var _ = require('underscore');
var localConfig = require('../../config/localConfig.js');
var AuthConfig = require('../../config/auth.js');

var getStandardHeaders = function(url) {
    return [
        {prop:'fb:app_id', content:AuthConfig.facebookAuth.clientID},
        {prop:'og:url', content:localConfig.serverURL + url},
        {prop:'og:type', content:'website'},
        {prop:'og:image', content:localConfig.serverURL + '/static/logo/logo_portal.png'},
        {prop:'og:image:width', content:'1032'},
        {prop:'og:image:height', content:'339'},
        {prop:'og:description', content:'disc|zump is an online community and marketplace for disc golfers interested in keeping a digital inventory of their collection as well as buying, selling and trading with others, both locally and globally.'},
        {prop:'og:title', content: 'disc|zump'}
    ]
}

var getDiscHeaders = function(disc, url) {
    if (disc && disc.visible) {
        var headers = [
            {prop:'fb:app_id', content:AuthConfig.facebookAuth.clientID},
            {prop:'og:url', content:localConfig.serverURL + url},
            {prop:'og:type', content:'product'},
            {prop:'og:description', content:'Check out this ' + disc.brand + ' ' + disc.name + ' on disc|zump.com.'},
            {prop:'og:title', content:disc.brand + ' ' + disc.name}
        ];

        var discImage = _.findWhere(disc.imageList, {_id: disc.primaryImage});
        if (typeof(discImage) !== 'undefined') {
            headers.push({prop:'og:image', content:localConfig.serverURL + '/files/' + discImage.thumbnailId});
            headers.push({prop:'og:image:width', content:'200'});
            headers.push({prop:'og:image:height', content:'200'});
            for (var i = 0; i < disc.imageList.length; i++) {
                if (discImage._id != disc.imageList[i]._id) {
                    headers.push({prop:'og:image', content:localConfig.serverURL + '/files/' + disc.imageList[i].thumbnailId});
                }
            }
        }

        if (typeof(disc.weight) !== 'undefined') {
            headers.push({prop:'product:weight:value', content:disc.weight});
            headers.push({prop:'product:weight:units', content: 'g'});
        }

        if (typeof(disc.value) !== 'undefined') {
            headers.push({prop:'product:price:amount', content: disc.value.toFixed(2)});
            headers.push({prop:'product:price:currency', content: 'USD'});
        }
        
        return headers;
    } else {
        return getStandardHeaders(url);
    }
}

var getTrunkHeaders = function(user, url) {
    if (user) {
        var headers = [
            {prop:'fb:app_id', content: AuthConfig.facebookAuth.clientID},
            {prop:'og:url', content: localConfig.serverURL + url},
            {prop:'og:type', content:'website'},
            {prop:'og:description', content:'Check out ' + user.local.username + '\'s disc golf collection on disc|zump.com.'},
            {prop:'og:title', content: user.local.username + '\'s trunk is popped'}
        ];
        
        if (typeof(user.local.image) !== 'undefined') {
            headers.push({prop:'og:image', content:localConfig.serverURL + '/files/' + user.local.image});
            headers.push({prop:'og:image:width', content:'200'});
            headers.push({prop:'og:image:height', content:'200'});
        } else if (typeof(user.facebook.image !== 'undefined')) {
            headers.push({prop:'og:image', content:localConfig.serverURL + '/files/' + user.facebook.image});
        }
        return headers;
    } else {
        return getStandardHeaders(url);
    }
}

module.exports = {
    getDiscHeaders: getDiscHeaders,
    getTrunkHeaders: getTrunkHeaders,
    getStandardHeaders: getStandardHeaders
}