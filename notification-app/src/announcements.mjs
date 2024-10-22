import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa'; // We will use jwks-rsa to retrieve public keys

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
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Main Lambda handler
 */
export const lambdaHandler = async (event, context) => {
    const httpMethod = event.httpMethod;
    const authorizationHeader = event.headers.Authorization;

    // Step 1: Check for Authorization header
    if (!authorizationHeader) {
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: "Unauthorized - Missing Authorization header",
            }),
        };
    }

    // Step 2: Validate the JWT token using Cognito JWKS
    let decodedToken;
    try {
        const token = authorizationHeader.split(' ')[1]; // Extract token from header
        decodedToken = await new Promise((resolve, reject) => {
            jwt.verify(token, getKey, {}, (err, decoded) => {
                if (err) {
                    return reject(err);
                }
                resolve(decoded);
            });
        });
    } catch (error) {
        console.error("JWT Token Error:", error);
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: "Unauthorized - Invalid Token",
            }),
        };
    }

    // Now that the token is valid, proceed with the Lambda logic
    if (httpMethod === "POST") {
        try {
            const requestBody = JSON.parse(event.body);
            const { id, title, description, releaseDate } = requestBody;

            console.log("Inserting into DynamoDB:", requestBody);

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

            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: "Announcement created and notification sent!",
                    announcement: { id, title, description, releaseDate },
                }),
            };
        } catch (error) {
            console.error("POST Request Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Could not create announcement" }),
            };
        }
    } else if (httpMethod === "GET") {
        try {
            const params = { TableName: process.env.TABLE_NAME };
            const data = await dynamoDbClient.send(new ScanCommand(params));

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Fetched announcements successfully",
                    announcements: data.Items,
                }),
            };
        } catch (error) {
            console.error("GET Request Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Could not fetch announcements" }),
            };
        }
    }

    return {
        statusCode: 405,
        body: JSON.stringify({
            message: "Method Not Allowed",
        }),
    };
};
