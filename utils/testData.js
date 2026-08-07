// utils/testData.js
const testData = {
  admin: {
    validUser:   { email: 'testintoaec@gmail.com', password: 'Simple@10' },
    invalidUser: { email: 'wrong@gmail.com',       password: 'wrongpass' }
  },
  vendor: {
    validUser:   { email: 'vendor@gmail.com',      password: 'Vendor@10' }
  },
  client: {
    validUser:   { email: 'client@gmail.com',      password: 'Client@10' }
  }
};

module.exports = testData;