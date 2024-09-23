
# GraphQL Backend - Social Media API

A Social Media backend application built with GraphQL, using Node.js, Express, Apollo Server, and MongoDB. It provides functionalities needed to manage posts, comments, likes, and real-time interactions.

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [GraphQL Query Examples](#graphql-query-examples)
- [Testing](#testing)
- [Future Development](#future-development)
- [Author](#author)

## Features

- User registration and login (JWT authentication)
- Create, edit, and delete posts
- Comment on posts
- Like posts and comments
- Real-time subscriptions (WebSocket/Apollo)
- Pagination and sorting of results
- Authorization for resource operations

## Technologies

- **Node.js** - JavaScript runtime
- **Express** - Web framework for building APIs
- **Apollo Server** - GraphQL server implementation
- **MongoDB** - NoSQL database for storing users, posts, and comments
- **Redis** - Cache and real-time subscription mechanism
- **JWT** - JSON Web Tokens for user authentication

## Requirements

- Node.js v14 or later
- MongoDB
- Redis (optional for handling subscriptions)

## Installation

To run the application locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/MarcinPlaza1/social-media.git
   cd social-media
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

## Configuration

Before running the application, create a `.env` file in the root directory with the following variables:

```bash
DATABASE_URL=mongodb://localhost:27017/graphql_db
PORT=4000
SECRET_KEY=YourSecretKey
REDIS_URL=redis://localhost:6379
```

## Running the Application

To run the application in development mode, use the following command:

```bash
npm run dev
```

## GraphQL Query Examples

### Registering a User:

```graphql
mutation {
  registerUser(input: { username: "john_doe", password: "password123" }) {
    token
    user {
      id
      username
    }
  }
}
```

### Adding a Post:

```graphql
mutation {
  addPost(input: { title: "First Post", content: "This is the content of my first post." }) {
    id
    title
    content
    createdAt
  }
}
```

### Subscribing to New Comments:

```graphql
subscription {
  newComment(postId: "123") {
    id
    content
    author {
      username
    }
  }
}
```

## Testing

To run unit tests (after implementing tests), use the following command:

```bash
npm test
```

## Future Development

Planned future features:
- Password reset
- Notifications for new likes and comments
- Integration with external services, e.g., AWS S3 for image storage

## Author

This project was created by [Marcin Plaza](https://github.com/MarcinPlaza1).
