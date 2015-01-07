module.exports = {
    
    internalError: 'Internal Error',
    objectNotFoundError: 'Object Not Found Error',
    unauthorizedError: 'Unauthorized Error',
    invalidDataError: 'Invalid Data Error',
    
    createError : function(err, type) {
        return {'error' : { 'message' : err, 'type' : (type ? type : 'Default Error')}};
    }
    
}

