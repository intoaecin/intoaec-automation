const { Before, After, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const fs = require('fs');
const path = require('path');
const { closeSharedSession } = require('./world');

setDefaultTimeout(30000);

Before(async function () {
  await this.init();
});

After(async function (scenario) {
  if (scenario.result.status === 'FAILED' && this.page) {
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    const safeName = scenario.pickle.name.replace(/[<>:"/\\|?*]+/g, '_');
    fs.mkdirSync(screenshotDir, { recursive: true });
    await this.page.screenshot({
      path: path.join(screenshotDir, `${safeName}.png`)
    });
  }
  await this.cleanup();
});

AfterAll(async function () {
  await closeSharedSession();
});
