// utils/testData.js
const testData = {
  admin: {
    validUser:   { email: 'aadhi@yopmail.com', password: 'Simple@10' },
    invalidUser: { email: 'wrong@gmail.com',   password: 'wrongpass' }
  },
  vendor: {
    validUser:   { email: 'aadhi@yopmail.com', password: 'Simple@10' }
  },
  client: {
    validUser:   { email: 'aadhi@yopmail.com', password: 'Simple@10' }
  }
};

module.exports = testData;
