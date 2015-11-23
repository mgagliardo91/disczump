// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth' : {
        'clientID'      : '1433417853616595', // your App ID
        'clientSecret'  : '8f4bdccf243ed064d9446ef2f43f7054', // your App Secret
    },
    // 'gmailAuth' : {
    //     'user': 'mike@disczump.com',
    //     'clientId': '723723683604-s6u02iaupjn5n4u170hh7jvoua4km472.apps.googleusercontent.com',
    //     'clientSecret': 'xxNzkZ4m3rqU3-GypyaFaPQk',
    //     'refreshToken': '1/JMhx2AJhcZKVgShKyOSWy0qWfrh4iGKd7scJ02rQhuAMEudVrK5jSpoR30zcRFq6',
    // },
    'gmailAuth' : {
        'user': 'support@disczump.com',
        'clientId': '723723683604-s6u02iaupjn5n4u170hh7jvoua4km472.apps.googleusercontent.com',
        'clientSecret': 'xxNzkZ4m3rqU3-GypyaFaPQk',
        'refreshToken': '1/cAZ5JazA1yXVtjy11ElwFgpiZw2wbLaOlCAGmGxKAiI',
    },
    'geocode' : {
        'apiKey': 'AIzaSyB7kWqjg0Yei5bPUhwmKmvLVk6Zugh_-Fw'
    },
    'crypto' : {
        'algorithm': 'aes-256-ctr',
        'password': 'dd34x7912Id'
    }
};