import 'dotenv-safe/config.js';
import connectMongoDB from './database.js';
import { redisClient, pubsub } from './redis.js';
import rateLimiter from '../middleware/rateLimiter.js';
import configureHelmet from '../middleware/helmetConfig.js';
import corsConfig from '../middleware/corsConfig.js';
import setupGraphQL from './graphql.js';
import logger from '../utils/logger.js';

export default {
  connectMongoDB,
  redisClient,
  pubsub,
  rateLimiter,
  configureHelmet,
  corsConfig,
  setupGraphQL,
  logger,
};

  