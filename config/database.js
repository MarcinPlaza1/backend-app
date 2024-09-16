const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    logger.info('Połączono z MongoDB');
  } catch (err) {
    logger.error('Błąd połączenia z MongoDB', err);
    process.exit(1);
  }
};

module.exports = connectMongoDB;
