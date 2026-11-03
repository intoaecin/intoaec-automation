// config/loadEnv.js
// Loads intoaec-automation/.env into process.env (Node built-in, no dotenv dependency).

const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env');

if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
