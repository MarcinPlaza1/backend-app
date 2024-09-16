const { ApolloError } = require('apollo-server-express');

const checkAuth = (user) => {
  if (!user) throw new ApolloError('Nie jesteś zalogowany', 'UNAUTHENTICATED');
};

const checkPermissions = (user, resourceAuthorId, role = 'user') => {
  if (user.id !== resourceAuthorId.toString() && user.role !== 'admin') {
    throw new ApolloError('Brak uprawnień', 'FORBIDDEN');
  }
};

module.exports = {
  checkAuth,
  checkPermissions,
};
