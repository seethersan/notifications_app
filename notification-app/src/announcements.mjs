import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();
const { TABLE_NAME, SNS_TOPIC_ARN } = process.env;

/**
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html 
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 */
export const lambdaHandler = async (event, context) => {
    const httpMethod = event.httpMethod;

    if (httpMethod === "POST") {
        try {
            // Parse the request body
            const requestBody = JSON.parse(event.body);
            const { id, title, description, releaseDate } = requestBody;

            // Store the announcement in DynamoDB
            const params = {
                TableName: TABLE_NAME,
                Item: { id, title, description, releaseDate }
            };
            await dynamoDb.put(params).promise();

            // Send a notification via SNS
            const snsParams = {
                Message: `New feature released: ${title} - ${description}`,
                TopicArn: SNS_TOPIC_ARN
            };
            await sns.publish(snsParams).promise();

            // Response
            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: "Announcement created and notification sent!",
                    announcement: { id, title, description, releaseDate }
                })
            };
        } catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Could not create announcement" })
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
                    announcements: data.Items
                })
            };
        } catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Could not fetch announcements" })
            };
        }
    }

    // Default response for unsupported HTTP methods
    return {
        statusCode: 405,
        body: JSON.stringify({
            message: "Method Not Allowed"
        })
    };
};
