var request = require('request');
var XDate = require('xdate');

var PromoCodeController = require('../controllers/promoCode');

var logger = require('./logger.js');
var Error = require('./error.js');

var PayPalConfig = require('../../config/auth.js').paypal;
var PaymentConfig = require('../../config/config.js').payment;
var LocalConfig = require('../../config/localConfig.js');

module.exports = {
    createHostedPage: createHostedPage,
    parsePaypalPost: parsePaypalPost,
    createRecurringTrx: createRecurringTrx,
	modifyRecurringTrx: modifyRecurringTrx,
	cancelRecurringTrx: cancelRecurringTrx,
	activateRecurringTrx: activateRecurringTrx,
	doInquiry: doInquiry
}

function parsePayPalDate(date) {
	return new XDate(
            parseInt(date.substr(4,4)),
            parseInt(date.substr(0,2)) - 1,
            parseInt(date.substr(2,2))
        );
}

function encodeRequest(request) {
    try {
        var reqStr = '';
        for (var x in request) {
            reqStr += (reqStr.length ? '&' : '') + x + '=' + String(request[x]).replace(/[\&\+]/, '');
        }
        
        return reqStr;
    } catch (e) {
        logger.error(e);
        return undefined;
    }
}

function parseResponse(response) {
    if (!response)
        return undefined;
    
    try {
        var result = {};
        var params = response.split('&');
        for (var i = 0; i < params.length; i++) {
            var keyval = params[i].split('=');
            if (keyval.length == 2) {
                result[keyval[0]] = keyval[1];
            }
        }
        
        return result;
    } catch (e) {
        return undefined;
    }
}

function handleResponse(body) {
    var data = parseResponse(body);

    if (!data)
        return {success: false};

    if (data.RESULT !== '0') {
		logger.debug('Error occurred in modifying trx', data);
        return {success: false, err: '[' + data.RESULT + '] ' + data.RESPMSG};
	}
    
    return {success: true, data: data};
} 

function createHostedPage(userId, secureId, billing, callback) {
    if (typeof(billing) === 'undefined') {
        return Error.createError('Invalid billing information supplied with request.', Error.invalidDataError);
    }
    
    var options = {
        url: PayPalConfig.url,
        body: encodeRequest({
            'PARTNER': PayPalConfig.partner,
            'VENDOR': PayPalConfig.vendor,
            'USER': PayPalConfig.user,
            'PWD': PayPalConfig.pwd,
            'TRXTYPE': 'A',
            'AMT': 0.0,
            'CREATESECURETOKEN': 'Y',
            'SECURETOKENID': secureId,
            'BILLTOFIRSTNAME': billing.firstName,
            'BILLTOLASTNAME': billing.lastName,
            'BILLTOSTREET': billing.street,
            'BILLTOSTREET2': billing.street2 || '',
            'BILLTOCITY': billing.city,
            'BILLTOSTATE': billing.state,
            'BILLTOZIP': billing.postalCode,
            'BILLTOCOUNTRY': billing.country,
			'COMMENT1': userId,
            'L_BILLINGTYPE0': 'MerchantInitiatedBilling',
            'TRAILER_PASSTHROUGH__': 'Y',
        }),
        method: 'POST'
    }
    
    logger.debug(options);

    request(options, function(err, response, body) {
        
        if (err || response.statusCode != 200) {
            return callback(Error.createError('Unable to create payment request.', Error.internalError));
        }
        
        var resp = handleResponse(body);
        
        if (!resp.success)
            return callback(Error.createError('Unable to create payment request.' + (resp.err ? ' Response: ' + resp.err + '.' : ''), Error.paypalError));
        
        var data = resp.data;
        
        return callback(null, {secureToken: data.SECURETOKEN, secureTokenId: data.SECURETOKENID});
    });
}

function parsePaypalPost(body, callback) {
    if (body.RESULT !== '0')
        return callback(Error.createError('The transaction was not processed successfully.', Error.internalError));
    
    return callback(null, {secureTokenId: body.SECURETOKENID})
}

