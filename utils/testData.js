// utils/testData.js
const testData = {
  admin: {
    validUser:   { email: 'aadhi@yopmail.com', password: 'Simple@10' },
    // invalidUser: { email: 'wrong@gmail.com',       password: 'wrongpass' }
  },
  vendor: {
    validUser:   { email: 'testintoaec@gmail.com', password: 'Simple@10' },
    rfqUser: {
      email: 'bhavanimmm12345@yopmail.com',
      password: 'Simple@10',
      /** Connected org on vendor Procurement Hub; override with VENDOR_RFQ_ORG_NAME env. */
      organization: process.env.VENDOR_RFQ_ORG_NAME || 'AEC Solutions',
    },
    /** Goods Receipt PO accept inbox (Mailinator — preferred over flaky Yopmail). */
    goodsReceiptMailinator: {
      email:
        process.env.PO_VENDOR_MAILINATOR_EMAIL ||
        'bhavani123456@mailinator.com',
      searchHint: process.env.PO_VENDOR_MAILINATOR_SEARCH || 'Mailinator',
    },
  },
  client: {
    validUser:   { email: 'client@gmail.com',      password: 'Client@10' }
  }
};

module.exports = testData;
