// config/env.js
// Hosts per environment. Switch with TEST_ENV=testing|production.
// Optional overrides: ADMIN_BASE_URL, VENDOR_URL, CLIENT_URL.

require('./loadEnv');

const ENV = process.env.TEST_ENV || 'testing';

const config = {
  testing: {
    admin: 'https://app.aecplayhouse.com',
    vendor: 'https://vendor.aecplayhouse.com/auth/signIn',
    /** Customer Portal (OTP) — staging */
    client: 'https://staging-bac9-intoaec1.wpcomstaging.com/cutomer-portal/',
  },
  production: {
    admin: 'https://app.intoaec.ai',
    vendor: 'https://vendor.intoaec.ai/',
    client: 'https://app.intoaec.ai',
  },
};

const selected = config[ENV] || config.testing;

function fromEnv(key, fallback) {
  const raw = process.env[key];
  return raw && String(raw).trim() ? String(raw).trim() : fallback;
}

module.exports = {
  name: ENV,
  admin: fromEnv('ADMIN_BASE_URL', selected.admin),
  vendor: fromEnv('VENDOR_URL', selected.vendor),
  client: fromEnv('CLIENT_URL', selected.client),
};
