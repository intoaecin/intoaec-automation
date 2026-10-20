const fs = require('fs');
const p = 'pages/admin/projects/procurement/InventoryRequestPage.js';
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('  async selectStatusOnRow(rowScope, status, index = 0) {');
const end = s.indexOf('  requestRowScope(index) {', start);
if (start < 0 || end < 0) {
  console.error('markers not found', start, end);
  process.exit(1);
}

const neu = `  async selectStatusOnRow(rowScope, status, index = 0) {
    const statusValue = String(status || 'Approved').trim() || 'Approved';

    // Status is an MUI Autocomplete combobox input (value="Pending Approval"), not plain text.
    const nameInput = this.page.locator('input[name="itemName"]').nth(index);
    if (!(await nameInput.isVisible({ timeout: 10000 }).catch(() => false))) {
      await this.logStep(\`Row \${index + 1}: itemName not visible — skip status "\${statusValue}"\`);
      return;
    }

    const row =
      rowScope && typeof rowScope.locator === 'function'
        ? rowScope
        : nameInput.locator('xpath=ancestor::*[.//input[@name="itemsQuantity"]][1]');

    let clickTarget = null;
    const rowCombos = row.locator('input[role="combobox"]');
    const rowComboCount = await rowCombos.count().catch(() => 0);
    for (let i = 0; i < rowComboCount; i++) {
      const c = rowCombos.nth(i);
      if (!(await c.isVisible({ timeout: 800 }).catch(() => false))) continue;
      const v = ((await c.inputValue().catch(() => '')) || '').trim();
      // Skip Unit Type values (Nos/Meter/Each). Keep Pending/Approved status fields.
      if (/^(meter|nos|each|kg|box)$/i.test(v)) continue;
      if (/pending|approved|reject|cancel/i.test(v) || v === '') {
        clickTarget = c;
        if (/pending|approved|reject/i.test(v)) break;
      }
    }

    if (!clickTarget) {
      const allCombos = this.page.locator('input[role="combobox"]');
      const n = await allCombos.count().catch(() => 0);
      const statusCombos = [];
      for (let i = 0; i < n; i++) {
        const c = allCombos.nth(i);
        if (!(await c.isVisible({ timeout: 300 }).catch(() => false))) continue;
        const v = ((await c.inputValue().catch(() => '')) || '').trim();
        if (/pending|approved|reject|cancel/i.test(v)) statusCombos.push(c);
      }
      if (statusCombos[index]) clickTarget = statusCombos[index];
      else if (rowComboCount >= 2) clickTarget = rowCombos.nth(rowComboCount - 1);
    }

    if (!clickTarget) {
      await this.logStep(\`Row \${index + 1}: status combobox not found — assuming "\${statusValue}"\`);
      return;
    }

    const shown = ((await clickTarget.inputValue().catch(() => '')) || '').replace(/\\s+/g, ' ').trim();
    if (new RegExp(\`^\\\\s*\${statusValue}\\\\s*$\`, 'i').test(shown)) {
      await this.logStep(\`Row \${index + 1}: status already "\${statusValue}"\`);
      return;
    }

    await clickTarget.click({ timeout: 10000 });
    await this.page.waitForTimeout(400);
    await clickTarget.fill('').catch(() => {});
    await clickTarget.fill(statusValue).catch(() => {});
    await this.page.waitForTimeout(400);

    const opt = this.page
      .getByRole('option', { name: new RegExp(\`^\\\\s*\${statusValue}\\\\s*$\`, 'i') })
      .or(
        this.page
          .locator('.MuiAutocomplete-listbox li, .MuiMenu-list li, [role="listbox"] [role="option"]')
          .filter({ hasText: new RegExp(\`^\\\\s*\${statusValue}\\\\s*$\`, 'i') })
      )
      .filter({ visible: true })
      .first();

    if (await opt.isVisible({ timeout: 5000 }).catch(() => false)) {
      await opt.click({ timeout: 10000 });
    } else {
      await this.page.keyboard.press('ArrowDown').catch(() => {});
      await this.page.keyboard.press('Enter').catch(() => {});
    }
    await this.page.waitForTimeout(300);

    const after = ((await clickTarget.inputValue().catch(() => '')) || '').trim();
    if (new RegExp(statusValue, 'i').test(after)) {
      await this.logStep(\`Row \${index + 1}: changed status Pending → "\${statusValue}" (now "\${after}")\`);
    } else {
      await this.logStep(
        \`Row \${index + 1}: WARN status still "\${after || shown}" after selecting "\${statusValue}"\`
      );
    }
  }

`;

s = s.slice(0, start) + neu + s.slice(end);
fs.writeFileSync(p, s);
console.log('updated selectStatusOnRow ok');
