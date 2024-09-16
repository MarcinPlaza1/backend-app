const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Za dużo zapytań z tego adresu IP, spróbuj ponownie później.',
  standardHeaders: true, 
  legacyHeaders: false,
});

module.exports = limiter;
