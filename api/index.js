if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app = require('../src/app');

module.exports = app;
