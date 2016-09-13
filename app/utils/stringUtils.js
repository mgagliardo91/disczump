var XDate = require('xdate');

var DiscController = require('../controllers/disc.js');
var UserController = require('../controllers/user.js');

var DiscConfig = require('../../config/config.js').disc;

var stringifyUser = function(user, callback, full) {
    var account = full ? user.fullAccountToString() : user.accountToString();
    
    DiscController.getDiscCountByUser(user._id, function(err, count) {
        if (err)
            return callback(err);

        account.discCount = count;
        
        return callback(null, account);
    });
}

var stringifyDisc = function(disc) {
    
    var discRet = disc.toObject();
    
    if (disc.marketplaceActive) {
        try {
            var lastMod = new XDate(disc.marketplace.postedDate);
            discRet.marketplace.bumpRemaining = Math.max(0,(new XDate()).diffSeconds(lastMod.addMinutes(DiscConfig.marketplaceModThresholdMins)));
        } catch (e) {
            
        }
    }
    
    return discRet;
}

module.exports = {
    stringifyUser: stringifyUser,
    stringifyDisc: stringifyDisc
}