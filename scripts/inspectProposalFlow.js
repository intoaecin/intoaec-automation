const { chromium } = require('playwright');
const testData = require('../utils/testData');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://app.aecplayhouse.com/auth/signIn');
    await page.locator('input').first().fill(testData.admin.validUser.email);
    await page.locator('input[type="password"]').fill(testData.admin.validUser.password);
    await page.locator('button:has-text("Login")').click();
    await page.waitForURL((url) => !url.toString().includes('signIn'), { timeout: 30000 });

    const projectsLink = page.getByLabel('Clients/Projects').first();
    await projectsLink.waitFor({ state: 'visible', timeout: 30000 });
    await projectsLink.click();
    await page.waitForTimeout(5000);

    const firstProject = page.getByRole('rowheader').first();
    await firstProject.waitFor({ state: 'visible', timeout: 30000 });
    await firstProject.click();
    await page.waitForTimeout(8000);

    const proposalMatches = await page.locator('text=/^Proposal$/').evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        const parent = node.parentElement;
        const grandParent = parent && parent.parentElement;

        return {
          tag: node.tagName,
          text: node.textContent && node.textContent.trim(),
          visible: rect.width > 0 && rect.height > 0,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          parentTag: parent && parent.tagName,
          parentClass: parent && parent.className,
          parentRole: parent && parent.getAttribute('role'),
          grandParentTag: grandParent && grandParent.tagName,
          grandParentClass: grandParent && grandParent.className,
          grandParentRole: grandParent && grandParent.getAttribute('role')
        };
      })
    );

    console.log('PROPOSAL_MATCHES:', JSON.stringify(proposalMatches, null, 2));

    const proposalCard = page.locator('p').filter({ hasText: /^Proposal$/ }).first();
    await proposalCard.click();
    await page.waitForTimeout(8000);

    await page.getByRole('button', { name: 'Choose Proposal' }).click();
    await page.waitForTimeout(8000);

    const comboboxes = await page.locator('[role="combobox"], input[role="combobox"], .MuiSelect-select, [aria-haspopup="listbox"]').evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          tag: node.tagName,
          text: node.textContent && node.textContent.trim(),
          ariaLabel: node.getAttribute('aria-label'),
          ariaLabelledBy: node.getAttribute('aria-labelledby'),
          visible: rect.width > 0 && rect.height > 0,
          className: node.className
        };
      })
    );
    console.log('COMBOBOXES:', JSON.stringify(comboboxes, null, 2));

    const chooseProposalCombo = page.locator('.MuiSelect-select').nth(1);
    await chooseProposalCombo.click();
    await page.waitForTimeout(3000);

    const listboxOptions = await page.locator('[role="option"], li[role="option"], .MuiMenuItem-root').evaluateAll((nodes) =>
      nodes.map((node) => ({
        text: node.textContent && node.textContent.trim(),
        ariaSelected: node.getAttribute('aria-selected'),
        role: node.getAttribute('role')
      }))
    );
    console.log('LISTBOX_OPTIONS:', JSON.stringify(listboxOptions, null, 2));

    await page.getByRole('option', { name: 'Modern Villa Design Proposal' }).click();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: 'Proceed' }).click();
    await page.waitForTimeout(8000);

    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(8000);

    await page.getByRole('button', { name: /skip/i }).click();
    await page.waitForTimeout(8000);

    await page.getByRole('button', { name: 'Send' }).click();
    await page.waitForTimeout(8000);

    const sendDialogControls = await page.locator('input, button, [role="button"], [role="radio"], label').evaluateAll((nodes) =>
      nodes
        .map((node) => ({
          tag: node.tagName,
          text: node.textContent && node.textContent.trim(),
          type: node.getAttribute('type'),
          role: node.getAttribute('role'),
          ariaLabel: node.getAttribute('aria-label'),
          value: node.getAttribute('value')
        }))
        .filter((item) => /email|sms|whatsapp|send/i.test(`${item.text} ${item.ariaLabel} ${item.value}`))
    );
    console.log('SEND_DIALOG_CONTROLS:', JSON.stringify(sendDialogControls, null, 2));

    await page.getByText(/^Email$/).click();
    await page.waitForTimeout(2000);
    const sendButtons = await page.getByRole('button', { name: 'Send' }).evaluateAll((nodes) =>
      nodes.map((node) => ({
        text: node.textContent && node.textContent.trim(),
        disabled: node.hasAttribute('disabled'),
        ariaDisabled: node.getAttribute('aria-disabled'),
        className: node.className
      }))
    );
    console.log('SEND_BUTTONS_AFTER_EMAIL:', JSON.stringify(sendButtons, null, 2));

    await page.getByRole('button', { name: 'Send' }).last().click({ force: true });
    await page.waitForTimeout(8000);

    await page.getByRole('button', { name: 'Send Email' }).click();
    await page.waitForTimeout(8000);

    const buttonTexts = await page.getByRole('button').allTextContents();
    const linkTexts = await page.getByRole('link').allTextContents();
    const proposalRelatedTexts = await page.locator('body *').evaluateAll((nodes) =>
      nodes
        .map((node) => node.innerText && node.innerText.trim())
        .filter(Boolean)
        .filter((text) => /proposal|design|estimate|client|project|choose|skip|preview|email|send/i.test(text))
        .slice(0, 300)
    );

    console.log('URL:', page.url());
    console.log('BUTTONS:', JSON.stringify(buttonTexts.slice(0, 150), null, 2));
    console.log('LINKS:', JSON.stringify(linkTexts.slice(0, 150), null, 2));
    console.log('MATCHING_TEXT:', JSON.stringify(proposalRelatedTexts, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
