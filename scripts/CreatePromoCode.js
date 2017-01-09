var mongoose = require('mongoose');
var XDate = require('xdate');
var PromoCodeController = require('../app/controllers/promoCode.js');
var configDB = require('../config/config.js');

mongoose.connect('mongodb://' + configDB.database.host + ':' + 
    configDB.database.port + '/' + configDB.database.db);

mongoose.connection.on('connected', function() {
    var today = new XDate();
    var start = new XDate(today.getFullYear(), today.getMonth(), today.getDate());
    var end = start.clone().addMonths(2);
    
     PromoCodeController.createPromoCode({
        code: 'FREEMONTHPRO',
        description: 'Get a free month if you have an pro level account.',
        config: {
            promoMonthsBefore: 1
//             promoMonthsAfter: 1
//             alternateCost: 1
        },
         preReq: {
            newUser: false,
            accountType: 'Pro',
            singleUse: true
        },
        isUnique: false,
        startDate: start.toDate(),
        endDate: end.toDate()
    }, function(err, promo) {
        if (err) {
            console.log(err);
        } else {
            console.log(promo)
        }
        mongoose.disconnect();
    });
});