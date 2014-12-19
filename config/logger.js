
var winston = require('winston');
exports.logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({'timestamp':true, 'colorize':true, prettyPrint: true,})
    ]
});