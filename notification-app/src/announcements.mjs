import AWS from 'aws-sdk';
import jwt from 'jsonwebtoken';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();
const secretsManager = new AWS.SecretsManager();

// Function to retrieve the JWT secret from Secrets Manager
async function getSecretValue(secretName) {
    const params = { SecretId: secretName };
    try {
        const data = await secretsManager.getSecretValue(params).promise();
        if ('SecretString' in data) {
            return data.SecretString;
        }
        throw new Error('Secret not found');
    } catch (error) {
        console.error('Error retrieving secret', error);
        throw error;
    }
}

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/dg/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html 
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/dg/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 */
export const lambdaHandler = async (event, context) => {
    const httpMethod = event.httpMethod;
    const authorizationHeader = event.headers.Authorization;

    // Retrieve the secret from Secrets Manager
    const secretName = process.env.SECRET_NAME;
    let JWT_SECRET_KEY;
    try {
        JWT_SECRET_KEY = await getSecretValue(secretName);
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Error retrieving secret",
            }),
        };
    }

    // Step 1: Check for Authorization header
    if (!authorizationHeader) {
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: "Unauthorized - Missing Authorization header",
            }),
        };
    }

    // Step 2: Validate the JWT token
    let decodedToken;
    try {
        const token = authorizationHeader.split(' ')[1]; // Assumes 'Bearer <token>'
        decodedToken = jwt.verify(token, JWT_SECRET_KEY);
    } catch (error) {
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
            // Parse the request body
            const requestBody = JSON.parse(event.body);
            const { id, title, description, releaseDate } = requestBody;

            // Store the announcement in DynamoDB
            const params = {
                TableName: TABLE_NAME,
                Item: { id, title, description, releaseDate },
            };
            await dynamoDb.put(params).promise();

            // Send a notification via SNS
            const snsParams = {
                Message: `New feature released: ${title} - ${description}`,
                TopicArn: SNS_TOPIC_ARN,
            };
            await sns.publish(snsParams).promise();

            // Response
            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: "Announcement created and notification sent!",
                    announcement: { id, title, description, releaseDate },
                }),
            };
        } catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Could not create announcement" }),
            };
        }
    } else if (httpMethod === "GET") {
        try {
            // Retrieve announcements from DynamoDB
            const params = { TableName: TABLE_NAME };
            const data = await dynamoDb.scan(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Fetched announcements successfully",
                    announcements: data.Items,
                }),
            };
        } catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Could not fetch announcements" }),
            };
        }
    }

    // Default response for unsupported HTTP methods
    return {
        statusCode: 405,
        body: JSON.stringify({
            message: "Method Not Allowed",
        }),
    };
};
