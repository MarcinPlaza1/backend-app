const userResolvers = require('./userResolvers');
const postResolvers = require('./postResolvers');
const commentResolvers = require('./commentResolvers');

const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...postResolvers.Query,
    ...commentResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...postResolvers.Mutation,
    ...commentResolvers.Mutation,
  },
  Subscription: {
    ...userResolvers.Subscription,
    ...postResolvers.Subscription,
    ...commentResolvers.Subscription,
  },
  User: {
    ...userResolvers.User,
  },
  Post: {
    ...postResolvers.Post,
  },
  Comment: {
    ...commentResolvers.Comment,
  },
};

module.exports = resolvers;
