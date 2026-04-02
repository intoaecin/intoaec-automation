const { Before, After, setDefaultTimeout } = require('@cucumber/cucumber');

setDefaultTimeout(30000);

Before(async function () {
  await this.init();
});

After(async function () {
  await this.cleanup();
});
