// config/express.js
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

  // Zastosowanie middleware'ów
  app.use(rateLimiter);
  app.use(configureHelmet());
  app.use(corsConfig);
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));

  // Opcjonalnie: Możesz dodać więcej middleware'ów tutaj, np. parsowanie JSON
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Możesz dodać statyczne pliki lub inne middleware'y w razie potrzeby
  // app.use(express.static('public'));

  return app;
};

module.exports = configureExpress;
