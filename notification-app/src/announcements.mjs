import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { v4 as uuidv4 } from 'uuid';  // Import UUID library
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Initialize AWS clients
const dynamoDbClient = new DynamoDBClient({});
const snsClient = new SNSClient({});

// Initialize JWKS client to fetch public keys from the Cognito User Pool
const jwks = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.AWS_COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`
});

/**
 * Function to retrieve signing key from Cognito User Pool JWKS
 */
function getKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Main Lambda handler
 */
export const lambdaHandler = async (event, context) => {
    const httpMethod = event.httpMethod;
    const authorizationHeader = event.headers?.Authorization || event.headers?.authorization;
    const httpHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Access-Control-Allow-Origin",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      }

    // Step 1: Check for Authorization header
    if (!authorizationHeader) {
        return {
            statusCode: 401,
            headers: httpHeaders,
            body: JSON.stringify({
                message: "Unauthorized - Missing Authorization header",
            }),
        };
    }

    // Step 2: Validate the JWT token using Cognito JWKS
    let decodedToken;
    try {
        const token = authorizationHeader.split(' ')[1];
        decodedToken = await new Promise((resolve, reject) => {
            jwt.verify(token, getKey, {}, (err, decoded) => {
                if (err) {
                    return reject(err);
                }
                resolve(decoded);
            });
        });
    } catch (error) {
        console.error("JWT Token Error:", error.message);
        return {
            statusCode: 401,
            headers: httpHeaders,
            body: JSON.stringify({
                message: "Unauthorized - Invalid Token",
            }),
        };
    }

    // Step 3: Handle the POST method (Create announcements)
    if (httpMethod === "POST") {
        try {
            const requestBody = JSON.parse(event.body);
            if (!Array.isArray(requestBody.features)) {
                return {
                    statusCode: 400,
                    headers: httpHeaders,
                    body: JSON.stringify({
                        message: "Invalid request format - Expected 'features' array"
                    }),
                };
            }

            const features = requestBody.features;
            const createdFeatures = [];

            for (const feature of features) {
                const { title, description, releaseDate } = feature;
                const id = uuidv4();  // Generate a unique ID

                console.log("Inserting into DynamoDB:", { id, title, description, releaseDate });

                const params = {
                    TableName: process.env.TABLE_NAME,
                    Item: { id, title, description, releaseDate },
                };
                await dynamoDbClient.send(new PutCommand(params));

                console.log("Publishing to SNS:", title);

                const snsParams = {
                    Message: `New feature released: ${title} - ${description}`,
                    TopicArn: process.env.SNS_TOPIC_ARN,
                };
                await snsClient.send(new PublishCommand(snsParams));

                createdFeatures.push({ id, title, description, releaseDate });
            }

            return {
                statusCode: 201,
                headers: httpHeaders,
                body: JSON.stringify({
                    message: "Announcements created and notifications sent!",
                    announcements: createdFeatures,
                }),
            };
        } catch (error) {
            console.error("POST Request Error:", error);
            return {
                statusCode: 500,
                headers: httpHeaders,
                body: JSON.stringify({ error: "Could not create announcements" }),
            };
        }
    }

    // Step 4: Handle the GET method (Retrieve announcements)
    else if (httpMethod === "GET") {
        try {
            const params = { TableName: process.env.TABLE_NAME };
            const data = await dynamoDbClient.send(new ScanCommand(params));

            return {
                statusCode: 200,
                headers: httpHeaders,
                body: JSON.stringify({
                    message: "Fetched announcements successfully",
                    announcements: data.Items,
                }),
            };
        } catch (error) {
            console.error("GET Request Error:", error);
            return {
                statusCode: 500,
                headers: httpHeaders,
                body: JSON.stringify({ error: "Could not fetch announcements" }),
            };
        }
    }

    // Step 5: Return 405 for unsupported methods
    return {
        statusCode: 405,
        headers: httpHeaders,
        body: JSON.stringify({
            message: "Method Not Allowed",
        }),
    };
};
