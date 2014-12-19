// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth' : {
        'clientID'      : '1550116791900915', // your App ID
        'clientSecret'  : '6f3e579ae84dbfae898af2f65c5feccf', // your App Secret
        'callbackURL'   : 'http://localhost:8080/auth/facebook/callback'
    },
    'gmailAuth' : {
        'user': 'disczump@gmail.com',
        'clientId': '349788309355-umpd9us6d7vc3tpl0qphrgefgl7rk994.apps.googleusercontent.com',
        'clientSecret': 'f59IbvBTTag9qYbLzyYenk-x',
        'refreshToken': '1/VIBjpYRZbFHjk7KWcAEVX3HtwvEA3LszcUR-boOoYHUMEudVrK5jSpoR30zcRFq6',
    }
};
