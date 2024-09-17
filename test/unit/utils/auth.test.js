// test/unit/utils/auth.test.js
import { expect } from 'chai';
import { checkAuth, checkPermissions } from '../../../utils/auth.js';
import { ApolloError } from 'apollo-server-express';

describe('Auth Utils', () => {
  describe('checkAuth', () => {
    it('should not throw error if user is authenticated', () => {
      const user = { id: '123' };
      expect(() => checkAuth(user)).to.not.throw();
    });

    it('should throw ApolloError if user is not authenticated', () => {
      expect(() => checkAuth(null)).to.throw(ApolloError, 'Nie jesteś zalogowany');
    });
  });

  describe('checkPermissions', () => {
    it('should not throw error if user has permissions', () => {
      const user = { id: '123', role: 'user' };
      const resourceAuthorId = '123';
      expect(() => checkPermissions(user, resourceAuthorId)).to.not.throw();
    });

    it('should throw ApolloError if user lacks permissions', () => {
      const user = { id: '123', role: 'user' };
      const resourceAuthorId = '456';
      expect(() => checkPermissions(user, resourceAuthorId)).to.throw(ApolloError, 'Brak uprawnień');
    });

    it('should not throw error if user is admin', () => {
      const user = { id: '123', role: 'admin' };
      const resourceAuthorId = '456';
      expect(() => checkPermissions(user, resourceAuthorId)).to.not.throw();
    });
  });
});
