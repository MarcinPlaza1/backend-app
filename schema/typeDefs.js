import { gql } from 'apollo-server-express';

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
    posts(limit: Int, offset: Int, sortBy: String, sortOrder: Int): [Post]
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
    likePost(postId: ID!): Boolean
    unlikePost(postId: ID!): Boolean
    likeComment(commentId: ID!): Boolean
    unlikeComment(commentId: ID!): Boolean
  }

  type Subscription {
    userAdded: User
    postAdded: Post
    commentAdded(postId: ID!): Comment
  }
`;

export default typeDefs;
