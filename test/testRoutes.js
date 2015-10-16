var should = require('should'); 
var assert = require('assert');
var request = require('supertest');  
var mongoose = require('mongoose');
var winston = require('winston');
var config = require('../config/config.js');
var ClientModel = require('../app/models/client');
var conn;
var accessToken;
var refreshToken;

describe('Routing', function() {
  var url = 'https://disczumpserver-mgagliardo.c9.io';
  
  before(function(done) {
        request(url)
        .post('/oauth/token')
        .send('grant_type=password&username=mgagliardo91%40gmail.com&client_id=disczump.test&client_secret=password!&password=123123')
        .end(function(err, res) {
            if (err)
            throw err;
            
            accessToken = res.body.access_token;
            refreshToken = res.body.refresh_token;
            done();
        });
    });
  
  describe('Client', function() {
        it('should retrieve an access token', function(done) {
            request(url)
            .post('/oauth/token')
            .send('grant_type=password&username=mgagliardo91%40gmail.com&client_id=disczump.test&client_secret=password!&password=123123')
            .end(function(err, res) {
                if (err)
                throw err;
                
                res.body.should.have.property('access_token');
                res.body.token_type.should.equal('Bearer');
                accessToken = res.body.access_token;
                refreshToken = res.body.refresh_token;
                done();
            });
        });
     
        it('should retrieve an access token using a refresh token', function(done) {
            request(url)
            .post('/oauth/token')
            .send('grant_type=refresh_token&client_id=disczump.test&client_secret=password!&refresh_token=' + refreshToken)
            .end(function(err, res) {
                if (err)
                    throw err;
                
                res.body.should.have.property('access_token');
                res.body.token_type.should.equal('Bearer');
                accessToken = res.body.access_token;
                refreshToken = res.body.refresh_token;
                done();
            });
        });
  });
  
    describe('Account', function() {
        it('should retrieve the current logged in user\'s account', function(done) {
           request(url)
           .get('/api/account')
           .set('Authorization', 'Bearer ' + accessToken)
           .accept('application/json')
           .end(function(err, res) {
                if (err)
                    throw err;
                
                res.body.should.have.property('_id');
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
                
                res.body.should.have.property('colorize');
                res.body.should.have.property('colorizeVisibility');
                res.body.should.have.property('displayCount');
                res.body.should.have.property('defaultSort');
                res.body.should.have.property('defaultView');
                res.body.should.have.property('galleryCount');
                res.body.should.have.property('notifications');
                done();
           });
        });
    });
});