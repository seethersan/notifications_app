'use strict';

import { lambdaHandler } from '../../announcements.mjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';  // Import jwksClient for mocking JWKS

var event, context;

describe('Tests lambdaHandler', function () {
    let dynamoDbStub;
    let snsStub;
    let jwksStub;
    let jwtVerifyStub;

    beforeEach(() => {
        // Stub the DynamoDBClient's send method
        dynamoDbStub = sinon.stub(DynamoDBClient.prototype, 'send');
        
        // Stub the SNSClient's send method
        snsStub = sinon.stub(SNSClient.prototype, 'send');
        
        // Stub the JWKS client method `getSigningKey`
        jwksStub = sinon.stub(jwksClient({
          jwksUri: `https://cognito-idp.${process.env.AWS_COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`
        }), 'getSigningKey');
        
        // Stub jwt.verify for testing token validation
        jwtVerifyStub = sinon.stub(jwt, 'verify');

        // Mock event and context
        event = {
            headers: {
                Authorization: `Bearer valid-token`,  // Default valid token for testing
            },
            httpMethod: 'GET',
        };

        context = {};
    });

    afterEach(() => {
        // Restore Sinon stub after each test
        sinon.restore();
    });

    it('verifies successful response for GET with valid JWT token', async () => {
        // Mock the JWKS response for valid token
        jwksStub.callsFake((kid, callback) => {
            callback(null, { getPublicKey: () => 'public-key' });
        });

        // Mock the JWT verification
        jwtVerifyStub.callsFake((token, key, options, callback) => {
            callback(null, { sub: '12345', username: 'testuser' });
        });

        // Mock the DynamoDBClient response for GET request
        dynamoDbStub.resolves({ Items: [{ id: 1, title: 'Test Announcement', description: 'This is a test' }] });

        const result = await lambdaHandler(event, context);

        expect(result).to.be.an('object');
        expect(result.statusCode).to.equal(200);
        expect(result.body).to.be.a('string');

        let response = JSON.parse(result.body);
        expect(response).to.be.an('object');
        expect(response.message).to.be.equal('Fetched announcements successfully');
        expect(response.announcements).to.be.an('array');
    });

    it('verifies unauthorized response for missing JWT token', async () => {
        // Remove the Authorization header to simulate missing token
        event.headers = {};

        const result = await lambdaHandler(event, context);

        expect(result).to.be.an('object');
        expect(result.statusCode).to.equal(401);
        expect(result.body).to.be.a('string');

        let response = JSON.parse(result.body);
        expect(response).to.be.an('object');
        expect(response.message).to.be.equal('Unauthorized - Missing Authorization header');
    });

    it('verifies unauthorized response for invalid JWT token', async () => {
        // Set an invalid JWT token
        event.headers.Authorization = 'Bearer invalid-token';

        // Mock the JWKS response
        jwksStub.callsFake((kid, callback) => {
            callback(null, { getPublicKey: () => 'public-key' });
        });

        // Simulate JWT verification failure
        jwtVerifyStub.callsFake((token, key, options, callback) => {
            callback(new Error('Invalid token'), null);
        });

        const result = await lambdaHandler(event, context);

        expect(result).to.be.an('object');
        expect(result.statusCode).to.equal(401);
        expect(result.body).to.be.a('string');

        let response = JSON.parse(result.body);
        expect(response).to.be.an('object');
        expect(response.message).to.be.equal('Unauthorized - Invalid Token');
    });

    it('verifies successful response for POST with valid JWT token', async () => {
        // Mock the JWKS response for valid token
        jwksStub.callsFake((kid, callback) => {
            callback(null, { getPublicKey: () => 'public-key' });
        });

        // Mock the JWT verification
        jwtVerifyStub.callsFake((token, key, options, callback) => {
            callback(null, { sub: '12345', username: 'testuser' });
        });

        // Mock the DynamoDBClient response for POST request
        dynamoDbStub.resolves({});  // Simulate successful DynamoDB insertion
        
        // Mock the SNSClient response for POST request
        snsStub.resolves({});  // Simulate successful SNS publish

        // Modify the event for a POST request
        event.httpMethod = 'POST';
        event.body = JSON.stringify({
            id: 1,
            title: 'New Feature',
            description: 'A new feature has been released',
            releaseDate: '2024-10-22',
        });

        const result = await lambdaHandler(event, context);

        expect(result).to.be.an('object');
        expect(result.statusCode).to.equal(201);  // Check for successful POST response
        expect(result.body).to.be.a('string');

        let response = JSON.parse(result.body);
        expect(response).to.be.an('object');
        expect(response.message).to.be.equal('Announcement created and notification sent!');
        expect(response.announcement).to.be.an('object');
        expect(response.announcement.title).to.equal('New Feature');

        // Verify that DynamoDB and SNS send were called
        sinon.assert.calledOnce(dynamoDbStub);
        sinon.assert.calledOnce(snsStub);
    });
});
