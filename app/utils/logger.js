var winston = require('winston');
var path = require('path');

module.exports = new (winston.Logger)({
    exitOnError: false,
    transports: [
        new (winston.transports.Console)({
            timestamp: true, 
            colorize: true, 
            prettyPrint: true,
            level: 'debug'
        })
//         new winston.transports.DailyRotateFile({
//           name: 'info-file', 
//           json: false,
//           datePattern: '_yyyy-MM-dd-HH-mm.log',
//           filename: path.join(__dirname, '../../logs/info', 'server'),
//           level: 'info'
//         }),
//         new winston.transports.DailyRotateFile({
//           name: 'error-file',
//           json: false,
//           datePattern: '_yyyy-MM-dd-HH-mm.log',
//           filename: path.join(__dirname, '../../logs/error', 'server'),
//           level: 'error'
//         })
    ]
});