import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import jwt from 'jsonwebtoken';
import userLoader from '../loaders/userLoader.js';
import { redisClient, pubsub } from './redis.js';
import typeDefs from '../schema/typeDefs.js';
import resolvers from '../schema/resolvers/index.js';
import logger from '../utils/logger.js';
import UserModel from '../models/User.js';

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

const setupGraphQL = async (app) => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req, connection }) => {
      if (connection) {
        return connection.context;
      } else {
        const token = req.headers.authorization || '';
        const user = await getUserFromToken(token);
        return { user, userLoader, redisClient, pubsub };
      }
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const httpServer = createServer(app);
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  useServer(
    {
      schema: server.schema,
      context: async (ctx) => {
        const token = ctx.connectionParams?.authorization || '';
        const user = await getUserFromToken(token);
        return { user, userLoader, redisClient, pubsub };
      },
    },
    wsServer
  );

  return { server, httpServer };
};

export default setupGraphQL;
