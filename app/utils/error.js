module.exports = {
    
    internalError: 'Internal Error',
    objectNotFoundError: 'Object Not Found',
    unauthorizedError: 'Unauthorized',
    invalidDataError: 'Invalid Data',
    inactiveError: 'Inactive',
    limitError: 'Limit Reached',
    notImplemented: 'Method Not Implemented',
    paypalError: 'Payment Gateway Error',
    
    createError : function(err, type) {
        return {'error' : { 'message' : err, 'type' : (type ? type : 'Default Error')}};
    }
    
}

