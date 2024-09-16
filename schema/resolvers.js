// schema/resolvers.js
const { ApolloError } = require('apollo-server-express');
const { withFilter } = require('graphql-subscriptions');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const PostModel = require('../models/Post');
const CommentModel = require('../models/Comment');
const LikeModel = require('../models/Like');
const Joi = require('joi');
const userValidationSchema = require('../validation/userValidation');
const postValidationSchema = require('../validation/postValidation');
const commentValidationSchema = require('../validation/commentValidation');

const resolvers = {
  Query: {
    users: async (parent, args, { user }) => {
      if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');
      return await UserModel.find();
    },
    user: async (parent, { id }, { user, redisClient }) => {
      if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');
      
      // Caching
      const cachedUser = await redisClient.get(`user:${id}`);
      if (cachedUser) {
        return JSON.parse(cachedUser);
      }

      const foundUser = await UserModel.findById(id);
      if (foundUser) {
        await redisClient.setEx(`user:${id}`, 3600, JSON.stringify(foundUser));
      }

      return foundUser;
    },
    me: async (parent, args, { user }) => {
      if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');
      return user;
    },
    posts: async (parent, args) => {
      const { limit = 10, offset = 0, sortBy = 'createdAt', sortOrder = -1 } = args;
      return await PostModel.find()
        .populate('author')
        .sort({ [sortBy]: sortOrder })
        .skip(offset)
        .limit(limit);
    },
    post: async (parent, { id }, { redisClient }) => {
      const cachedPost = await redisClient.get(`post:${id}`);
      if (cachedPost) {
        return JSON.parse(cachedPost);
      }
  
      const post = await PostModel.findById(id).populate('author');
      if (post) {
        await redisClient.setEx(`post:${id}`, 3600, JSON.stringify(post));
      }
  
      return post;
    },
    comments: async () => await CommentModel.find().populate('author').populate('post'),
    comment: async (parent, { id }) => await CommentModel.findById(id).populate('author').populate('post'),
  },
  Mutation: {
    register: async (parent, args, { pubsub, redisClient }) => {
      // Walidacja
      const { error } = userValidationSchema.validate(args);
      if (error) throw new ApolloError(error.details[0].message, 'VALIDATION_ERROR');

      const existingUser = await UserModel.findOne({ email: args.email });
      if (existingUser) throw new ApolloError('Email jest już w użyciu', 'USER_EXISTS');

      const user = new UserModel({
        name: args.name,
        email: args.email,
        password: args.password, // Haszowanie w pre-save hooku
        role: 'user',
      });
      await user.save();

      const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY, { expiresIn: '7d' });

      pubsub.publish('USER_ADDED', { userAdded: user });

      // Inwalidacja cache
      await redisClient.del(`user:${user.id}`);

      return { token, user };
    },
    login: async (parent, { email, password }) => {
      const user = await UserModel.findOne({ email });
      if (!user) throw new ApolloError('Nieprawidłowe dane logowania', 'INVALID_CREDENTIALS');

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new ApolloError('Nieprawidłowe dane logowania', 'INVALID_CREDENTIALS');

      const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY, { expiresIn: '7d' });
      return { token, user };
    },
    createPost: async (parent, args, { user, pubsub }) => {
      if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');

      const { error } = postValidationSchema.validate(args);
      if (error) throw new ApolloError(error.details[0].message, 'VALIDATION_ERROR');

      const post = new PostModel({
        title: args.title,
        content: args.content,
        author: user.id,
      });
      await post.save();

      await post.populate('author');

      pubsub.publish('POST_ADDED', { postAdded: post });

      // Inwalidacja cache (opcjonalnie, jeśli cacheujesz listę postów)

      return post;
    },
    updatePost: async (parent, { id, title, content }, { user, redisClient }) => {
      if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');
      const post = await PostModel.findById(id);
      if (!post) throw new ApolloError('Post nie znaleziony', 'NOT_FOUND');
      if (post.author.toString() !== user.id && user.role !== 'admin') throw new ApolloError('Brak uprawnień', 'FORBIDDEN');

      if (title) post.title = title;
      if (content) post.content = content;
      await post.save();

      // Inwalidacja cache
      await redisClient.del(`post:${id}`);

      return await post.populate('author');
    },
    deletePost: async (parent, { id }, { user, pubsub, redisClient }) => {
      if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');
      const post = await PostModel.findById(id);
      if (!post) throw new ApolloError('Post nie znaleziony', 'NOT_FOUND');
      if (post.author.toString() !== user.id && user.role !== 'admin') {
        throw new ApolloError('Brak uprawnień', 'FORBIDDEN');
      }

      await PostModel.findByIdAndDelete(id);

      pubsub.publish('POST_DELETED', { postDeleted: post });

      // Inwalidacja cache
      await redisClient.del(`post:${id}`);

      return post;
    },
    createComment: async (parent, { postId, content }, { user, pubsub }) => {
      if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');

      const { error } = commentValidationSchema.validate({ content });
      if (error) throw new ApolloError(error.details[0].message, 'VALIDATION_ERROR');

      const post = await PostModel.findById(postId);
      if (!post) throw new ApolloError('Post nie znaleziony', 'NOT_FOUND');

      const comment = new CommentModel({
        content,
        author: user.id,
        post: postId,
      });

      await comment.save();
      await comment.populate('author').populate('post');

      pubsub.publish('COMMENT_ADDED', { commentAdded: comment });

      return comment;
    },
    updateComment: async (parent, { id, content }, { user }) => {
      if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');
      const comment = await CommentModel.findById(id);
      if (!comment) throw new ApolloError('Komentarz nie znaleziony', 'NOT_FOUND');
      if (comment.author.toString() !== user.id) throw new ApolloError('Brak uprawnień', 'FORBIDDEN');

      comment.content = content;
      await comment.save();
      await comment.populate('author').populate('post');

      return comment;
    },
    deleteComment: async (parent, { id }, { user }) => {
      if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');
      const comment = await CommentModel.findById(id);
      if (!comment) throw new ApolloError('Komentarz nie znaleziony', 'NOT_FOUND');
      if (comment.author.toString() !== user.id && user.role !== 'admin') {
        throw new ApolloError('Brak uprawnień', 'FORBIDDEN');
      }

      await CommentModel.findByIdAndDelete(id);

      return comment;
    },
    likePost: async (parent, { postId }, { user }) => {
      if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');
  
      const post = await PostModel.findById(postId);
      if (!post) throw new ApolloError('Post nie znaleziony', 'NOT_FOUND');
  
      try {
        const like = new LikeModel({
          user: user.id,
          targetType: 'Post',
          targetId: postId,
        });
        await like.save();
        return true;
      } catch (err) {
        if (err.code === 11000) {
          // Like już istnieje
          return false;
        }
        throw new ApolloError('Błąd podczas polubienia postu', 'LIKE_ERROR');
      }
    },
    unlikePost: async (parent, { postId }, { user }) => {
      if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');
  
      const like = await LikeModel.findOneAndDelete({
        user: user.id,
        targetType: 'Post',
        targetId: postId,
      });
  
      return like ? true : false;
    },
    likeComment: async (parent, { commentId }, { user }) => {
      if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');
  
      const comment = await CommentModel.findById(commentId);
      if (!comment) throw new ApolloError('Komentarz nie znaleziony', 'NOT_FOUND');
  
      try {
        const like = new LikeModel({
          user: user.id,
          targetType: 'Comment',
          targetId: commentId,
        });
        await like.save();
        return true;
      } catch (err) {
        if (err.code === 11000) {
          // Like już istnieje
          return false;
        }
        throw new ApolloError('Błąd podczas polubienia komentarza', 'LIKE_ERROR');
      }
    },
    unlikeComment: async (parent, { commentId }, { user }) => {
      if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');
  
      const like = await LikeModel.findOneAndDelete({
        user: user.id,
        targetType: 'Comment',
        targetId: commentId,
      });
  
      return like ? true : false;
    },
  },
  Subscription: {
    userAdded: {
      subscribe: () => pubsub.asyncIterator(['USER_ADDED']),
    },
    postAdded: {
      subscribe: () => pubsub.asyncIterator(['POST_ADDED']),
    },
    commentAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator('COMMENT_ADDED'),
        (payload, variables) => {
          return payload.commentAdded.post.toString() === variables.postId;
        }
      ),
    },
  },
  User: {
    posts: async (parent) => {
      return await PostModel.find({ author: parent.id });
    },
    comments: async (parent) => {
      return await CommentModel.find({ author: parent.id });
    },
  },
  Post: {
    author: (parent) => parent.author, // Dane już zapełnione przez populate
    comments: async (parent, { limit = 10, offset = 0 }) => {
      return await CommentModel.find({ post: parent.id })
        .populate('author')
        .skip(offset)
        .limit(limit);
    },
    likesCount: async (parent) => {
      return await LikeModel.countDocuments({
        targetType: 'Post',
        targetId: parent.id,
      });
    },
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
  Comment: {
    author: (parent) => parent.author, // Dane już zapełnione przez populate
    post: (parent) => parent.post, // Dane już zapełnione przez populate
    likesCount: async (parent) => {
      return await LikeModel.countDocuments({
        targetType: 'Comment',
        targetId: parent.id,
      });
    },
    likedByUser: async (parent, args, { user }) => {
      if (!user) return false;
      const like = await LikeModel.findOne({
        user: user.id,
        targetType: 'Comment',
        targetId: parent.id,
      });
      return !!like;
    },
  },
};

module.exports = resolvers;
