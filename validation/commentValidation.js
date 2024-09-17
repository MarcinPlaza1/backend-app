import Joi from 'joi';

const commentValidationSchema = Joi.object({
  content: Joi.string().min(1).required(),
});

export default commentValidationSchema;
