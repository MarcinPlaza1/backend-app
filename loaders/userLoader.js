import DataLoader from 'dataloader';
import UserModel from '../models/User.js';

const userLoader = new DataLoader(async (userIds) => {
  const users = await UserModel.find({ _id: { $in: userIds } });
  const userMap = new Map();
  users.forEach(user => {
    userMap.set(user.id, user);
  });
  return userIds.map(id => userMap.get(id) || null);
});

export default userLoader;
