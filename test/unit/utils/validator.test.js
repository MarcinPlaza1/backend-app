// test/unit/utils/validator.test.js
import { expect } from 'chai';
import validateInput from '../../../utils/validator.js';
import Joi from 'joi';
import { ApolloError } from 'apollo-server-express';

describe('validateInput', () => {
  const schema = Joi.object({
    name: Joi.string().required(),
  });

  it('should pass validation with correct data', () => {
    const args = { name: 'John' };
    expect(() => validateInput(schema, args)).to.not.throw();
  });

  it('should throw ApolloError when validation fails', () => {
    const args = { name: '' };
    expect(() => validateInput(schema, args)).to.throw(ApolloError);
  });
});