function doInquiry(profileId, callback) {
    var requestParams = {
        'PARTNER': PayPalConfig.partner,
        'VENDOR': PayPalConfig.vendor,
        'USER': PayPalConfig.user,
        'PWD': PayPalConfig.pwd,
        'TRXTYPE': 'R',
        'ACTION': 'I',
        'ORIGPROFILEID': profileId,
    };
    
    var options = {
        url: PayPalConfig.url,
        body: encodeRequest(requestParams),
        method: 'POST'
    }

    request(options, function(err, response, body) {
        
        if (err || response.statusCode != 200) {
            return callback(Error.createError('Unable to create recurring payment profile.', Error.internalError));
        }
        
        var resp = handleResponse(body);
        
        if (!resp.success)
            return callback(Error.createError('Unable to create recurring payment profile.' + (resp.err ? ' Response: ' + resp.err + '.' : ''), Error.paypalError));
        
        var data = resp.data;
		logger.debug('PayPal start date', data.START);
		var start = parsePayPalDate(data.START);
		logger.debug('Parsed start date', start);
		
		logger.debug('PayPal next date', data.NEXTPAYMENT);
		var nextPayment = parsePayPalDate(data.NEXTPAYMENT);
		logger.debug('Parsed next date', nextPayment);
		
		logger.debug('PayPal create date', data.CREATIONDATE);
		var createDate = parsePayPalDate(data.CREATIONDATE);
		logger.debug('Parsed create date', createDate);
        
        return callback(null, {
            profileId: data.PROFILEID,
            status: data.STATUS,
            creationDate: createDate.toISOString(),
			nextBillDate: nextPayment.toISOString(),
            start: start.toISOString(),
            term: data.TERM,
            payPeriod: data.PAYPERIOD,
            draftAmount: data.AMT,
            acct: data.ACCT,
            expDate: data.EXPDATE,
            tender: data.TENDER
        });
    });
    
}

function handlePromo(immedCharge, promo) {
	var delayMonths = 0;
	
	if (promo && typeof(promo.config.alternateCost) !== 'undefined') {
		immedCharge = promo.config.alternateCost;
	}
	
	if (promo && typeof(promo.config.promoMonthsAfter) !== 'undefined') {
		delayMonths = 1 + promo.config.promoMonthsAfter;
	}
	
	if (promo && typeof(promo.config.promoMonthsBefore) !== 'undefined') {
		delayMonths = promo.config.promoMonthsBefore;
		immedCharge = 0;
	}
	
	return {
		immedCharge: immedCharge,
		delayMonths: delayMonths
	}
}

function createRecurringTrx(req, body, callback) {
    if (body.RESULT !== '0')
        return callback(Error.createError('The transaction was not processed successfully. Please try again later.', Error.internalError));
    
    logger.debug('Attempting to create recurring trx profile.');
    
    var PNREF = body.PNREF;
    var BAID = body.BAID;
    var requestParams = {
        'PARTNER': PayPalConfig.partner,
        'VENDOR': PayPalConfig.vendor,
        'USER': PayPalConfig.user,
        'PWD': PayPalConfig.pwd,
        'PROFILENAME': 'Membership',
        'TRXTYPE': 'R',
        'ACTION': 'A',
        'AMT': req.toAccount.amount,
        'TERM': PaymentConfig.term,
        'PAYPERIOD': PaymentConfig.payPeriod,
		'RETRYNUMDAYS': PaymentConfig.retryDays,
        'BILLTOFIRSTNAME': body.BILLTOFIRSTNAME,
        'BILLTOLASTNAME': body.BILLTOLASTNAME,
        'BILLTOSTREET': body.BILLTOSTREET,
        'BILLTOSTREET2': body.BILLTOSTREET2,
        'BILLTOCITY': body.BILLTOCITY,
        'BILLTOSTATE': body.BILLTOSTATE,
        'BILLTOZIP': body.BILLTOZIP,
        'BILLTOCOUNTRY': body.BILLTOCOUNTRY,
		'EMAIL': req.userEmail
    };
    
    if (body.TENDER == 'CC') {
        requestParams['ORIGID'] = PNREF;
        requestParams['TENDER'] = 'C';
    } else if (body.TENDER == 'P') {
        requestParams['BAID'] = BAID;
        requestParams['TENDER'] = 'P';
    }
	
	var promo = req.promo;
	var hasPromo = typeof(promo) !== 'undefined';
	
	var config = handlePromo(req.immediateCharge, promo);
	
	if (config.immedCharge) {
		requestParams['OPTIONALTRX'] = 'S';
		requestParams['OPTIONALTRXAMT'] = config.immedCharge;
	}
    
	logger.debug('Current date', new XDate());
    var date = (new XDate()).addMonths(Math.max(config.delayMonths,1));
	
	logger.debug('Start date', date);
    
    requestParams['START'] = date.toString('MMddyyyy');
    
    var options = {
        url: PayPalConfig.url,
        body: encodeRequest(requestParams),
        method: 'POST'
    }
	
	logger.debug('Sending request with immed charge', config.immedCharge);

    request(options, function(err, response, body) {
        
        if (err || response.statusCode != 200) {
            return callback(Error.createError('Unable to create membership proile.', Error.internalError));
        }
        
        var resp = handleResponse(body);
        
        if (!resp.success) {
            logger.debug('Error in response from recurring trx', resp.err);
            return callback(Error.createError('Unable to create membership proile.', Error.paypalError));
        }
		
        var data = resp.data;
				
		var immedCb;
		if (typeof(config.immedCharge) !== 'undefined') {
			immedCb = {
				amount: config.immedCharge,
				success: config.immedCharge > 0 ? typeof(data.TRXRESULT) !== 'undefined' && data.TRXRESULT === '0' : true
			}
		}
        logger.debug('Found immediate charge', immedCb);
        logger.debug('Running an inquiry for profile id: ' + data.PROFILEID);
        doInquiry(data.PROFILEID, function(err, inquiry) {
            if (err) {
                logger.error('Error in response from inquiry', resp.err);
                return callback(null, {
					profile: {
						startDate: date.toISOString(),
						payPeriod: requestParams['PAYPERIOD'],
						tender: requestParams['TENDER'],
						origPNRef: PNREF,
						origBAId: BAID,
						draftAmount: req.toAccount.amount,
						profileId: data.PROFILEID,
						pendingReset: false,
						active: false,
					},
					immedCharge: immedCb,
					promo: hasPromo ? promo._id : undefined
				});
            }
			
            return callback(null, {
                profile: {
					startDate: inquiry.start,
					nextBillDate: inquiry.nextBillDate,
					payPeriod: inquiry.payPeriod,
					tender: inquiry.tender,
					origPNRef: PNREF,
					origBAId: BAID,
					draftAmount: inquiry.draftAmount,
					profileId: inquiry.profileId,
					acct: inquiry.acct,
					expDate: inquiry.expDate,
					pendingReset: false,
					active: inquiry.status === 'ACTIVE',
					activePromo: hasPromo ? promo._id : undefined
				},
				immedCharge: immedCb,
				promo: hasPromo ? promo._id : undefined
            });
        });
    })
    
}

