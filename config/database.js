import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    logger.info('Połączono z MongoDB');
  } catch (err) {
    logger.error('Błąd połączenia z MongoDB', err);
    process.exit(1);
  }
};

export default connectMongoDB;
