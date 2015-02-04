// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth' : {
        'clientID'      : '1550116791900915', // your App ID
        'clientSecret'  : '6f3e579ae84dbfae898af2f65c5feccf', // your App Secret
        'callbackURL'   : 'http://localhost:8080/auth/facebook/callback'
    },
    'gmailAuth' : {
        'user': 'mike@disczump.com',
        'clientId': '723723683604-s6u02iaupjn5n4u170hh7jvoua4km472.apps.googleusercontent.com',
        'clientSecret': 'xxNzkZ4m3rqU3-GypyaFaPQk',
        'refreshToken': '1/JMhx2AJhcZKVgShKyOSWy0qWfrh4iGKd7scJ02rQhuAMEudVrK5jSpoR30zcRFq6',
    }
};
