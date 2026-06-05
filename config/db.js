const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { SNSClient } = require('@aws-sdk/client-sns');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const region = process.env.AWS_REGION || 'us-east-1';

// Initialize the low-level DynamoDB Client
const ddbClient = new DynamoDBClient({
  region: region
});

// Initialize the Document Client wrapper to handle conversion to/from DynamoDB AttributeValues
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true
  }
});

// Initialize the AWS SNS Client
const snsClient = new SNSClient({
  region: region
});

/**
 * DynamoDB/AWS Client Initialization Check.
 * Simulates the MongoDB connectDB interface to avoid breaking server startup.
 */
const connectDB = async () => {
  try {
    console.log(`✅ AWS Clients Initialized`);
    console.log(`🌐 AWS Region: ${region}`);
    console.log(`📦 Table URLs: ${process.env.DYNAMODB_TABLE_URLS || 'urlms-urls'}`);
    console.log(`📦 Table Results: ${process.env.DYNAMODB_TABLE_RESULTS || 'urlms-results'}`);
    console.log(`✉️ SNS Topic: ${process.env.SNS_TOPIC_ARN ? 'Configured' : 'NOT Configured (SNS_TOPIC_ARN is empty)'}`);
  } catch (error) {
    console.error(`❌ AWS Initialization Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.ddbClient = ddbClient;
module.exports.ddbDocClient = ddbDocClient;
module.exports.snsClient = snsClient;
