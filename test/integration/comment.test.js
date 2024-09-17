// test/integration/comment.test.js
import request from 'supertest';
import { expect } from 'chai';
import { app, httpServer } from '../setup.js';
import mongoose from 'mongoose';

let token;
let postId;
let commentId;

describe('Comment Integration Tests', () => {
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

    // Tworzenie posta
    const createPostMutation = `
      mutation {
        createPost(
          title: "Test Post",
          content: "This is a test post."
        ) {
          id
        }
      }
    `;

    const postRes = await request(httpServer)
      .post('/graphql')
      .set('Authorization', token)
      .send({ query: createPostMutation });

    postId = postRes.body.data.createPost.id;
  });

  after(async () => {
    httpServer.close();
  });

  describe('Comment Mutations', () => {
    it('should create a new comment', async () => {
      const mutation = `
        mutation {
          createComment(
            postId: "${postId}",
            content: "This is a test comment."
          ) {
            id
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

      expect(res.body.data.createComment).to.include({
        content: 'This is a test comment.',
      });

      expect(res.body.data.createComment.author).to.include({
        name: 'Test User',
      });

      commentId = res.body.data.createComment.id;
    });

    it('should fetch comments', async () => {
      const query = `
        query {
          comments {
            id
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

      expect(res.body.data.comments).to.be.an('array').that.is.not.empty;
    });

    it('should update a comment', async () => {
      const mutation = `
        mutation {
          updateComment(
            id: "${commentId}",
            content: "Updated comment content."
          ) {
            id
            content
          }
        }
      `;

      const res = await request(httpServer)
        .post('/graphql')
        .set('Authorization', token)
        .send({ query: mutation });

      expect(res.body.data.updateComment).to.include({
        content: 'Updated comment content.',
      });
    });

    it('should delete a comment', async () => {
      const mutation = `
        mutation {
          deleteComment(id: "${commentId}") {
            id
            content
          }
        }
      `;

      const res = await request(httpServer)
        .post('/graphql')
        .set('Authorization', token)
        .send({ query: mutation });

      expect(res.body.data.deleteComment).to.include({
        id: commentId,
        content: 'Updated comment content.',
      });
    });
  });
});
