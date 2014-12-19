var User = require('../models/user');
var _ = require('underscore');

module.exports = {
    checkPassword: checkPassword,
}

function checkPassword(password) {
	return password.length >= 6;
}