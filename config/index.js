require('dotenv-safe').config({
    allowEmptyValues: false,
    example: '.env.example',
  });
  
  const connectMongoDB = require('./database');
  const { redisClient, pubsub } = require('./redis');
  const rateLimiter = require('../middleware/rateLimiter');
  const configureHelmet = require('../middleware/helmetConfig');
  const corsConfig = require('../middleware/corsConfig');
  const setupGraphQL = require('./graphql');
  const logger = require('../utils/logger');
  
  module.exports = {
    connectMongoDB,
    redisClient,
    pubsub,
    rateLimiter,
    configureHelmet,
    corsConfig,
    setupGraphQL,
    logger,
  };
  