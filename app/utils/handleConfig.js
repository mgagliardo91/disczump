var exphbs = require('express-handlebars');
var Handlebars = require('handlebars');
var moment = require('moment');
var _ = require('underscore');
var expressHandle, mainInit;

var DateFormats = {
	long: "MMMM DD, YYYY HH:mm",
	short: "MM/DD/YY HH:mm"
};

module.exports = {
	getExpressHandle: getExpressHandle,
	getMainHandle: getMainHandle,
	registerHelpers: registerHelpers
}

function getMainHandle() {
	if (!mainInit) {
		registerHelpers(Handlebars);

		mainInit = true;
	}

	return Handlebars;
}

function getExpressHandle() {
	if (!expressHandle) {
		expressHandle = exphbs.create({
			defaultLayout: 'main',
			helpers: {
				section: function(name, options) {
					if (!this._sections) this._sections = {};
					this._sections[name] = options.fn(this);
					return null;
				},
				or2: function(in1, in2, options) {
					if (in1 || in2) return options.fn(this);
					return options.inverse(this);
				},
				or3: function(in1, in2, in3, options) {
					if (in1 || in2 || in3) return options.fn(this);
					return options.inverse(this);
				},
				exists: function(in1, options) {
					if (typeof(in1) === 'undefined' || in1.length == 0) {
						return options.inverse(this);
					}

					return options.fn(this);
				},
				eq: function(in1, in2, options) {
					if (in1 !== in2) {
						return options.inverse(this);
					}

					return options.fn(this);
				},
				neq: function(in1, in2, options) {
					if (in1 === in2) {
						return options.inverse(this);
					}

					return options.fn(this);
				},
				formatDate: function(datetime, format) {
					if (moment) {
						format = DateFormats[format] || format;
						return moment(datetime).format(format);
					} else {
						return datetime;
					}
				},
				compileToHtml: function(data) {
					return processLinks(data).replace(/\n/g, '<br>');
				},
				compileAsHtml: function(data) {
					return data.replace(/\n/g, '<br>');
				},
				meta: function(headers) {
					var ret = '';
					for (var i = 0; i < headers.length; i++) {
						ret += '<meta property="' + headers[i].prop + '" content="' + headers[i].content + '" />';
					}

					return ret;
				}
			}
		});
	}

	return expressHandle;
}

var processLinks = function(body) {
	var urlRegex = /(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.#=?-]*)*\/?/g;
	var res = _.uniq(body.match(urlRegex));

	if (res.length) {
		_.each(res, function(url) {
			var regex = new RegExp(url, 'g');
			body = body.replace(regex, '<a href="' + url + '">' + url + '</a>');
		});
	}

	return body;
}

function registerHelpers(hb) {
	hb.registerHelper("formatDate", function(datetime, format) {
		if (moment) {
			format = DateFormats[format] || format;
			return moment(datetime).format(format);
		} else {
			return datetime;
		}
	});

	hb.registerHelper("compileToHtml", function(data) {
		return processLinks(data).replace(/\n/g, '<br>');
	});

	hb.registerHelper("compileAsHtml", function(data) {
		return data.replace(/\n/g, '<br>');
	});
	
	hb.registerHelper('neq', function(in1, in2, options) {
		if (in1 === in2) {
			return options.inverse(this);
		}

		return options.fn(this);
	});
	
	hb.registerHelper('meta', function(headers) {
		var ret = '';
		for (var x in headers) {
			ret += '<meta property="' + x + '" content="' + headers[x] + '"/>';
		}
		
		return ret;
	});
}