const invalidateCache = async (redisClient, keys = []) => {
  await Promise.all(keys.map((key) => redisClient.del(key)));
};

export default invalidateCache;