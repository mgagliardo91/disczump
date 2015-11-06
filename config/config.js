// config/config.js
module.exports = {

    'database': {
        'db': 'discdb',
        'host': 'localhost',
        'port': 27017
    },
    'secret': 'c3b6bd821123318539d8660d22f7815fd1dcf9e7e4fa8ee2f4c66dee96',
    'admins': [
            'mike@disczump.com',
            'ben@disczump.com',
            'disczump@gmail.com'
        ],
    'tokenTTL': 3600,
    'recoverTTL': 3600,
    'routes': {
        'resetPassword' : 'recover',
        'confirmAccount' : 'confirm'
    },
    'images': {
        'maxSize': 800,
        'thumbnailSize': 150
    },
    'development': {
        'beta': false,
        'passcode': '2015BETADZ',
    },
    'message': {
       'alertThresholdMin': 20 
    },
    'user': {
        'preferences': {
            'colorize': {
                'putter': 'rgb(255, 161, 66)',
                'mid': 'rgb(109, 109, 255)',
                'fairway': 'rgb(255, 109, 109)',
                'distance': 'rgb(66, 255, 66)',
                'mini': 'rgb(255, 66, 255)',
            },
            'colorizeVisibility': true,
            'displayCount': '20',
            'defaultSort': [
    	    	{property: 'brand',sortAsc: true},
    	    	{property: 'name',sortAsc: true}
        	],
        	'defaultView': 'inventory',
        	'galleryCount': '6',
        	'showTemplatePicker': true,
        	'notifications': {
        	    'newMessage': true
        	}
        }
    }
};