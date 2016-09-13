var request = require('request');
var XDate = require('xdate');

var logger = require('./logger.js');
var Error = require('./error.js');

var PayPalConfig = require('../../config/auth.js').paypal;
var PaymentConfig = require('../../config/config.js').payment;

module.exports = {
    createTransaction: createTransaction,
    parsePaypalPost: parsePaypalPost,
    createRecurringTrx: createRecurringTrx,
	modifyRecurringTrx: modifyRecurringTrx,
	cancelRecurringTrx: cancelRecurringTrx,
	activateRecurringTrx: activateRecurringTrx
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

    if (data.RESULT !== '0')
        return {success: false, err: data.RESPMSG};
    
    return {success: true, data: data};
} 

function createTransaction(secureId, amount, billing, callback) {
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
            'TRXTYPE': 'S',
            'AMT': amount,
            'CREATESECURETOKEN': 'Y',
            'SECURETOKENID': secureId,
            'BILLTOFIRSTNAME': billing.firstName,
            'BILLTOLASTNAME': billing.lastName,
            'BILLTOSTREET': billing.street,
            'BILLTOSTREET2': billing.street2,
            'BILLTOCITY': billing.city,
            'BILLTOSTATE': billing.state,
            'BILLTOZIP': billing.postalCode,
            'BILLTOCOUNTRY': billing.country,
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
            return callback(Error.createError('Unable to create payment request.' + (resp.err ? ' Response: ' + resp.err + '.' : ''), Error.internalError));
        
        var data = resp.data;
        
        return callback(null, {secureToken: data.SECURETOKEN, secureTokenId: data.SECURETOKENID});
    });
}

function parsePaypalPost(body, callback) {
    if (body.RESULT !== '0' || body.RESPMSG !== 'Approved')
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
            return callback(Error.createError('Unable to create recurring payment profile.' + (resp.err ? ' Response: ' + resp.err + '.' : ''), Error.internalError));
        
        var data = resp.data;
		
		var start = parsePayPalDate(data.START);
		var nextPayment = parsePayPalDate(data.NEXTPAYMENT);
		var createDate = parsePayPalDate(data.CREATIONDATE);
        
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

function createRecurringTrx(amount, body, callback) {
    if (body.RESULT !== '0' || body.RESPMSG !== 'Approved')
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
        'AMT': amount,
        'TERM': PaymentConfig.term,
        'PAYPERIOD': PaymentConfig.payPeriod,
        'BILLTOFIRSTNAME': body.BILLTOFIRSTNAME,
        'BILLTOLASTNAME': body.BILLTOLASTNAME,
        'BILLTOSTREET': body.BILLTOSTREET,
        'BILLTOSTREET2': body.BILLTOSTREET2,
        'BILLTOCITY': body.BILLTOCITY,
        'BILLTOSTATE': body.BILLTOSTATE,
        'BILLTOZIP': body.BILLTOZIP,
        'BILLTOCOUNTRY': body.BILLTOCOUNTRY
    };
    
    if (body.TENDER == 'CC') {
        requestParams['ORIGID'] = PNREF;
        requestParams['TENDER'] = 'C';
    } else if (body.TENDER == 'P') {
        requestParams['BAID'] = BAID;
        requestParams['TENDER'] = 'P';
    }
    
    var date = (new XDate()).addMonths(1);
    
    requestParams['START'] = date.toString('MMddyyyy');
    
    var options = {
        url: PayPalConfig.url,
        body: encodeRequest(requestParams),
        method: 'POST'
    }

    request(options, function(err, response, body) {
        
        if (err || response.statusCode != 200) {
            return callback(null, {
                startDate: date.toISOString(),
                payPeriod: requestParams['PAYPERIOD'],
                tender: requestParams['TENDER'],
                origPNRef: body.PNREF,
                origBAId: body.BAID,
                draftAmount: amount,
			    active: false
            });
        }
        
        var resp = handleResponse(body);
        
        if (!resp.success) {
            logger.debug('Error in response from recurring trx', resp.err);
            return callback(null, {
                startDate: date.toISOString(),
                payPeriod: requestParams['PAYPERIOD'],
                tender: requestParams['TENDER'],
                origPNRef: PNREF,
                origBAId: BAID,
                draftAmount: amount,
			    active: false
            });
        }
        
        var data = resp.data;
        
        logger.debug('Running an inquiry for profile id: ' + data.PROFILEID);
        doInquiry(data.PROFILEID, function(err, inquiry) {
            if (err) {
                logger.debug('Error in response from inquiry', resp.err);
                return callback(null, {
                    startDate: date.toISOString(),
                    payPeriod: requestParams['PAYPERIOD'],
                    tender: requestParams['TENDER'],
                    origPNRef: PNREF,
                    origBAId: BAID,
                    draftAmount: amount,
                    profileId: data.PROFILEID,
                    active: false
                });
            }
			
            return callback(null, {
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
			    active: inquiry.status === 'ACTIVE'
            });
        });
    })
    
}

