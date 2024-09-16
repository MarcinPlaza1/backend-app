const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const jwt = require('jsonwebtoken');
const userLoader = require('../loaders/userLoader');
const { redisClient, pubsub } = require('./redis');
const typeDefs = require('../schema/typeDefs');
const resolvers = require('../schema/resolvers');
const logger = require('../utils/logger');

const UserModel = require('../models/User');

const getUserFromToken = async (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    return await UserModel.findById(decoded.userId);
  } catch (err) {
    logger.warn('Nie udało się zweryfikować tokenu', err);
    return null;
  }
};

const setupGraphQL = async (app, httpServer) => {
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        const token = ctx.connectionParams?.authorization || '';
        const user = await getUserFromToken(token);
        return { user, userLoader, redisClient, pubsub };
      },
    },
    wsServer
  );

  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      const token = req.headers.authorization || '';
      const user = await getUserFromToken(token);
      return { user, userLoader, redisClient, pubsub };
    },
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();
  server.applyMiddleware({ app });

  return server;
};

module.exports = setupGraphQL;
