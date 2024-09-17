// test/integration/post.test.js
import request from 'supertest';
import { expect } from 'chai';
import { app, httpServer } from '../setup.js';
import mongoose from 'mongoose';

let token;
let postId;

describe('Post Integration Tests', () => {
  before(async () => {
    await mongoose.connection.db.dropDatabase();

    // Rejestracja i logowanie użytkownika testowego
    const registerMutation = `
      mutation {
        register(
          name: "Test User",
          email: "testuser@example.com",
          password: "testpassword"
        ) {
          token
          user {
            id
            name
            email
          }
        }
      }
    `;

    const res = await request(httpServer)
      .post('/graphql')
      .send({ query: registerMutation });

    token = res.body.data.register.token;
  });

  after(async () => {
    httpServer.close();
  });

  describe('Post Mutations', () => {
    it('should create a new post', async () => {
      const mutation = `
        mutation {
          createPost(
            title: "Test Post",
            content: "This is a test post."
          ) {
            id
            title
            content
            author {
              id
              name
            }
          }
        }
      `;

      const res = await request(httpServer)
        .post('/graphql')
        .set('Authorization', token)
        .send({ query: mutation });

      expect(res.body.data.createPost).to.include({
        title: 'Test Post',
        content: 'This is a test post.',
      });

      expect(res.body.data.createPost.author).to.include({
        name: 'Test User',
      });

      postId = res.body.data.createPost.id;
    });

    it('should fetch posts', async () => {
      const query = `
        query {
          posts {
            id
            title
            content
            author {
              id
              name
            }
          }
        }
      `;

      const res = await request(httpServer)
        .post('/graphql')
        .send({ query });

      expect(res.body.data.posts).to.be.an('array').that.is.not.empty;
    });

    it('should update a post', async () => {
      const mutation = `
        mutation {
          updatePost(
            id: "${postId}",
            title: "Updated Post",
            content: "This post has been updated."
          ) {
            id
            title
            content
          }
        }
      `;

      const res = await request(httpServer)
        .post('/graphql')
        .set('Authorization', token)
        .send({ query: mutation });

      expect(res.body.data.updatePost).to.include({
        title: 'Updated Post',
        content: 'This post has been updated.',
      });
    });

    it('should delete a post', async () => {
      const mutation = `
        mutation {
          deletePost(id: "${postId}") {
            id
            title
          }
        }
      `;

      const res = await request(httpServer)
        .post('/graphql')
        .set('Authorization', token)
        .send({ query: mutation });

      expect(res.body.data.deletePost).to.include({
        id: postId,
        title: 'Updated Post',
      });
    });
  });
});
