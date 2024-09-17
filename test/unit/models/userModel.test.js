// test/unit/models/userModel.test.js
import { expect } from 'chai';
import UserModel from '../../../models/User.js';
import mongoose from 'mongoose';

describe('User Model', () => {
  before(async () => {
    await mongoose.connect('mongodb://localhost:27017/graphql-backend-test');
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it('should hash password before saving', async () => {
    const user = new UserModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    await user.save();
    expect(user.password).to.not.equal('password123');
    expect(user.password).to.have.length.above(0);
  });

  it('should not save user without required fields', async () => {
    const user = new UserModel({
      email: 'john@example.com',
    });

    try {
      await user.save();
    } catch (err) {
      expect(err).to.exist;
      expect(err.errors).to.have.property('name');
      expect(err.errors).to.have.property('password');
    }
  });
});
