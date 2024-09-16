const Redis = require('ioredis');
const { RedisPubSub } = require('graphql-redis-subscriptions');
const logger = require('../utils/logger');

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const redisClient = new Redis(redisOptions);

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

const pubsub = new RedisPubSub({
  publisher: redisClient,
  subscriber: redisClient,
});

module.exports = { redisClient, pubsub };
