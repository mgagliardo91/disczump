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
var session      = require('express-session');
var exphbs = require('express-handlebars');
var config = require('./config/config.js');
var oauth2 = require('./config/oauth2.js');
var logger = require('./config/logger.js').logger;

// configuration ===============================================================
require('./app/utils/mailer.js');

mongoose.connect('mongodb://' + config.database.host + ':' + 
    config.database.port + '/' + config.database.db);

require('./config/passport')(passport);

// set up our express application
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser());
app.use(bodyParser.json());
app.use('/static', express.static(__dirname + '/public'));

// required for passport
app.use(session({ secret: config.secret, cookie: { maxAge: 60000 } }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


var hbs = exphbs.create({
    defaultLayout: 'main',
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// routes ======================================================================
require('./app/routes.js')(app, passport);

var apiRouter = express.Router();
require('./app/api.js')(apiRouter, passport);
app.use('/api', apiRouter);

var oauthRouter = express.Router();
require('./app/oauthRoutes.js')(oauthRouter, oauth2);
app.use('/oauth', oauthRouter);

// launch ======================================================================
app.listen(port);
logger.info('Server running at %s:%s', process.env.IP, port);