function modifyRecurringTrx(profileId, amount, immedCharge, callback) {
	var requestParams = {
        'PARTNER': PayPalConfig.partner,
        'VENDOR': PayPalConfig.vendor,
        'USER': PayPalConfig.user,
        'PWD': PayPalConfig.pwd,
        'TRXTYPE': 'R',
        'ACTION': 'M',
        'ORIGPROFILEID': profileId,
        'AMT': amount,
    };
	
	if (immedCharge && immedCharge > 0) {
		requestParams['OPTIONALTRX'] = 'S';
		requestParams['OPTIONALTRXAMT'] = immedCharge;
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
            return callback(Error.createError('Unable to modify recurring payment profile.' + (resp.err ? ' Response: ' + resp.err + '.' : ''), Error.internalError));
        
        var data = resp.data;
		var immedCb;
		
		if (immedCharge && immedCharge > 0) {
			immedCb = {
				amount: immedCharge,
				success: typeof(data.TRXRESULT) !== 'undefined' && data.TRXRESULT === '0'
			}
		}
		
		
		logger.debug('Running an inquiry for profile id: ' + data.PROFILEID);
        doInquiry(data.PROFILEID, function(err, inquiry) {
            if (err) {
                logger.debug('Error in response from inquiry', resp.err);
                return callback(null, {
                    draftAmount: amount,
                    profileId: data.PROFILEID,
                    active: false
                }, immedCb);
            }
            
            return callback(null, {
				nextBillDate: inquiry.nextBillDate,
                draftAmount: inquiry.draftAmount,
                profileId: inquiry.profileId,
			    active: inquiry.status === 'ACTIVE'
            }, immedCb);
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
            return callback(Error.createError('Unable to modify recurring payment profile.' + (resp.err ? ' Response: ' + resp.err + '.' : ''), Error.internalError));
        
        var data = resp.data;
		
		return callback(null, {
			active: false
		});
    });
}

function activateRecurringTrx(profile, amount, immedCharge, callback) {
	var date = (new XDate()).addMonths(1);
	var requestParams = {
        'PARTNER': PayPalConfig.partner,
        'VENDOR': PayPalConfig.vendor,
        'USER': PayPalConfig.user,
        'PWD': PayPalConfig.pwd,
        'TRXTYPE': 'R',
        'ACTION': 'R',
        'ORIGPROFILEID': profile.profileId,
        'AMT': amount,
        'TERM': PaymentConfig.term,
        'PAYPERIOD': PaymentConfig.payPeriod,
    };
	
	if (immedCharge && immedCharge > 0) {
		requestParams['OPTIONALTRX'] = 'S';
		requestParams['OPTIONALTRXAMT'] = immedCharge;
	}
	
	if (profile.nextBillDate) {
		var today = new XDate();
		var nextBillDate = new XDate(profile.nextBillDate);
		
		if (nextBillDate > today) {
			requestParams['START'] = nextBillDate.toString('MMddyyyy');
			date = nextBillDate;
		}
	}
	
	if (!requestParams.START) {
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
            return callback(Error.createError('Unable to modify recurring payment profile.' + (resp.err ? ' Response: ' + resp.err + '.' : ''), Error.internalError));
        
        var data = resp.data;
		var immedCb;
		
		if (immedCharge && immedCharge > 0) {
			immedCb = {
				amount: immedCharge,
				success: typeof(data.TRXRESULT) !== 'undefined' && data.TRXRESULT === '0'
			}
		}
		
		logger.debug('Running an inquiry for profile id: ' + data.PROFILEID);
        doInquiry(data.PROFILEID, function(err, inquiry) {
            if (err) {
                logger.debug('Error in response from inquiry', resp.err);
                return callback(null, {
                    startDate: date.toISOString(),
                    draftAmount: amount,
                    active: false
                }, immedCb);
            }
            
            return callback(null, {
                startDate: inquiry.start,
				nextBillDate: inquiry.nextBillDate,
                payPeriod: inquiry.payPeriod,
                draftAmount: inquiry.draftAmount,
			    active: inquiry.status === 'ACTIVE'
            }, immedCb);
        });
    });
}