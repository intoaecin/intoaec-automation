// config/env.js
// Change ENV to switch between testing and production

const ENV = process.env.TEST_ENV || 'testing'; // default = testing

const config = {
  testing: {
    admin:  'https://app.aecplayhouse.com',
    vendor: 'https://vendor.aecplayhouse.com/auth/signIn',
    client: 'https://staging-bac9-intoaec1.wpcomstaging.com/cutomer-portal/'
  },
  production: {
    admin:  'https://app.intoaec.ai',
    vendor: 'https://vendor.intoaec.ai/',
    client: 'https://app.intoaec.ai'
  }
};

module.exports = config[ENV];