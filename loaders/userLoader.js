// loaders/userLoader.js
const DataLoader = require('dataloader');
const UserModel = require('../models/User');

const userLoader = new DataLoader(async (userIds) => {
  const users = await UserModel.find({ _id: { $in: userIds } });
  const userMap = new Map();
  users.forEach(user => {
    userMap.set(user.id, user);
  });
  return userIds.map(id => userMap.get(id) || null);
});

module.exports = userLoader;
