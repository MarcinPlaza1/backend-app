// test/integration/user.test.js
import request from 'supertest';
import { expect } from 'chai';
import { app, httpServer } from '../setup.js';
import mongoose from 'mongoose';

describe('User Integration Tests', () => {
  before(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  after(async () => {
    httpServer.close();
  });

  describe('User Mutations', () => {
    it('should register a new user', async () => {
      const mutation = `
        mutation {
          register(
            name: "John Doe",
            email: "john@example.com",
            password: "password123"
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
        .send({ query: mutation });

      expect(res.body.data.register).to.have.property('token');
      expect(res.body.data.register.user).to.include({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should not register a user with existing email', async () => {
      const mutation = `
        mutation {
          register(
            name: "Jane Doe",
            email: "john@example.com",
            password: "password123"
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
        .send({ query: mutation });

      expect(res.body.errors).to.exist;
      expect(res.body.errors[0].message).to.equal('Email jest już w użyciu');
    });

    it('should login an existing user', async () => {
      const mutation = `
        mutation {
          login(
            email: "john@example.com",
            password: "password123"
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
        .send({ query: mutation });

      expect(res.body.data.login).to.have.property('token');
      expect(res.body.data.login.user).to.include({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should not login with wrong credentials', async () => {
      const mutation = `
        mutation {
          login(
            email: "john@example.com",
            password: "wrongpassword"
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
        .send({ query: mutation });

      expect(res.body.errors).to.exist;
      expect(res.body.errors[0].message).to.equal('Nieprawidłowe dane logowania');
    });
  });
});
