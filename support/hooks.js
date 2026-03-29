const { Before, After, setDefaultTimeout } = require('@cucumber/cucumber');

setDefaultTimeout(30000);

Before(async function () {
  await this.init();
});

After(async function (scenario) {
  if (scenario.result.status === 'FAILED') {
    await this.page.screenshot({
      path: `screenshots/${scenario.pickle.name}.png`
    });
  }
  await this.cleanup();
});