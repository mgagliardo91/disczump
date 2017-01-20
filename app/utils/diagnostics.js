var Error = require('../utils/error');
var _ = require('underscore');
var async = require('async');

var User = require('../models/user');
var Disc = require('../models/disc');

var socketManager = require('../objects/socketCache.js');

var membershipConfig = require('../../config/config').membership;

var groupDiscBy = function(type) {
  return [{$group: {_id: null, totalCount: { $sum: 1}, data: {$push: '$$ROOT'} } }, {$unwind: '$data'}, {$group: {_id: '$data.' + type, count: {$sum: 1}, total: {$first: '$totalCount'} } }, {$project: {count: '$count', percent: { $divide: [{$subtract: [{$multiply: [{ $divide: ['$count','$total'] }, 10000 ] }, {$mod: [{$multiply: [{ $divide: ['$count','$total'] }, 10000 ] },1] } ] }, 100 ] } } }, {$sort: {count: -1 } }, {$limit: 10 } ];
}

var getDiscDiagnostics = function(callback) {
  async.parallel({
    total: function(cb) {
      Disc.count({}, function(err, c) {
        if (err)
          return cb(err);

        return cb(null, c);
      });
    },
    topByBrand: function(cb) {
      Disc.aggregate(groupDiscBy('brand'), function(err, items) {
        if (err)
          return cb(err);

        return cb(null, items);
      });
    },
    topByType: function(cb) {
      Disc.aggregate(groupDiscBy('type'), function(err, items) {
        if (err)
          return cb(err);

        return cb(null, items);
      });
    }
  }, function(err, results) {
    if (err) {
      return callback(Error.createError(err, Error.internalError));
    }

    return callback(null, results);
  });
}

var getUserDiagnostics = function(callback) {
  async.parallel({
    total: function(cb) {
      User.count({}, function(err, c) {
        if (err)
          return cb(err);

        return cb(null, c);
      });
    },
    active: function(cb) {
      User.count({
        'local.active': true
      }, function(err, c) {
        if (err)
          return cb(err);

        return cb(null, c);
      });
    },
    online: function(cb) {
      return cb(null, socketManager.getSocketSessions().length);
    },
    basic: function(cb) {
      User.count({
        'account.type': membershipConfig.TypeBasic
      }, function(err, c) {
        if (err)
          return cb(err);

        return cb(null, c);
      });
    },
    entry: function(cb) {
      User.count({
        'account.type': membershipConfig.TypeEntry
      }, function(err, c) {
        if (err)
          return cb(err);

        return cb(null, c);
      });
    },
    pro: function(cb) {
      User.count({
        'account.type': membershipConfig.TypePro
      }, function(err, c) {
        if (err)
          return cb(err);

        return cb(null, c);
      });
    },
    topTen: function(cb) {
      User.aggregate([{
        $lookup: {
          from: 'discs',
          localField: '_id',
          foreignField: 'userId',
          as: 'discItems'
        }
      }, {
        $project: {
          username: '$local.username',
          count: {
            $size: '$discItems'
          }
        }
      }, {
        $sort: {
          count: -1
        }
      }, {
        $limit: 10
      }], function(err, items) {
        if (err)
          return cb(err);

        return cb(null, items);
      })
    }
  }, function(err, results) {
    if (err) {
      return callback(Error.createError(err, Error.internalError));
    }

    return callback(null, results);
  });
}

module.exports = {
  getUserDiagnostics: getUserDiagnostics,
  getDiscDiagnostics: getDiscDiagnostics
}