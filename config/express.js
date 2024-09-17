import express from 'express';
import rateLimiter from '../middleware/rateLimiter.js';
import configureHelmet from '../middleware/helmetConfig.js';
import corsConfig from '../middleware/corsConfig.js';
import morgan from 'morgan';
import logger from '../utils/logger.js';

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

export default configureExpress;
