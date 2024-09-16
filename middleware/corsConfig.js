const cors = require('cors');

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:4000',
    'https://studio.apollographql.com'
  ],
  credentials: true,
};

module.exports = cors(corsOptions);
