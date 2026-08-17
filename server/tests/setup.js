const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Env must be set before any module reads src/config/env.js.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-not-used-anywhere-real';
process.env.JWT_EXPIRE = '1h';
process.env.LOG_LEVEL = 'error';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  // Each test starts from an empty database so ordering never matters.
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongo.stop();
});
