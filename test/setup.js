// test/setup.js
import mongoose from 'mongoose';
import config from '../config/index.js';
import configureExpress from '../config/express.js';
import setupGraphQL from '../config/graphql.js';

let app;
let httpServer;

before(async () => {
  this.timeout(20000);
  process.env.DATABASE_URL = 'mongodb+srv://plazamarcin098:FhhKOH0xD8ZYsSwr@backend.emobtl9.mongodb.net/';
  await config.connectMongoDB();
  app = configureExpress();
  const serverConfig = await setupGraphQL(app);
  httpServer = serverConfig.httpServer;
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

export { app, httpServer };
