// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {
    'gmailAuth' : {
        'user': 'support@disczump.com',
        'clientId': '327043434975-q4t3oekdq6nqidfpmepi93dtspl572j4.apps.googleusercontent.com',
        'clientSecret': '9aM5r-eNo5im_iANR8slFrG1',
        'refreshToken': '1/OuQUOeNCaBsA7QmPIFH99XAP0UjI4herOobbnQWf_5IMEudVrK5jSpoR30zcRFq6',
    },
    'geocode' : {
        'apiKey': 'AIzaSyB7kWqjg0Yei5bPUhwmKmvLVk6Zugh_-Fw'
    },
    'crypto' : {
        'algorithm': 'aes-256-ctr',
        'password': 'dd34x7912Id'
    },
    'paypal' : {
        'url': 'https://payflowpro.paypal.com',
        'dev-url': 'https://pilot-payflowpro.paypal.com',
        'partner': 'PayPal',
        'vendor': 'zumpadmin',
        'user': 'mgagliardo',
        'pwd': 'Zumbl3bee'
    }
};