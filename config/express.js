const express = require('express');
const rateLimiter = require('../middleware/rateLimiter');
const configureHelmet = require('../middleware/helmetConfig');
const corsConfig = require('../middleware/corsConfig');
const morgan = require('morgan');
const logger = require('../utils/logger');

/**
 * Funkcja konfigurująca instancję Express.
 * @returns {Express.Application} - Skonfigurowana aplikacja Express.
 */
const configureExpress = () => {
  const app = express();

  app.use(rateLimiter);
  app.use(configureHelmet());
  app.use(corsConfig);
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  return app;
};

module.exports = configureExpress;
