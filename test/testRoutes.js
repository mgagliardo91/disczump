var should = require('should');
var assert = require('assert');
var request = require('supertest');
var mongoose = require('mongoose');
var winston = require('winston');
var async = require('async');
var path = require('path');
var config = require('../config/config.js');
var Error = require('../app/utils/error');
var ClientModel = require('../app/models/client');
var UserController = require('../app/controllers/user');
var UserModel = require('../app/models/user');
var testConfig = require('../config/test.js');


describe('Routing', function() {
    this.timeout(0);
    var url = 'https://disczumpserver-mgagliardo.c9.io';
    var conn, user, backupUser, accessToken, accessToken2;
    
    var logger = new (winston.Logger)({
        transports: [
            new winston.transports.DailyRotateFile({
              name: 'file',
              json: false,
              datePattern: '.yyyy-MM-dd-HH-mm',
              filename: path.join(__dirname, "../testlogs", "TestRoute.log")
            })
        ]
    });

    /*
    * Prior to testing. Initializes an API client to be used with requests and creates
    * a test user to be used within the subsequent testing calls.
    */
    before(function(done) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        logger.info('Initializing tests.');
        mongoose.connect('mongodb://' + config.database.host + ':' +
            config.database.port + '/' + config.database.db);

        
        logger.info('Creating test API client for use in requests.');
        ClientModel.findOne({
            'name': testConfig.Client.name
        }, function(err, client) {
            if (err)
                throw err;

            async.series([
                function(cb) {
                    if (!client) {
                        client = new ClientModel(testConfig.Client);
                        client.save(function(err) {
                            if (err)
                                throw err;

                            cb();
                        });
                    }
                    else cb();
                },
                function(cb) {
                    logger.info('Creating test user for use in requests.');
                    UserController.createUser(testConfig.User.Create, function(err, newUser) {
                        if (err)
                            throw err;
                        
                        user = newUser;
                        cb();
                    });
                },
                function(cb) {
                    logger.info('Creating test user for use in requests.');
                    UserController.createUser(testConfig.User2.Create, function(err, newUser) {
                        if (err)
                            throw err;
                        
                        backupUser = newUser;
                        cb();
                    });
                },
                function(cb) {
                    request(url)
                    .post('/oauth/token')
                    .send('grant_type=password&username=' + 
                        testConfig.User.Create.email + '&password=' + 
                        testConfig.User.Create.password + '&client_id=' + 
                        testConfig.Client.clientId + '&client_secret=' + 
                        testConfig.Client.clientSecret)
                    .end(function(err, res) {
                        if (err)
                            throw err;
    
                        res.body.should.have.property('access_token');
                        res.body.token_type.should.equal('Bearer');
                        accessToken = res.body.access_token;
                        logger.info('Retrieved accessToken for requests: ' + accessToken);
                        cb();
                    });
                },
                function(cb) {
                    request(url)
                    .post('/oauth/token')
                    .send('grant_type=password&username=' + 
                        testConfig.User2.Create.email + '&password=' + 
                        testConfig.User2.Create.password + '&client_id=' + 
                        testConfig.Client.clientId + '&client_secret=' + 
                        testConfig.Client.clientSecret)
                    .end(function(err, res) {
                        if (err)
                            throw err;
    
                        res.body.should.have.property('access_token');
                        res.body.token_type.should.equal('Bearer');
                        accessToken2 = res.body.access_token;
                        logger.info('Retrieved accessToken for requests: ' + accessToken);
                        cb();
                    });
                }
            ], function(err, results) {
                logger.info('Initialization completed.');
                done();
            });
        });
    });

    describe('Account', function() {
        it('should fail to retrieve account without an access token', function(done) {
            request(url)
                .get('/api/account')
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', Error.unauthorizedError);
                    done();
                });
        });
        
        it('should successfully retrieve the current logged in user\'s account', function(done) {
            request(url)
                .get('/api/account')
                .set('Authorization', 'Bearer ' + accessToken)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;

                    res.body.should.have.property('_id');
                    res.body.should.have.property('username');
                    res.body.should.have.property('firstName');
                    res.body.should.have.property('lastName');
                    done();
                });
        });
        
        it('should successfully update the user account information', function(done) {
            request(url)
                .put('/api/account')
                .set('Authorization', 'Bearer ' + accessToken)
                .send(testConfig.User.Update)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;

                    res.body.should.have.property('username', testConfig.User.Update.username);
                    res.body.should.have.property('firstName', testConfig.User.Update.firstName);
                    res.body.should.have.property('lastName', testConfig.User.Update.lastName);
                    res.body.should.have.property('username', testConfig.User.Update.username);
                    done();
                });
        });
        
        it('should fail to update the user\'s username due to format', function(done) {
            request(url)
                .put('/api/account')
                .set('Authorization', 'Bearer ' + accessToken)
                .send(testConfig.User.Fail)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;

                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', Error.invalidDataError);
                    done();
                });
        });
        
        it('should fail to update the user\'s username due to it being in use', function(done) {
            request(url)
                .put('/api/account')
                .set('Authorization', 'Bearer ' + accessToken)
                .send(testConfig.User2.Fail)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;

                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', Error.invalidDataError);
                    done();
                });
        });
        
        it('should post an image to the current user\s account', function(done) {
            request(url)
                .post('/api/account/image')
                .set('Authorization', 'Bearer ' + accessToken)
                .field('api_key', 'abcd')
                .attach('accountImage', path.join(__dirname, "../private/images", "Axiom_Crave_Halloween_Back.jpg"))
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                    
                    res.body.should.have.property('image');
                    res.body.image.should.be.String;
                    done();
                });
        });
        
        it('should delete the current user\s image', function(done) {
            request(url)
                .delete('/api/account/image')
                .set('Authorization', 'Bearer ' + accessToken)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                    
                    res.body.should.not.have.property('image');
                    done();
                });
        });

        it('should return the current user\'s preferences', function(done) {
            request(url)
                .get('/api/account/preferences')
                .set('Authorization', 'Bearer ' + accessToken)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                    
                    res.body.should.containEql(testConfig.Preferences.Default);
                    done();
                });
        });
        
        it('should successfully update the current user\'s preferences', function(done) {
            request(url)
                .put('/api/account/preferences')
                .set('Authorization', 'Bearer ' + accessToken)
                .send(testConfig.Preferences.Update)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;

                    res.body.should.containEql(testConfig.Preferences.Update);
                    done();
                });
        });
        
        it('should not update the current user\'s preferences with faulty data', function(done) {
            request(url)
                .put('/api/account/preferences')
                .set('Authorization', 'Bearer ' + accessToken)
                .send(testConfig.Preferences.Fail)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;

                    res.body.should.containEql(testConfig.Preferences.Update);
                    done();
                });
        });
        
        it('should fail to change the current user\s password because the current password was entered wrong', function(done) {
            request(url)
                .put('/api/account/reset')
                .set('Authorization', 'Bearer ' + accessToken)
                .send(testConfig.User.UpdatePwFailByWrongCurrent)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;

                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', Error.invalidDataError);
                    done();
                });
        });
        
        it('should fail to change the current user\s password because the new password is in the wrong format', function(done) {
            request(url)
                .put('/api/account/reset')
                .set('Authorization', 'Bearer ' + accessToken)
                .send(testConfig.User.UpdatePwFailByInvalid)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;

                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', Error.invalidDataError);
                    done();
                });
        });
        
        it('should successfully change the current user\s password', function(done) {
            request(url)
                .put('/api/account/reset')
                .set('Authorization', 'Bearer ' + accessToken)
                .send(testConfig.User.UpdatePwSuccess)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;

                    res.body.should.not.have.property('error');
                    done();
                });
        });
    });
    
    describe('Disc', function() {
        var discId;
        var curDisc;
        
        it('should retrieve all discs for the current user', function(done) {
            request(url)
                .get('/api/discs')
                .set('Authorization', 'Bearer ' + accessToken)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.should.have.length(0);
                    done();
                });
        });
        
        it('should successfully post a disc for the current user', function(done) {
            request(url)
                .post('/api/discs')
                .set('Authorization', 'Bearer ' + accessToken)
                .send(testConfig.Disc.Create)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.should.containEql(testConfig.Disc.Create);
                    discId = res.body._id;
                    done();
                });
        });
        
        it('should successfully retrieve a private disc for the owner', function(done) {
            request(url)
                .get('/api/discs/' + discId)
                .set('Authorization', 'Bearer ' + accessToken)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.should.containEql(testConfig.Disc.Create);
                    done();
                });
        });
        
        it('should fail to retrieve a private disc from a user who is not the owner', function(done) {
            request(url)
                .get('/api/discs/' + discId)
                .set('Authorization', 'Bearer ' + accessToken2)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', Error.unauthorizedError);
                    done();
                });
        });
        
        it('should successfully update a disc', function(done) {
            request(url)
                .put('/api/discs/' + discId)
                .set('Authorization', 'Bearer ' + accessToken)
                .send(testConfig.Disc.Update)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.should.containEql(testConfig.Disc.Update);
                    done();
                });
        });
        
        it('should successfully retrieve a public disc from a user who is not the owner', function(done) {
            request(url)
                .get('/api/discs/' + discId)
                .set('Authorization', 'Bearer ' + accessToken2)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.should.containEql(testConfig.Disc.Update);
                    done();
                });
        });
        
        it('should fail to update a disc due to invalid data', function(done) {
            request(url)
                .put('/api/discs/' + discId)
                .set('Authorization', 'Bearer ' + accessToken)
                .send(testConfig.Disc.Fail)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.should.containEql(testConfig.Disc.Update);
                    done();
                });
        });
        
        it('should fail to update a disc due to invalid access', function(done) {
            request(url)
                .put('/api/discs/' + discId)
                .set('Authorization', 'Bearer ' + accessToken2)
                .send(testConfig.Disc.Fail)
                .accept('application.Update')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', Error.unauthorizedError);
                    done();
                });
        });
        
        it('should fail to post an image for a disc by a user who is not the owner', function(done) {
            request(url)
                    .post('/api/discs/' + discId + '/images')
                    .set('Authorization', 'Bearer ' + accessToken2)
                    .attach('discImage', path.join(__dirname, "../private/images", "Axiom_Crave_Halloween_Back.jpg"))
                    .accept('application/json')
                    .end(function(err, res) {
                        if (err)
                            throw err;
                            
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', Error.unauthorizedError);
                        done();
                    });
        });
        
        it('should successfully post two images for a disc', function(done) {
            async.series([
                function(cb) {
                    request(url)
                    .post('/api/discs/' + discId + '/images')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('discImage', path.join(__dirname, "../private/images", "Axiom_Crave_Halloween_Back.jpg"))
                    .accept('application/json')
                    .end(function(err, res) {
                        if (err)
                            throw err;
                            
                        res.body.should.have.property('imageList');
                        res.body.should.have.property('primaryImage');
                        res.body.imageList.should.have.length(1);
                        res.body.primaryImage.should.be.String;
                        res.body.primaryImage.should.eql(res.body.imageList[0]._id);
                        cb();
                    });
                },
                function(cb) {
                    request(url)
                    .post('/api/discs/' + discId + '/images')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .attach('discImage', path.join(__dirname, "../private/images", "Axiom_Crave_Halloween_Front.jpg"))
                    .accept('application/json')
                    .end(function(err, res) {
                        if (err)
                            throw err;
                            
                        res.body.should.have.property('imageList');
                        res.body.should.have.property('primaryImage');
                        res.body.imageList.should.have.length(2);
                        curDisc = res.body;
                        cb();
                    });
                }
            ], function(err, results) {
                done();
            })
            
        });
        
        it('should reorder a disc image list and set the opposite image to primary', function(done) {
            var image = curDisc.imageList.shift();
            curDisc.imageList.push(image);
            curDisc.primaryImage = curDisc.imageList[0]._id;
            
            request(url)
                .put('/api/discs/' + discId)
                .set('Authorization', 'Bearer ' + accessToken)
                .send(curDisc)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.imageList.should.eql(curDisc.imageList);
                    res.body.primaryImage.should.eql(curDisc.primaryImage);
                    curDisc = res.body;
                    done();
                });
        });
        
        it('should delete an image from the disc', function(done) {
            request(url)
                .delete('/api/discs/' + discId + '/images/' + curDisc.primaryImage)
                .set('Authorization', 'Bearer ' + accessToken)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.imageList.should.have.length(1);
                    res.body.primaryImage.should.eql(res.body.imageList[0]._id);
                    done();
                });
        });
        
        it('should fail to delete an image from the disc due to access', function(done) {
            request(url)
                .delete('/api/discs/' + discId + '/images/' + curDisc.primaryImage)
                .set('Authorization', 'Bearer ' + accessToken2)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', Error.unauthorizedError);
                    done();
                });
        });
        
        it('should fail to delete a disc by a user who is not the owner', function(done) {
            request(url)
                .delete('/api/discs/' + discId)
                .set('Authorization', 'Bearer ' + accessToken2)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', Error.unauthorizedError);
                    done();
                });
        });
        
        it('should delete the disc associated with the discId', function(done) {
            request(url)
                .delete('/api/discs/' + discId)
                .set('Authorization', 'Bearer ' + accessToken)
                .accept('application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;
                        
                    res.body.should.have.property('_id');
                    done();
                });
        });
    });
    
    /*
    * Clean up all items still existing in the database
    */
    after(function(done) {
        logger.info('Cleaning up tests.');
        async.series([
            function(cb) {
                UserModel.remove({'local.email': testConfig.User.Create.email}, function(err, user) {
                    if (err)
                        throw err;
                    
                    logger.info('Removed test user.');
                    cb();
                });
            },
            function(cb) {
                UserModel.remove({'local.email': testConfig.User2.Create.email}, function(err, user) {
                    if (err)
                        throw err;
                    
                    logger.info('Removed test user.');
                    cb();
                });
            },
            function(cb) {
                ClientModel.remove({'name': testConfig.Client.name}, function(err, client) {
                    if (err)
                        throw err;
                    
                    logger.info('Removed test client.');
                    cb();
                });
            }
        ], function(err, results) {
            logger.info('Testing completed.');
            done();
        })
        
    });
});