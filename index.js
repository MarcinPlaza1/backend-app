require('dotenv').config();
const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { PubSub, withFilter } = require('graphql-subscriptions');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const Joi = require('joi');
const userLoader = require('./loaders/userLoader');
const redis = require('redis');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

mongoose.connect(process.env.DATABASE_URL);

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Za dużo zapytań z tego adresu IP, spróbuj ponownie później.',
  standardHeaders: true, 
  legacyHeaders: false,
});

app.use(limiter);
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

const UserModel = require('./models/User');
const PostModel = require('./models/Post');
const CommentModel = require('./models/Comment');
const LikeModel = require('./models/Like');
const exp = require('constants');

const pubsub = new PubSub();

const typeDefs = gql`
  scalar Date

  type User {
    id: ID!
    name: String!
    email: String!
    role: String
    posts: [Post]
    comments: [Comment]
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    likesCount: Int!
    likedByUser: Boolean!
    comments(limit: Int, offset: Int): [Comment]
  }

  type Comment {
    id: ID!
    content: String!
    author: User!
    post: Post!
    createdAt: Date!
    likesCount: Int!
    likedByUser: Boolean!
  }

  type Query {
    users: [User]
    user(id: ID!): User
    me: User
    posts: [Post]
    post(id: ID!): Post
    comments: [Comment]
    comment(id: ID!): Comment
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): AuthPayload
    login(email: String!, password: String!): AuthPayload

    createPost(title: String!, content: String!): Post
    updatePost(id: ID!, title: String, content: String): Post
    deletePost(id: ID!): Post

    createComment(postId: ID!, content: String!): Comment
    updateComment(id: ID!, content: String!): Comment
    deleteComment(id: ID!): Comment
  }

  extend type Mutation {
    likePost(postId: ID!): Boolean
    unlikePost(postId: ID!): Boolean
    likeComment(commentId: ID!): Boolean
    unlikeComment(commentId: ID!): Boolean
  }

  extend type Query {
    posts(limit: Int, offset: Int, sortBy: String, sortOrder: Int): [Post]
  }

  type Subscription {
    userAdded: User
    postAdded: Post
    commentAdded(postId: ID!): Comment
  }
`;

const userValidationSchema = Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const postValidationSchema = Joi.object({
  title: Joi.string().min(3).required(),
  content: Joi.string().min(1).required(),
});

const commentValidationSchema = Joi.object({
  content: Joi.string().min(1).required(),
});

