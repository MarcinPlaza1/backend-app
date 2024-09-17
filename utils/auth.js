import { ApolloError } from 'apollo-server-express';

export const checkAuth = (user) => {
  if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');
};

export const checkPermissions = (user, resourceAuthorId, role = 'user') => {
  if (user.id !== resourceAuthorId.toString() && user.role !== 'admin') {
    throw new ApolloError('Brak uprawnień', 'FORBIDDEN');
  }
};