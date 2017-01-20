var Error = require('../utils/error');
var _ = require('underscore');
var async = require('async');

var Diagnostics = require('../utils/diagnostics.js');
var Access = require('../utils/access.js');

// app/diagnosticRoutes.js
module.exports = function(app) {
  app.route('/user')
    .get(Access.hasAccess, function(req, res, next) {
      Diagnostics.getUserDiagnostics(function(err, results) {
        if (err)
          return next(err);
        
        return res.json(results);
      });
    });
	
	 app.route('/disc')
    .get(Access.hasAccess, function(req, res, next) {
      Diagnostics.getDiscDiagnostics(function(err, results) {
        if (err)
          return next(err);
        
        return res.json(results);
      });
    });
  
  
  app.get('*', function(req, res, next) {
    next(Error.createError('Unknown path', Error.unauthorizedError));
	});
}