const { ddbDocClient } = require('../config/db');
const { ScanCommand, GetCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE_NAME = process.env.DYNAMODB_TABLE_URLS || 'urlms-urls';

class WebsiteDocument {
  constructor(data) {
    this._id = data.urlId || data._id; // Map urlId to _id for frontend compatibility
    this.urlId = this._id;
    this.url = data.url;
    this.name = data.name;
    this.status = data.status || 'PENDING';
    this.statusCode = data.statusCode !== undefined ? data.statusCode : null;
    this.responseTime = data.responseTime !== undefined ? data.responseTime : null;
    this.lastChecked = data.lastChecked ? new Date(data.lastChecked) : null;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.failureCount = data.failureCount !== undefined ? data.failureCount : 0;
    this.alertSent = data.alertSent !== undefined ? data.alertSent : false;
  }

  // Mongoose-like save method for updating instance properties
  async save() {
    const item = {
      urlId: this._id,
      url: this.url,
      name: this.name,
      status: this.status,
      statusCode: this.statusCode,
      responseTime: this.responseTime,
      lastChecked: this.lastChecked ? this.lastChecked.toISOString() : null,
      createdAt: this.createdAt ? (typeof this.createdAt.toISOString === 'function' ? this.createdAt.toISOString() : this.createdAt) : new Date().toISOString(),
      isActive: this.isActive,
      failureCount: this.failureCount,
      alertSent: this.alertSent
    };

    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));
    return this;
  }
}

// Repository / Mock Mongoose Model interface
const Website = {
  // Website.find()
  find: () => {
    const queryPromise = (async () => {
      const result = await ddbDocClient.send(new ScanCommand({
        TableName: TABLE_NAME
      }));
      return (result.Items || []).map(item => new WebsiteDocument(item));
    })();

    // Mock the Mongoose .sort() builder
    queryPromise.sort = function (sortObj) {
      return (async () => {
        const items = await queryPromise;
        if (sortObj && sortObj.createdAt) {
          items.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return sortObj.createdAt === -1 ? timeB - timeA : timeA - timeB;
          });
        }
        return items;
      })();
    };

    return queryPromise;
  },

  // Website.findOne()
  findOne: async (filter) => {
    const result = await ddbDocClient.send(new ScanCommand({
      TableName: TABLE_NAME
    }));
    const items = (result.Items || []).map(item => new WebsiteDocument(item));

    if (filter && filter.url) {
      return items.find(item => item.url.toLowerCase() === filter.url.toLowerCase()) || null;
    }
    return items[0] || null;
  },

  // Website.findById()
  findById: async (id) => {
    if (!id) return null;
    const result = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { urlId: id.toString() }
    }));

    if (!result.Item) return null;
    return new WebsiteDocument(result.Item);
  },

  // Website.create()
  create: async (data) => {
    const id = uuidv4();
    const doc = new WebsiteDocument({
      urlId: id,
      url: data.url,
      name: data.name,
      status: 'PENDING',
      statusCode: null,
      responseTime: null,
      lastChecked: null,
      createdAt: new Date().toISOString(),
      isActive: true,
      failureCount: 0,
      alertSent: false
    });
    await doc.save();
    return doc;
  },

  // Website.findByIdAndDelete()
  findByIdAndDelete: async (id) => {
    if (!id) return null;
    const website = await Website.findById(id);
    if (!website) return null;

    // Delete from DynamoDB
    await ddbDocClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { urlId: id.toString() }
    }));

    return website;
  }
};

module.exports = Website;
