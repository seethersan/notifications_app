'use strict';

import { lambdaHandler } from '../../announcements.mjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import jwt from 'jsonwebtoken';

var event, context;

describe('Tests lambdaHandler', function () {
    let secretsManagerStub;
    let dynamoDbStub;
    let snsStub;

    beforeEach(() => {
        // Stub the SecretsManagerClient's send method
        secretsManagerStub = sinon.stub(SecretsManagerClient.prototype, 'send');
        
        // Stub the DynamoDBClient's send method
        dynamoDbStub = sinon.stub(DynamoDBClient.prototype, 'send');
        
        // Stub the SNSClient's send method
        snsStub = sinon.stub(SNSClient.prototype, 'send');

        // Mock event and context
        event = {
            headers: {
                Authorization: `Bearer ${jwt.sign({ userId: '12345' }, 'your-very-secure-secret')}`,
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
        // Mock the SecretsManager response for JWT secret
        secretsManagerStub.resolves({ SecretString: 'your-very-secure-secret' });
        
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

        // Mock the SecretsManager response for JWT secret
        secretsManagerStub.resolves({ SecretString: 'your-very-secure-secret' });

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

        // Mock the SecretsManager response for JWT secret
        secretsManagerStub.resolves({ SecretString: 'your-very-secure-secret' });

        const result = await lambdaHandler(event, context);

        expect(result).to.be.an('object');
        expect(result.statusCode).to.equal(401);
        expect(result.body).to.be.a('string');

        let response = JSON.parse(result.body);
        expect(response).to.be.an('object');
        expect(response.message).to.be.equal('Unauthorized - Invalid Token');
    });

    it('verifies successful response for POST with valid JWT token', async () => {
        // Mock the SecretsManager response for JWT secret
        secretsManagerStub.resolves({ SecretString: 'your-very-secure-secret' });

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