function modifyRecurringTrx(userProfile, req, callback) {
	var requestParams = {
        'PARTNER': PayPalConfig.partner,
        'VENDOR': PayPalConfig.vendor,
        'USER': PayPalConfig.user,
        'PWD': PayPalConfig.pwd,
        'TRXTYPE': 'R',
        'ACTION': 'M',
        'ORIGPROFILEID': userProfile.profileId,
    };
	
	if (typeof(req.toAccount.amount) !== 'undefined') { 
		requestParams['AMT'] = req.toAccount.amount;
	}
	
	var promo = req.promo;
	var hasPromo = typeof(promo) !== 'undefined';
	var config = handlePromo(req.immediateCharge, promo);
	
	if (config.immedCharge) {
		requestParams['OPTIONALTRX'] = 'S';
		requestParams['OPTIONALTRXAMT'] = config.immedCharge;
	}
	
	if (config.delayMonths) {
		var date = (new XDate(userProfile.nextBillDate)).addMonths(config.delayMonths);

		logger.debug('Start date', date);
		requestParams['START'] = date.toString('MMddyyyy');
	}
    
    var options = {
        url: PayPalConfig.url,
        body: encodeRequest(requestParams),
        method: 'POST'
    }
	
	logger.debug('Sending request', requestParams);

    request(options, function(err, response, body) {
        
        if (err || response.statusCode != 200) {
            return callback(Error.createError('Unable to modify recurring payment profile.', Error.internalError));
        }
        
        var resp = handleResponse(body);
        
        if (!resp.success) {
            return callback(Error.createError('Unable to modify recurring payment profile.' + (resp.err ? ' Response: ' + resp.err + '.' : ''), Error.paypalError));
		}
        
        var data = resp.data;
		var immedCb;
		if (typeof(config.immedCharge) !== 'undefined') {
			immedCb = {
				amount: config.immedCharge,
				success: config.immedCharge > 0 ? typeof(data.TRXRESULT) !== 'undefined' && data.TRXRESULT === '0' : true
			}
		}
		
		logger.debug('Running an inquiry for profile id: ' + data.PROFILEID);
        doInquiry(data.PROFILEID, function(err, inquiry) {
            if (err) {
                logger.debug('Error in response from inquiry', resp.err);
				var retProfile = {
					profileId: data.PROFILEID,
					pendingReset: false,
					active: false,
				}
				
				if (typeof(req.toAccount.amount) !== 'undefined') {
					retProfile.draftAmount = req.toAccount.amount;
				}
				
                return callback(null, {
					profile: retProfile,
					immedCharge: immedCb,
					promo: hasPromo ? promo._id : undefined
                });
            }
            
            return callback(null, {
				profile: {
					nextBillDate: inquiry.nextBillDate,
					draftAmount: inquiry.draftAmount,
					profileId: inquiry.profileId,
					pendingReset: false,
					active: inquiry.status === 'ACTIVE',
				},
				immedCharge: immedCb,
				promo: hasPromo ? promo._id : undefined
				
            });
        });
    });
}

