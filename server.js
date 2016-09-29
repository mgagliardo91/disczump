// set up ======================================================================
var express  = require('express');
var subdomain = require('express-subdomain');
var app = express();
var fs = require('fs');
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var device       = require('express-device');
var session      = require('express-session');
var config = require('./config/config.js');
var oauth2 = require('./app/auth/oauth2.js');
var socketCache = require('./app/objects/socketCache.js');
var logger = require('./app/utils/logger.js');
var localServer = require('./config/localConfig.js');
var handleConfig = require('./app/utils/handleConfig.js');
var Error = require('./app/utils/error.js');
var Grid = require('gridfs-stream');

// configuration ===============================================================
var release = true; // replace release with release
var httpsPort = (release ? 443 : process.env.PORT || 80);
var httpPort = process.env.PORT || 80;

var privateKey = fs.readFileSync('./private/disczump-key.pem', 'utf8');
var certificate = fs.readFileSync('./private/site-certificate.crt', 'utf8');

require('./app/utils/mailer.js');

mongoose.connect('mongodb://' + config.database.host + ':' + 
    config.database.port + '/' + config.database.db);

require('./app/auth/passport')(passport);

// set up our express application
// if (!release) {
  app.use(morgan('dev'));
// }
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use('/static', express.static(__dirname + '/public'));
app.use(device.capture());

// required for passport
app.use(session({ secret: config.secret}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  req.device.isMobile = req.device.type == 'phone';
  next();
});

var hbs = handleConfig.getExpressHandle();
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

var gridFs = new Grid(mongoose.connection.db, mongoose.mongo);

// routes ======================================================================
var adminRouter = express.Router();
require('./app/routes/adminRoutes.js')(adminRouter, passport);
app.use('/admin', adminRouter);

var adminApiRouter = express.Router();
require('./app/routes/adminApi.js')(adminApiRouter, passport);
app.use('/admin/api', adminApiRouter);

var membershipRouter = express.Router();
require('./app/routes/membership.js')(membershipRouter);
app.use('/membership', membershipRouter);

var apiRouter = express.Router();
require('./app/routes/api.js')(apiRouter, gridFs);
app.use('/api', apiRouter);

var oauthRouter = express.Router();
require('./app/routes/oauthRoutes.js')(oauthRouter, oauth2, passport, socketCache);
app.use('/oauth', oauthRouter);

var testRouter = express.Router();
require('./app/routes/files.js')(testRouter, gridFs);
app.use('/files', testRouter);

var mainRouter = express.Router();
require('./app/routes/routes.js')(mainRouter, passport, gridFs);
app.use('/', mainRouter);

app.get('*', function(req, res){
  res.redirect('/'); 
});

app.use(function(err, req, res, next) {
    if (err) {
        logger.error('Error handling request', err);
        try {
            switch(err.error.type) {
                case Error.internalError:
                    return res.status(500).json(err);
                case Error.objectNotFoundError:
                    return res.status(404).json(err);
                case Error.unauthorizedError:
                    return res.status(401).json(err);
                case Error.invalidDataError:
                    return res.status(400).json(err);
                case Error.inactiveError:
                    return res.status(401).json(err);
                case Error.limitError:
                    return res.status(400).json(err);
                case Error.notImplemented:
                    return res.status(501).json(err);
                default: 
                    return res.status(500).json(err);
            }
        } catch (e) {
            logger.error(err);
            return res.status(500).json(Error.createError('Unknown error occurred.', Error.internalError));
        }
    } else {
        return next();
    }
});

// launch ======================================================================
var server;

if (release) {
  server = require('https').createServer({key: privateKey, cert: certificate}, app);
  require('http').createServer(function (req, res) {
      res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
      res.end();
      
  }).listen(httpPort);
} else {
  server = require('http').createServer(app);
}

var io = require('socket.io')(server);

require('./app/utils/socket.js').init(io, socketCache, logger);

server.listen(httpsPort);

logger.info('[' + localServer.serverIdentity + '] Server running at %s:%s', process.env.IP, httpsPort);
logger.info('[' + localServer.serverIdentity + '] Websocket server started.');