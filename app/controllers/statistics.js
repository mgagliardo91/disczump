var Admin = require('../models/admin.js');
var User = require('../models/user.js');
var Disc = require('../models/disc.js');
var DiscTemplate = require('../models/discTemplate.js');
var Event = require('../models/event.js');
var async = require('async');

var Error = require('../utils/error.js');

module.exports = {
    getUserCount: getUserCount,
    getActiveUserCount: getActiveUserCount,
    getUserStats: getUserStats,
    getDiscStats: getDiscStats
}

function getUserStats(callback) {
    var totalCount = 0, activeCount = 0;
    
    async.series([
        function(cb) {
            getUserCount(function(err, count) {
                if (!err && count) {
                    totalCount = count;
                }
                
                cb();
            });
        },
        function(cb) {
            getActiveUserCount(function(err, count) {
                if (!err && count) {
                    activeCount = count;
                }
                
                cb();
            });
        }
    ], function(err, results) {
        callback(null, {total: totalCount, active: activeCount});
    });
}

function getUserCount(callback) {
	User.count({}, function(err, count) {
		if (err)
			return callback(Error.createError(err, Error.internalError));
		
		return callback(null, count);
	});
}

function getActiveUserCount(callback) {
	User.count({'local.active': true}, function(err, count) {
		if (err)
			return callback(Error.createError(err, Error.internalError));
		
		return callback(null, count);
	});
}

function getDiscStats(callback) {
    Disc.count({}, function(err, count) {
		if (err)
			return callback(Error.createError(err, Error.internalError));
		
		return callback(null, {total: count});
	});
}