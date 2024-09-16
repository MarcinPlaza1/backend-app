const { ApolloError } = require('apollo-server-express');

const validateInput = (schema, args) => {
  const { error } = schema.validate(args);
  if (error) {
    throw new ApolloError(error.details[0].message, 'VALIDATION_ERROR');
  }
};

module.exports = validateInput;