const resolvers = {
  Query: {
    users: async (parent, args, { user }) => {
      if (!user) throw new Error('Nie jesteś zalogowany');
      return await UserModel.find();
    },
    user: async (parent, { id }, { user }) => {
      if (!user) throw new Error('Nie jesteś zalogowany');
      return await UserModel.findById(id);
    },
    me: async (parent, args, { user }) => {
      if (!user) throw new Error('Nie jesteś zalogowany');
      return user;
    },
    posts: async (parent, args) => {
      const { limit = 10, offset = 0, sortBy = 'createdAt', sortOrder = -1 } = args;
      return await PostModel.find()
        .sort({ [sortBy]: sortOrder })
        .skip(offset)
        .limit(limit);
    },
    post: async (parent, { id }, { redisClient }) => {
      const cachedPost = await redisClient.get(`post:${id}`);
      if (cachedPost) {
        return JSON.parse(cachedPost);
      }
  
      const post = await PostModel.findById(id);
      if (post) {
        await redisClient.setEx(`post:${id}`, 3600, JSON.stringify(post));
      }
  
      return post;
    },
    comments: async () => await CommentModel.find(),
    comment: async (parent, { id }) => await CommentModel.findById(id),
  },
  Mutation: {
    register: async (parent, args) => {
      const { error } = userValidationSchema.validate(args);
      if (error) throw new Error(error.details[0].message);

      const existingUser = await UserModel.findOne({ email: args.email });
      if (existingUser) throw new Error('Email jest już w użyciu');

      const hashedPassword = await bcrypt.hash(args.password, 10);
      const user = new UserModel({
        name: args.name,
        email: args.email,
        password: hashedPassword,
        role: 'user',
      });
      await user.save();

      const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY);

      pubsub.publish('USER_ADDED', { userAdded: user });

      return { token, user };
    },
    login: async (parent, { email, password }) => {
      const user = await UserModel.findOne({ email });
      if (!user) throw new Error('Nieprawidłowe dane logowania');

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error('Nieprawidłowe dane logowania');

      const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY);
      return { token, user };
    },
    createPost: async (parent, args, { user }) => {
      if (!user) throw new Error('Nie jesteś zalogowany');

      const { error } = postValidationSchema.validate(args);
      if (error) throw new Error(error.details[0].message);

      const post = new PostModel({
        title: args.title,
        content: args.content,
        author: user.id,
      });
      await post.save();

      pubsub.publish('POST_ADDED', { postAdded: post });

      return post;
    },
    updatePost: async (parent, { id, title, content }, { user }) => {
      if (!user) throw new Error('Nie jesteś zalogowany');
      const post = await PostModel.findById(id);
      if (!post) throw new Error('Post nie znaleziony');
      if (post.author.toString() !== user.id) throw new Error('Brak uprawnień');

      if (title) post.title = title;
      if (content) post.content = content;
      await post.save();
      return post;
    },
    deletePost: async (parent, { id }, { user }) => {
      if (!user) throw new Error('Nie jesteś zalogowany');
      const post = await PostModel.findById(id);
      if (!post) throw new Error('Post nie znaleziony');
      if (post.author.toString() !== user.id && user.role !== 'admin') {
        throw new Error('Brak uprawnień');
      }

      await PostModel.findByIdAndDelete(id);
      return post;
    },
    createComment: async (parent, { postId, content }, { user }) => {
      if (!user) throw new Error('Nie jesteś zalogowany');

      const { error } = commentValidationSchema.validate({ content });
      if (error) throw new Error(error.details[0].message);

      const post = await PostModel.findById(postId);
      if (!post) throw new Error('Post nie znaleziony');

      const comment = new CommentModel({
        content,
        author: user.id,
        post: postId,
      });

      await comment.save();

      pubsub.publish('COMMENT_ADDED', { commentAdded: comment });

      return comment;
    },
    updateComment: async (parent, { id, content }, { user }) => {
      if (!user) throw new Error('Nie jesteś zalogowany');
      const comment = await CommentModel.findById(id);
      if (!comment) throw new Error('Komentarz nie znaleziony');
      if (comment.author.toString() !== user.id) throw new Error('Brak uprawnień');

      comment.content = content;
      await comment.save();
      return comment;
    },
    deleteComment: async (parent, { id }, { user }) => {
      if (!user) throw new Error('Nie jesteś zalogowany');
      const comment = await CommentModel.findById(id);
      if (!comment) throw new Error('Komentarz nie znaleziony');
      if (comment.author.toString() !== user.id && user.role !== 'admin') {
        throw new Error('Brak uprawnień');
      }

      await CommentModel.findByIdAndDelete(id);
      return comment;
    },
    likePost: async (parent, { postId }, { user }) => {
      if (!user) throw new Error('Nie jesteś zalogowany');
  
      const post = await PostModel.findById(postId);
      if (!post) throw new Error('Post nie znaleziony');
  
      const existingLike = await LikeModel.findOne({
        user: user.id,
        targetType: 'Post',
        targetId: postId,
      });
  
      if (existingLike) return false;
  
      const like = new LikeModel({
        user: user.id,
        targetType: 'Post',
        targetId: postId,
      });
  
      await like.save();
      return true;
    },
    unlikePost: async (parent, { postId }, { user }) => {
      if (!user) throw new Error('Nie jesteś zalogowany');
  
      const like = await LikeModel.findOneAndDelete({
        user: user.id,
        targetType: 'Post',
        targetId: postId,
      });
  
      return like ? true : false;
    },
    likeComment: async (parent, { commentId }, { user }) => {
      if (!user) throw new Error('Nie jesteś zalogowany');
  
      const comment = await CommentModel.findById(commentId);
      if (!comment) throw new Error('Komentarz nie znaleziony');
  
      const existingLike = await LikeModel.findOne({
        user: user.id,
        targetType: 'Comment',
        targetId: commentId,
      });
  
      if (existingLike) return false;
  
      const like = new LikeModel({
        user: user.id,
        targetType: 'Comment',
        targetId: commentId,
      });
  
      await like.save();
      return true;
    },
    unlikeComment: async (parent, { commentId }, { user }) => {
      if (!user) throw new Error('Nie jesteś zalogowany');
  
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
    author: async (parent, args, { userLoader }) => {
      return await userLoader.load(parent.author.toString());
    },
    comments: async (parent) => {
      return await CommentModel.find({ post: parent.id });
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
    comments: async (parent, args) => {
      const { limit = 10, offset = 0 } = args;
      return await CommentModel.find({ post: parent.id })
        .skip(offset)
        .limit(limit);
    },
  },
  Comment: {
    author: async (parent, args, { userLoader }) => {
      return await userLoader.load(parent.author.toString());
    },  
    post: async (parent) => {
      return await PostModel.findById(parent.post);
    },
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

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

redisClient.connect();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const morgan = require('morgan');
  app.use(morgan('combined'));

  const schema = makeExecutableSchema({ typeDefs, resolvers });

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
        return { user };
      },
    },
    wsServer
  );

  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      const token = req.headers.authorization || '';
      const user = await getUserFromToken(token);
      return { user, userLoader, redisClient };
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
    console.log(`🚀 Serwer działa na http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`🚀 Subskrypcje działają na ws://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer();

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
