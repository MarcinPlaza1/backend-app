import userResolvers from './userResolvers.js';
import postResolvers from './postResolvers.js';
import commentResolvers from './commentResolvers.js';

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

export default resolvers;