function cancelRecurringTrx(profileId, callback) {
	var requestParams = {
        'PARTNER': PayPalConfig.partner,
        'VENDOR': PayPalConfig.vendor,
        'USER': PayPalConfig.user,
        'PWD': PayPalConfig.pwd,
        'TRXTYPE': 'R',
        'ACTION': 'C',
        'ORIGPROFILEID': profileId,
    };
    
    var options = {
        url: PayPalConfig.url,
        body: encodeRequest(requestParams),
        method: 'POST'
    }

    request(options, function(err, response, body) {
        
        if (err || response.statusCode != 200) {
            return callback(Error.createError('Unable to modify recurring payment profile.', Error.internalError));
        }
        
        var resp = handleResponse(body);
        
        if (!resp.success)
            return callback(Error.createError('Unable to modify recurring payment profile.' + (resp.err ? ' Response: ' + resp.err + '.' : ''), Error.paypalError));
        
        var data = resp.data;
		
		return callback(null, {
			profile: {
				draftAmount: 0.00,
				pendingReset: false,
				active: false
			}
		});
    });
}

function activateRecurringTrx(userProfile, req, callback) {
	var requestParams = {
        'PARTNER': PayPalConfig.partner,
        'VENDOR': PayPalConfig.vendor,
        'USER': PayPalConfig.user,
        'PWD': PayPalConfig.pwd,
        'TRXTYPE': 'R',
        'ACTION': 'R',
        'ORIGPROFILEID': userProfile.profileId,
        'AMT': req.toAccount.amount,
        'TERM': PaymentConfig.term,
        'PAYPERIOD': PaymentConfig.payPeriod,
    };
	
	var promo = req.promo;
	var hasPromo = typeof(promo) !== 'undefined';
	var config = handlePromo(req.immediateCharge, promo);
	
	if (config.immedCharge) {
		requestParams['OPTIONALTRX'] = 'S';
		requestParams['OPTIONALTRXAMT'] = config.immedCharge;
	}
	
	var date;
	
	if (userProfile.nextBillDate) {
		var today = new XDate();
		var nextBillDate = new XDate(userProfile.nextBillDate);
		
		if (nextBillDate > today) {
			requestParams['START'] = nextBillDate.addMonths(config.delayMonths).toString('MMddyyyy');
			date = nextBillDate;
		}
	}
	
	if (!requestParams.START) {
		date = (new XDate()).addMonths(Math.max(config.delayMonths,1));
        requestParams['START'] = date.toString('MMddyyyy');
	}
    
    var options = {
        url: PayPalConfig.url,
        body: encodeRequest(requestParams),
        method: 'POST'
    }

    request(options, function(err, response, body) {
        
        if (err || response.statusCode != 200) {
            return callback(Error.createError('Unable to modify recurring payment profile.', Error.internalError));
        }
        
        var resp = handleResponse(body);
        
        if (!resp.success)
            return callback(Error.createError('Unable to modify recurring payment profile.' + (resp.err ? ' Response: ' + resp.err + '.' : ''), Error.paypalError));
        
        var data = resp.data;
		var immedCb;
		if (typeof(config.immedCharge) !== 'undefined') {
			immedCb = {
				amount: config.immedCharge,
				success: config.immedCharge > 0 ? typeof(data.TRXRESULT) !== 'undefined' && data.TRXRESULT === '0' : true
			}
		}
		
		logger.debug('Running an inquiry for profile id: ' + data.PROFILEID);
        doInquiry(data.PROFILEID, function(err, inquiry) {
            if (err) {
                logger.debug('Error in response from inquiry', resp.err);
                return callback(null, {
					profile: {
						startDate: date.toISOString(),
						draftAmount: req.toAccount.amount,
						active: false,
						pendingReset: false
					},
					immedCharge: immedCb,
					promo: hasPromo ? promo._id : undefined
                });
            }
            
            return callback(null, {
				profile: {
					startDate: inquiry.start,
					nextBillDate: inquiry.nextBillDate,
					payPeriod: inquiry.payPeriod,
					draftAmount: inquiry.draftAmount,
					pendingReset: false,
					active: inquiry.status === 'ACTIVE'
				},
				immedCharge: immedCb,
				promo: hasPromo ? promo._id : undefined
            });
        });
    });
}