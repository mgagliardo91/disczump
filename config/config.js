// config/config.js
module.exports = {

    'database': {
        'db': 'discdb',
        'host': 'localhost',
        'port': 27017
    },
    'secret': 'c3b6bd821123318539d8660d22f7815fd1dcf9e7e4fa8ee2f4c66dee96',
    'admins': [
//             'mike@disczump.com',
//             'ben@disczump.com',
            'disczump@gmail.com',
            'support@disczump.com'
        ],
    'tokenTTL': '1h',
    'recoverTTL': '1h',
    'routes': {
        'resetPassword' : 'recover',
        'confirmAccount' : 'confirm'
    },
    'images': {
        'maxSize': 800,
        'thumbnailSize': 200
    },
    'development': {
        'beta': false,
        'passcode': '2015BETADZ',
    },
    'message': {
       'alertThresholdMin': 20 
    },
    'disc': {
       'marketplaceModThresholdMins': 5 
    },
    'geo': {
        'userFacetRanges': [10, 25, 50, 100, 500]
    },
    'payment': {
        'sessionTTL': '30m',
        'term': 0,
        'payPeriod': 'MONT',
        'retryDays': 2,
        'reminderHours': 48,
        'failRetryAttempts': 3,
        'failCancelAttempts': 3
    },
    'membership': {
        'TypeBasic': 'Basic',
        'TypeEntry': 'Entry',
        'TypePro': 'Pro',
        
        'CostBasic': 0,
        'CostEntry': 0.99,
        'CostPro': 5.99,

        'CapBasic': 2,
        'CapEntry': 6,
        'CapPro': -1,
    }
};