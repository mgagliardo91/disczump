
// app/oauthRoutes.js
module.exports = function(app, oauth2) {
    
    app.post('/token', oauth2.token);
}