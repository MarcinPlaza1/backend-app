const { ApolloError } = require('apollo-server-express');
const CommentModel = require('../../models/Comment');
const commentValidationSchema = require('../../validation/commentValidation');
const validateInput = require('../../utils/validator');
const { checkAuth, checkPermissions } = require('../../utils/auth');

const commentResolvers = {
  Query: {
    comments: async () => await CommentModel.find().populate('author').populate('post'),
    comment: async (parent, { id }) => await CommentModel.findById(id).populate('author').populate('post'),
  },
  Mutation: {
    createComment: async (parent, { postId, content }, { user, pubsub }) => {
      checkAuth(user);
      validateInput(commentValidationSchema, { content });

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
      checkAuth(user);
      const comment = await CommentModel.findById(id);
      if (!comment) throw new ApolloError('Komentarz nie znaleziony', 'NOT_FOUND');
      checkPermissions(user, comment.author);

      comment.content = content;
      await comment.save();
      await comment.populate('author').populate('post');

      return comment;
    },
    deleteComment: async (parent, { id }, { user }) => {
      checkAuth(user);
      const comment = await CommentModel.findById(id);
      if (!comment) throw new ApolloError('Komentarz nie znaleziony', 'NOT_FOUND');
      checkPermissions(user, comment.author);

      await CommentModel.findByIdAndDelete(id);

      return comment;
    },
  },
  Subscription: {
    commentAdded: {
      subscribe: (parent, { postId }, { pubsub }) => pubsub.asyncIterator('COMMENT_ADDED'),
    },
  },
};

module.exports = commentResolvers;
