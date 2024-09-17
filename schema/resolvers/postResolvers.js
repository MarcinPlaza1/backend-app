import { ApolloError } from 'apollo-server-express';
import PostModel from '../../models/Post.js';
import CommentModel from '../../models/Comment.js'; // Dodano import
import LikeModel from '../../models/Like.js'; // Dodano import
import postValidationSchema from '../../validation/postValidation.js';
import validateInput from '../../utils/validator.js';
import { checkAuth, checkPermissions } from '../../utils/auth.js';
import invalidateCache from '../../utils/cache.js';
import buildQueryOptions from '../../utils/queryBuilder.js';

const postResolvers = {
  Query: {
    posts: async (parent, args) => {
      const options = buildQueryOptions(args);
      return await PostModel.find()
        .populate('author')
        .sort(options.sort)
        .skip(options.skip)
        .limit(options.limit);
    },
    post: async (parent, { id }, { redisClient }) => {
      const cachedPost = await redisClient.get(`post:${id}`);
      if (cachedPost) return JSON.parse(cachedPost);
      const post = await PostModel.findById(id).populate('author');
      if (post)
        await redisClient.setEx(`post:${id}`, 3600, JSON.stringify(post));
      return post;
    },
  },
  Mutation: {
    createPost: async (parent, args, { user, pubsub }) => {
      checkAuth(user);
      validateInput(postValidationSchema, args);
      const post = new PostModel({
        title: args.title,
        content: args.content,
        author: user.id,
      });
      await post.save();
      await post.populate('author');
      pubsub.publish('POST_ADDED', { postAdded: post });
      return post;
    },
    updatePost: async (parent, { id, title, content }, { user, redisClient }) => {
      checkAuth(user);
      const post = await PostModel.findById(id);
      if (!post) throw new ApolloError('Post nie znaleziony', 'NOT_FOUND');
      checkPermissions(user, post.author);
      if (title) post.title = title;
      if (content) post.content = content;
      await post.save();
      await invalidateCache(redisClient, [`post:${id}`]);
      return await post.populate('author');
    },
    deletePost: async (parent, { id }, { user, pubsub, redisClient }) => {
      checkAuth(user);
      const post = await PostModel.findById(id);
      if (!post) throw new ApolloError('Post nie znaleziony', 'NOT_FOUND');
      checkPermissions(user, post.author);
      await PostModel.findByIdAndDelete(id);
      pubsub.publish('POST_DELETED', { postDeleted: post });
      await invalidateCache(redisClient, [`post:${id}`]);
      return post;
    },
  },
  Subscription: {
    postAdded: {
      subscribe: (parent, args, { pubsub }) =>
        pubsub.asyncIterator(['POST_ADDED']),
    },
  },
  Post: {
    comments: async (parent, { limit = 10, offset = 0 }) =>
      await CommentModel.find({ post: parent.id })
        .populate('author')
        .skip(offset)
        .limit(limit),
    likesCount: async (parent) =>
      await LikeModel.countDocuments({
        targetType: 'Post',
        targetId: parent.id,
      }),
    likedByUser: async (parent, args, { user }) => {
      if (!user) return false;
      const like = await LikeModel.findOne({
        user: user.id,
        targetType: 'Post',
        targetId: parent.id,
      });
      return !!like;
    },
  },
};

export default postResolvers;
