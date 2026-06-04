const { ddbDocClient } = require('../config/db');
const { PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.DYNAMODB_TABLE_RESULTS || 'urlms-results';

class CheckHistoryDocument {
  constructor(data) {
    this.websiteId = data.urlId || data.websiteId; // Map DynamoDB urlId to websiteId
    this.urlId = this.websiteId;
    this.url = data.url;
    this.status = data.status;
    this.statusCode = data.statusCode !== undefined ? data.statusCode : null;
    this.responseTime = data.responseTime !== undefined ? data.responseTime : null;
    // Map DynamoDB timestamp to checkedAt for frontend compatibility
    this.checkedAt = data.timestamp ? new Date(data.timestamp) : (data.checkedAt ? new Date(data.checkedAt) : new Date());
  }
}

const CheckHistory = {
  // CheckHistory.create()
  create: async (data) => {
    const timestamp = data.checkedAt ? new Date(data.checkedAt).toISOString() : new Date().toISOString();
    
    const item = {
      urlId: data.websiteId ? data.websiteId.toString() : '',
      timestamp: timestamp,
      url: data.url,
      status: data.status,
      statusCode: data.statusCode !== undefined ? data.statusCode : null,
      responseTime: data.responseTime !== undefined ? data.responseTime : null
    };

    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    return new CheckHistoryDocument(item);
  },

  // CheckHistory.find() with support for sort() and limit() chaining
  find: (filter) => {
    const websiteId = filter && filter.websiteId;

    const queryPromise = (async () => {
      if (!websiteId) return [];

      const result = await ddbDocClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'urlId = :urlId',
        ExpressionAttributeValues: {
          ':urlId': websiteId.toString()
        }
      }));

      return (result.Items || []).map(item => new CheckHistoryDocument(item));
    })();

    // Mock sort() builder
    queryPromise.sort = function (sortObj) {
      return (async () => {
        const items = await queryPromise;
        if (sortObj && sortObj.checkedAt) {
          items.sort((a, b) => {
            const timeA = new Date(a.checkedAt).getTime();
            const timeB = new Date(b.checkedAt).getTime();
            return sortObj.checkedAt === -1 ? timeB - timeA : timeA - timeB;
          });
        }

        // Return a mock promise that has a limit method
        const sortedPromise = Promise.resolve(items);
        sortedPromise.limit = function (limitVal) {
          return (async () => {
            const list = await sortedPromise;
            return list.slice(0, limitVal);
          })();
        };
        return sortedPromise;
      })();
    };

    // Mock limit() builder if sort wasn't chained
    queryPromise.limit = function (limitVal) {
      return (async () => {
        const items = await queryPromise;
        return items.slice(0, limitVal);
      })();
    };

    return queryPromise;
  },

  // CheckHistory.deleteMany()
  deleteMany: async (filter) => {
    const websiteId = filter && filter.websiteId;
    if (!websiteId) return { deletedCount: 0 };

    // Get all records first because we need partition key and sort key to delete in DynamoDB
    const result = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'urlId = :urlId',
      ExpressionAttributeValues: {
        ':urlId': websiteId.toString()
      }
    }));

    const items = result.Items || [];
    if (items.length === 0) return { deletedCount: 0 };

    // Delete items sequentially
    for (const item of items) {
      await ddbDocClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          urlId: item.urlId,
          timestamp: item.timestamp
        }
      }));
    }

    return { deletedCount: items.length };
  }
};

module.exports = CheckHistory;
