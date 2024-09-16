const invalidateCache = async (redisClient, keys = []) => {
  for (let key of keys) {
    await redisClient.del(key);
  }
};

module.exports = invalidateCache;
