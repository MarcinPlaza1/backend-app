// loaders/userLoader.js
const DataLoader = require('dataloader');
const UserModel = require('../models/User');

const userLoader = new DataLoader(async (userIds) => {
  const users = await UserModel.find({ _id: { $in: userIds } });
  const userMap = {};
  users.forEach(user => {
    userMap[user.id] = user;
  });
  return userIds.map(id => userMap[id]);
});

module.exports = userLoader;
