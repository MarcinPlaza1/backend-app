// validation/postValidation.js
const Joi = require('joi');

const postValidationSchema = Joi.object({
  title: Joi.string().min(3).required(),
  content: Joi.string().min(1).required(),
});

module.exports = postValidationSchema;
