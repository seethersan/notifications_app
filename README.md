
# Notifications App

This project is a notifications application built using Node.js, React, and AWS Lambda. It allows the announcement of new product features to customers in a simple and efficient manner. The application focuses on usability and leverages AWS SAM for deploying the backend and the Serverless Framework for deploying the frontend.

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [License](#license)

## Architecture

The architecture of this project is based on a serverless and event-driven model, leveraging AWS Lambda for handling backend logic and React for the frontend.

1. **Frontend (React)**: A simple, user-friendly UI for interacting with the application, which consumes the notifications API provided by the AWS Lambda function.
2. **Backend (AWS Lambda)**: Serverless function responsible for processing requests, storing notifications in the database, and triggering notifications to the frontend.
3. **Database**: DynamoDB is used to store notifications data.
4. **API Gateway**: Manages API requests from the React frontend to the Lambda functions.
5. **Deployment**: The project uses AWS SAM for backend deployment and the Serverless Framework for frontend deployment.

## Tech Stack

- **Frontend**: React
- **Backend**: Node.js (running on AWS Lambda)
- **Database**: DynamoDB
- **Infrastructure**: AWS (API Gateway, Lambda, DynamoDB)
- **Backend Deployment**: AWS SAM (Serverless Application Model)
- **Frontend Deployment**: Serverless Framework

## Features

- **Create notifications**: Backend service to announce new product features to users.
- **Event-driven architecture**: Trigger notifications using AWS Lambda functions.
- **Simple UI**: React-based interface to display and manage notifications.
- **Serverless**: The backend logic is deployed as AWS Lambda functions, reducing infrastructure management.

## Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js**: v14.x or higher
- **npm**: v6.x or higher
- **AWS SAM CLI**: v1.x or higher
- **Docker**: Required for running AWS Lambda locally
- **AWS CLI**: Configured with appropriate credentials
- **Serverless Framework**: v3.x or higher

## Running Locally

### 1. Clone the Repository

```bash
git clone https://github.com/seethersan/notifications_app.git
cd notifications_app
```

### 2. Install Dependencies

For the frontend:

```bash
cd frontend
npm install
```

For the backend:

```bash
cd backend
npm install
```

### 3. Start the Development Server

#### Backend (using AWS SAM):

To start the backend locally, you'll use AWS SAM. First, ensure Docker is running, then run:

```bash
cd backend
sam build
sam local start-api
```

This will run the backend locally, simulating AWS Lambda and API Gateway.

#### Frontend:

Open a new terminal window, navigate to the frontend folder, and run:

```bash
cd frontend
npm start
```

### 4. Access the Application

Once both frontend and backend are running, open your browser and navigate to:

```
http://localhost:3000
```

## Deployment

### 1. Configure AWS Credentials

Make sure you have AWS credentials properly set up on your local machine. You can configure them using:

```bash
aws configure
```

### 2. Deploy the Backend with AWS SAM

To deploy the backend using AWS SAM, navigate to the backend directory and run the following commands:

```bash
cd backend
sam build
sam deploy --guided
```

The `--guided` flag will help you with the initial configuration of the deployment (stack name, AWS region, etc.). After the first deployment, you can use `sam deploy` to deploy changes.

### 3. Deploy the Frontend with the Serverless Framework

To deploy the frontend using the Serverless Framework, first navigate to the `frontend` directory and deploy the app as a static site:

```bash
cd frontend
npx serverless
```

This will deploy the frontend to an S3 bucket and configure CloudFront for static site hosting.

You will receive the CloudFront URL at the end of the deployment. You can access your frontend at that URL.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
