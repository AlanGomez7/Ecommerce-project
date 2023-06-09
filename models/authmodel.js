const Joi = require("joi");

const LoginAuthSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).required(),
});

const SignupSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  username : Joi.string().required(),
  password: Joi.string().min(8).required(),
  mobile:Joi.string().length(10).required(),
  isAllowed: Joi.bool().required
})

const updatePasswordSchema = Joi.object({
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.any().valid(Joi.ref('password')).required()
})

module.exports = {
  LoginAuthSchema,
  SignupSchema,
  updatePasswordSchema
};
