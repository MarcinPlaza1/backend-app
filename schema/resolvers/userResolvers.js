import { ApolloError } from 'apollo-server-express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UserModel from '../../models/User.js';
import PostModel from '../../models/Post.js'; // Dodano import
import CommentModel from '../../models/Comment.js'; // Dodano import
import userValidationSchema from '../../validation/userValidation.js';
import validateInput from '../../utils/validator.js';
import { checkAuth } from '../../utils/auth.js';
import invalidateCache from '../../utils/cache.js';

const userResolvers = {
  Query: {
    users: async (parent, args, { user }) => {
      checkAuth(user);
      return await UserModel.find();
    },
    user: async (parent, { id }, { user, redisClient }) => {
      checkAuth(user);
      const cachedUser = await redisClient.get(`user:${id}`);
      if (cachedUser) return JSON.parse(cachedUser);
      const foundUser = await UserModel.findById(id);
      if (foundUser) {
        await redisClient.setEx(`user:${id}`, 3600, JSON.stringify(foundUser));
      }
      return foundUser;
    },
    me: async (parent, args, { user }) => {
      checkAuth(user);
      return user;
    },
  },
  Mutation: {
    register: async (parent, args, { pubsub, redisClient }) => {
      validateInput(userValidationSchema, args);
      const existingUser = await UserModel.findOne({ email: args.email });
      if (existingUser)
        throw new ApolloError('Email jest już w użyciu', 'USER_EXISTS');
      const user = new UserModel({
        name: args.name,
        email: args.email,
        password: args.password,
        role: 'user',
      });
      await user.save();
      const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY, {
        expiresIn: '7d',
      });
      pubsub.publish('USER_ADDED', { userAdded: user });
      await invalidateCache(redisClient, [`user:${user.id}`]); // Dodano await
      return { token, user };
    },
    login: async (parent, { email, password }) => {
      const user = await UserModel.findOne({ email });
      if (!user)
        throw new ApolloError(
          'Nieprawidłowe dane logowania',
          'INVALID_CREDENTIALS'
        );
      const valid = await bcrypt.compare(password, user.password);
      if (!valid)
        throw new ApolloError(
          'Nieprawidłowe dane logowania',
          'INVALID_CREDENTIALS'
        );
      const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY, {
        expiresIn: '7d',
      });
      return { token, user };
    },
  },
  Subscription: {
    userAdded: {
      subscribe: (parent, args, { pubsub }) =>
        pubsub.asyncIterator(['USER_ADDED']),
    },
  },
  User: {
    posts: async (parent) => await PostModel.find({ author: parent.id }),
    comments: async (parent) => await CommentModel.find({ author: parent.id }),
  },
};

export default userResolvers;
