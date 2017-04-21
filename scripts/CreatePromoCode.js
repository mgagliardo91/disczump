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
        code: 'SQNECQWU',
        description: 'Enjoy two free months of membership!',
        config: {
            promoMonthsBefore: 2
//             promoMonthsAfter: 1
//             alternateCost: 1
        },
         preReq: {
            newUser: true,
           // accountType: 'Pro',
            singleUse: true
        },
        isUnique: true,
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
