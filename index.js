// index.js
require('dotenv-safe').config({
  allowEmptyValues: false,
  example: '.env.example',
});
const express = require('express');
const { ApolloServer, ApolloError } = require('apollo-server-express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { withFilter } = require('graphql-subscriptions');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const Joi = require('joi');
const userLoader = require('./loaders/userLoader');
const redis = require('redis');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { RedisPubSub } = require('graphql-redis-subscriptions');
const Redis = require('ioredis');
const logger = require('./logger');

const UserModel = require('./models/User');
const PostModel = require('./models/Post');
const CommentModel = require('./models/Comment');
const LikeModel = require('./models/Like');

// Schemat GraphQL
const typeDefs = require('./schema/typeDefs');
const resolvers = require('./schema/resolvers');

// Walidacja schematów
const userValidationSchema = require('./validation/userValidation');
const postValidationSchema = require('./validation/postValidation');
const commentValidationSchema = require('./validation/commentValidation');

// Funkcja do pobierania użytkownika z tokenu
async function getUserFromToken(token) {
  try {
    if (token) {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      return await UserModel.findById(decoded.userId);
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Połączenie z MongoDB
mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => logger.info('Połączono z MongoDB'))
.catch(err => {
  logger.error('Błąd połączenia z MongoDB', err);
  process.exit(1);
});

// Konfiguracja Redis
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});
redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.connect();

// Inicjalizacja RedisPubSub
const pubsub = new RedisPubSub({
  publisher: new Redis(process.env.REDIS_URL),
  subscriber: new Redis(process.env.REDIS_URL),
});

async function startServer() {
  const app = express();

  // Middleware
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Za dużo zapytań z tego adresu IP, spróbuj ponownie później.',
    standardHeaders: true, 
    legacyHeaders: false,
  });
  app.use(limiter);
  
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://apollo-server-landing-page.cdn.apollographql.com',
          "'unsafe-inline'", // Dla rozwoju; usuń w produkcji
          "'unsafe-eval'",    // Dla rozwoju; usuń w produkcji
        ],
        imgSrc: [
          "'self'",
          'https://apollo-server-landing-page.cdn.apollographql.com',
          'data:',
        ],
        styleSrc: [
          "'self'",
          'https://apollo-server-landing-page.cdn.apollographql.com',
          "'unsafe-inline'", // Dla rozwoju; usuń w produkcji
        ],
        connectSrc: [
          "'self'",
          'ws://localhost:4000/graphql',
          'https://apollo-server-landing-page.cdn.apollographql.com',
        ],
        manifestSrc: [
          "'self'",
          'https://apollo-server-landing-page.cdn.apollographql.com',
        ],
        fontSrc: [
          "'self'",
          'https://apollo-server-landing-page.cdn.apollographql.com',
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        childSrc: ["'self'"],
        frameSrc: ["'self'"],
        workerSrc: ["'self'"],
      },
    },
  }));
  
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:4000', 'https://studio.apollographql.com'],
    credentials: true,
  }));  
  
  app.use(morgan('combined'));

  // Tworzenie schematu
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Serwer WebSocket
  const httpServer = createServer(app);
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx, msg, args) => {
        const token = ctx.connectionParams?.authorization || '';
        const user = await getUserFromToken(token);
        return { user, userLoader, redisClient, pubsub };
      },
    },
    wsServer
  );

  // Konfiguracja Apollo Server
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

  const PORT = process.env.PORT || 4000;

  httpServer.listen(PORT, () => {
    logger.info(`🚀 Serwer działa na http://localhost:${PORT}${server.graphqlPath}`);
    logger.info(`🚀 Subskrypcje działają na ws://localhost:${PORT}${server.graphqlPath}`);
  });

  return app;
}

startServer();

