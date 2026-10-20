// utils/testData.js
require('../config/loadEnv');

function fromEnv(name, fallback) {
  const value = process.env[name];
  return value && String(value).trim() ? String(value).trim() : fallback;
}

const testData = {
  admin: {
    validUser: {
      email: fromEnv('ADMIN_EMAIL', 'aadhi@yopmail.com'),
      password: fromEnv('ADMIN_PASSWORD', 'Simple@10'),
    },
    invalidUser: { email: 'wrong@gmail.com', password: 'wrongpass' },
  },
  vendor: {
    validUser: {
      email: fromEnv('VENDOR_EMAIL', 'testintoaec@gmail.com'),
      password: fromEnv('VENDOR_PASSWORD', 'Simple@10'),
    },
  },
  client: {
    validUser: {
      email: fromEnv('CLIENT_EMAIL', 'aadhi@yopmail.com'),
      password: fromEnv('CLIENT_PASSWORD', 'Simple@10'),
    },
  },
};

module.exports = testData;
