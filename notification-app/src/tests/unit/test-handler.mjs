'use strict';

import { lambdaHandler } from '../src/announcements.mjs';
import { expect } from 'chai';

// Sample event and context for testing
var event, context;

describe('Tests lambdaHandler', function () {
    
    // Mock event for GET request
    beforeEach(() => {
        event = {
            httpMethod: 'GET'
        };
        context = {};
    });

    it('verifies successful response for GET', async () => {
        const result = await lambdaHandler(event, context);

        // Check if the result is an object
        expect(result).to.be.an('object');
        
        // Check if the statusCode is 200
        expect(result.statusCode).to.equal(200);
        
        // Check if body is a string
        expect(result.body).to.be.a('string');
        
        // Parse the body to check the contents
        let response = JSON.parse(result.body);
        
        // Check if the response object has expected properties
        expect(response).to.be.an('object');
        expect(response.message).to.be.equal('Fetched announcements successfully');
        expect(response.announcements).to.be.an('array');
    });

    // Mock event for POST request
    it('verifies successful response for POST', async () => {
        event = {
            httpMethod: 'POST',
            body: JSON.stringify({
                id: 1,
                title: 'Test Feature',
                description: 'This is a test feature',
                releaseDate: '2024-10-22'
            })
        };

        const result = await lambdaHandler(event, context);

        // Check if the result is an object
        expect(result).to.be.an('object');
        
        // Check if the statusCode is 201
        expect(result.statusCode).to.equal(201);
        
        // Check if body is a string
        expect(result.body).to.be.a('string');
        
        // Parse the body to check the contents
        let response = JSON.parse(result.body);
        
        // Check if the response object has expected properties
        expect(response).to.be.an('object');
        expect(response.message).to.be.equal('Announcement created and notification sent!');
        expect(response.announcement).to.be.an('object');
        expect(response.announcement.title).to.equal('Test Feature');
    });

    // Handle unsupported HTTP methods
    it('verifies method not allowed response', async () => {
        event = {
            httpMethod: 'DELETE'
        };

        const result = await lambdaHandler(event, context);

        expect(result).to.be.an('object');
        expect(result.statusCode).to.equal(405);

        let response = JSON.parse(result.body);
        expect(response).to.be.an('object');
        expect(response.message).to.equal('Method Not Allowed');
    });
});
