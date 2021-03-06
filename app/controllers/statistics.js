var async = require('async');
var User = require('../models/user.js');
var Disc = require('../models/disc.js');
var socketManager = require('../objects/socketCache.js');

var Error = require('../utils/error.js');

module.exports = {
    getStats: getStats,
    getUserCount: getUserCount,
    getActiveUserCount: getActiveUserCount,
    getUserStats: getUserStats,
    getDiscStats: getDiscStats
}

function getStats(callback) {
    var ret = {};
    
    async.parallel([
        function(cb) {
            getUserStats(function(err, stats) {
                if (err)
                    return cb(err);
                
                ret.user = stats;
                cb();
            });
        },
        function(cb) {
            getDiscStats(function(err, stats) {
                if (err)
                    return cb(err);
                
                ret.disc = stats;
                cb();
            });
        }
    ], function(err, results) {
        if (err)
            return callback(err);
        
        return callback(null, ret);
    });
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
        callback(null, {total: totalCount, confirmed: activeCount, active: socketManager.getSocketCount()});
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