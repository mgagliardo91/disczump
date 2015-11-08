// set up ======================================================================
var express  = require('express');
var subdomain = require('express-subdomain');
var app      = express();
var port     = process.env.PORT || 80;
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var device       = require('express-device');
var session      = require('express-session');
var config = require('./config/config.js');
var oauth2 = require('./config/oauth2.js');
var socketCache = require('./app/objects/socketCache.js');
var logger = require('./config/logger.js').logger;
var localServer = require('./config/localConfig.js');
var handleConfig = require('./app/utils/handleConfig.js');
var Grid = require('gridfs-stream');

// configuration ===============================================================
require('./app/utils/mailer.js');

mongoose.connect('mongodb://' + config.database.host + ':' + 
    config.database.port + '/' + config.database.db);

require('./config/passport')(passport);

// set up our express application
app.use(morgan('dev'));
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
  req.device.isMobile = req.device.type == 'phone';
  next();
});

var hbs = handleConfig.getExpressHandle();
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

var gridFs = new Grid(mongoose.connection.db, mongoose.mongo);

// routes ======================================================================
var adminRouter = express.Router();
require('./app/adminRoutes.js')(adminRouter, passport);
app.use('/admin', adminRouter);

var adminApiRouter = express.Router();
require('./app/adminApi.js')(adminApiRouter);
app.use('/admin/api', adminApiRouter);

var mainRouter = express.Router();
require('./app/routes.js')(mainRouter, passport, gridFs);
app.use('/', mainRouter);

var apiRouter = express.Router();
require('./app/api.js')(apiRouter, passport, gridFs);
app.use('/api', apiRouter);

var oauthRouter = express.Router();
require('./app/oauthRoutes.js')(oauthRouter, oauth2);
app.use('/oauth', oauthRouter);

var testRouter = express.Router();
require('./app/files.js')(testRouter, gridFs);
app.use('/files', testRouter);

var connectRouter = express.Router();
require('./app/connect.js')(connectRouter, passport, socketCache);
app.use('/connect', connectRouter);


app.get('*', function(req, res){
  res.redirect('/'); 
});

// launch ======================================================================
var server = require('http').createServer(app);
var io = require('socket.io')(server);

require('./config/socket.js').init(io, socketCache, logger);

server.listen(port);

logger.info('[' + localServer.serverIdentity + '] Server running at %s:%s', process.env.IP, port);
logger.info('[' + localServer.serverIdentity + '] Websocket server started.');