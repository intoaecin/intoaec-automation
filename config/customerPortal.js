/**
 * Customer Portal base URL (staging OTP login).
 * @see https://staging-bac9-intoaec1.wpcomstaging.com/cutomer-portal/
 */
const env = require('../config/env');

const CUSTOMER_PORTAL_STAGING = 'https://staging-bac9-intoaec1.wpcomstaging.com/cutomer-portal/';

function getCustomerPortalUrl() {
  const raw =
    process.env.CUSTOMER_PORTAL_URL ||
    process.env.CUSTOMER_PORTAL_OTP_URL ||
    env.client ||
    CUSTOMER_PORTAL_STAGING;
  return String(raw).trim().replace(/\/?$/, '/');
}

function getCustomerPortalOrigin() {
  return new URL(getCustomerPortalUrl()).origin;
}

module.exports = {
  CUSTOMER_PORTAL_STAGING,
  getCustomerPortalUrl,
  getCustomerPortalOrigin,
};
