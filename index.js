require('dotenv-safe').config({
  allowEmptyValues: false,
  example: '.env.example',
});

const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { RedisPubSub } = require('graphql-redis-subscriptions');
const Redis = require('ioredis');

const userLoader = require('./loaders/userLoader');
const logger = require('./logger');

// Import modeli
const UserModel = require('./models/User');
const PostModel = require('./models/Post');
const CommentModel = require('./models/Comment');
const LikeModel = require('./models/Like');

// Import schematów GraphQL
const typeDefs = require('./schema/typeDefs');
const resolvers = require('./schema/resolvers');

// Import schematów walidacji
const userValidationSchema = require('./validation/userValidation');
const postValidationSchema = require('./validation/postValidation');
const commentValidationSchema = require('./validation/commentValidation');

// Funkcja do pobierania użytkownika z tokenu
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

// Połączenie z MongoDB
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    logger.info('Połączono z MongoDB');
  } catch (err) {
    logger.error('Błąd połączenia z MongoDB', err);
    process.exit(1);
  }
};

// Konfiguracja Redis
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const redisClient = new Redis(redisOptions);
redisClient.on('error', (err) => logger.error('Redis Client Error', err));

// Inicjalizacja RedisPubSub
const pubsub = new RedisPubSub({
  publisher: redisClient,
  subscriber: redisClient,
});

// Konfiguracja Helmet z dynamiczną polityką CSP
const configureHelmet = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      'https://apollo-server-landing-page.cdn.apollographql.com',
      ...(isProduction ? [] : ["'unsafe-inline'", "'unsafe-eval'"]),
    ],
    imgSrc: [
      "'self'",
      'https://apollo-server-landing-page.cdn.apollographql.com',
      'data:',
    ],
    styleSrc: [
      "'self'",
      'https://apollo-server-landing-page.cdn.apollographql.com',
      ...(isProduction ? [] : ["'unsafe-inline'"]),
    ],
    connectSrc: [
      "'self'",
      `ws://${process.env.HOST || 'localhost'}:${process.env.PORT || 4000}/graphql`,
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
  };

  return helmet({
    contentSecurityPolicy: {
      directives: cspDirectives,
    },
  });
};

// Inicjalizacja serwera
const startServer = async () => {
  await connectMongoDB();

  const app = express();

  // Middleware
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Za dużo zapytań z tego adresu IP, spróbuj ponownie później.',
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use(configureHelmet());

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
      context: async (ctx) => {
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
};

startServer().catch((err) => {
  logger.error('Błąd podczas uruchamiania serwera', err);
  process.exit(1);
});
