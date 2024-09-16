const Joi = require('joi');

const commentValidationSchema = Joi.object({
  content: Joi.string().min(1).required(),
});

module.exports = commentValidationSchema;
