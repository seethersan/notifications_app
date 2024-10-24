'use strict';

import { lambdaHandler } from '../../announcements.mjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa'; // Import jwksClient for mocking JWKS
import { v4 as uuidv4 } from 'uuid';

let event, context;

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
        Authorization: `Bearer valid-token`, // Default valid token for testing
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

  it('verifies successful response for POST with valid JWT token (multiple features)', async () => {
    // Mock the JWKS response for valid token
    jwksStub.callsFake((kid, callback) => {
      callback(null, { getPublicKey: () => 'public-key' });
    });

    // Mock the JWT verification
    jwtVerifyStub.callsFake((token, key, options, callback) => {
      callback(null, { sub: '12345', username: 'testuser' });
    });

    // Mock the DynamoDBClient response for POST request
    dynamoDbStub.resolves({}); // Simulate successful DynamoDB insertion

    // Mock the SNSClient response for POST request
    snsStub.resolves({}); // Simulate successful SNS publish

    // Modify the event for a POST request with multiple features
    event.httpMethod = 'POST';
    event.body = JSON.stringify({
      features: [
        { title: 'Feature 1', description: 'First feature', releaseDate: '2024-10-22' },
        { title: 'Feature 2', description: 'Second feature', releaseDate: '2024-10-23' }
      ]
    });

    const result = await lambdaHandler(event, context);

    expect(result).to.be.an('object');
    expect(result.statusCode).to.equal(201); // Check for successful POST response
    expect(result.body).to.be.a('string');

    let response = JSON.parse(result.body);
    expect(response).to.be.an('object');
    expect(response.message).to.be.equal('Announcements created and notifications sent!');
    expect(response.announcements).to.be.an('array').with.length(2);
    expect(response.announcements[0].title).to.equal('Feature 1');
    expect(response.announcements[1].title).to.equal('Feature 2');

    // Verify that DynamoDB and SNS send were called for both features
    sinon.assert.callCount(dynamoDbStub, 2);
    sinon.assert.callCount(snsStub, 2);
  });
});
