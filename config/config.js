// config/config.js
module.exports = {

    'database': {
        'db': 'discdb',
        'host': 'localhost',
        'port': 27017
    },
    'secret': 'c3b6bd821123318539d8660d22f7815fd1dcf9e7e4fa8ee2f4c66dee96',
    'tokenTTL': 3600,
    'recoverTTL': 86400,
    'routes': {
        'resetPassword' : 'recover',
        'confirmAccount' : 'confirm'
    },
    'images': {
        'maxSize': 800,
        'thumbnailSize': 150
    },
    'development': {
        'beta': true,
        'passcode': '9E913935EB47FD1F',
    }
};