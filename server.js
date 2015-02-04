// set up ======================================================================
var express  = require('express');
var app      = express();
var port     = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var device       = require('express-device');
var session      = require('express-session');
var exphbs = require('express-handlebars');
var config = require('./config/config.js');
var oauth2 = require('./config/oauth2.js');
var logger = require('./config/logger.js').logger;
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
  req.device.isMobile = req.device.type == 'phone' 
    || req.device.type == 'tablet';
  next();
});


var hbs = exphbs.create({
    defaultLayout: 'main',
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

var gridFs = new Grid(mongoose.connection.db, mongoose.mongo);

// routes ======================================================================
var mainRouter = express.Router();
require('./app/routes.js')(mainRouter, passport);
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


// launch ======================================================================
app.listen(port);
logger.info('Server running at %s:%s', process.env.IP, port);