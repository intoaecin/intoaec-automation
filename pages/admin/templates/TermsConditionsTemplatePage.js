const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const env = require('../../../config/env');

const LIST_PATH = '/template-center/terms-and-condition';

class TermsConditionsTemplatePage extends BasePage {
    constructor(page) {
        super(page);
        this.defaultTimeout = 60000;
        this.uiTimeout = 20000;

        this.templatesNav = page.getByRole('button', { name: /^templates$/i }).first();
        this.termsAndConditionsMenuItem = page
            .getByRole('menuitem', { name: /^terms and conditions$/i })
            .or(page.getByText(/^terms and conditions$/i))
            .first();
        // While the list loads, an empty-state "Create Template" CTA can render next to the header button.
        this.createTemplateButton = page
            .getByRole('button', { name: /^create template$/i })
            .filter({ visible: true })
            .first();
        this.templateListReady = page
            .getByRole('row')
            .nth(1)
            .or(page.getByText(/no data found|no templates/i))
            .first();
        this.listSearchButton = page.getByRole('button', { name: /^search$/i });
        this.listSearchInput = page.getByPlaceholder(/search/i).first();

        this.templateNameInput = page.getByPlaceholder(/^enter your template name$/i);
        this.categoryInput = page.getByPlaceholder(/^select category$/i);
        this.contentEditor = page.locator('[contenteditable="true"]').first();
        this.saveButton = page.getByRole('button', { name: /^save$/i });

        // A persistent role="alert" element reads "IntoAEC" — only match real result toasts.
        this.resultToast = page
            .locator('.Toastify__toast, [role="alert"], .MuiSnackbar-root, .MuiAlert-root')
            .filter({ hasText: /successfully|error|failed|invalid|already exists|required/i })
            .first();

        this.lastCreatedTemplate = { name: '', category: '', content: '' };
        this.lastResultToastMessage = '';
    }

    logStep(msg) {
        console.log(`[T&C Template] ${msg}`);
    }

    async waitForNetworkSettled() {
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    }

    async navigateToTemplates() {
        await expect(this.templatesNav).toBeVisible({ timeout: this.defaultTimeout });
        await this.templatesNav.click({ timeout: this.uiTimeout });
        await expect(this.termsAndConditionsMenuItem).toBeVisible({ timeout: this.uiTimeout });
        this.logStep('Opened Templates menu');
    }

    async selectTermsAndConditions() {
        try {
            await this.termsAndConditionsMenuItem.click({ timeout: this.uiTimeout });
            await this.page.waitForURL(/\/template-center\/terms-and-condition/i, { timeout: this.uiTimeout });
        } catch (error) {
            this.logStep(`Templates menu navigation failed (${error.message.split('\n')[0]}) — opening ${LIST_PATH} directly`);
            await this.page.goto(new URL(LIST_PATH, env.admin).toString(), {
                waitUntil: 'domcontentloaded',
                timeout: this.defaultTimeout,
            });
        }
        await this.waitForNetworkSettled();
        await expect(this.templateListReady).toBeVisible({ timeout: this.defaultTimeout });
        await expect(this.createTemplateButton).toBeVisible({ timeout: this.defaultTimeout });
        this.logStep(`Selected Terms and Conditions templates (${this.page.url()})`);
    }

    async clickCreateTemplate() {
        await expect(this.createTemplateButton).toBeVisible({ timeout: this.defaultTimeout });
        await this.createTemplateButton.click({ timeout: this.uiTimeout });
        await this.page.waitForURL(/\/terms-and-condition\/create/i, { timeout: this.defaultTimeout });
        await expect(this.templateNameInput).toBeVisible({ timeout: this.defaultTimeout });
        this.logStep('Clicked Create Template');
    }

    async enterSampleTemplateName(baseName = 'Payment Terms') {
        const name = `${String(baseName).trim()} ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        await expect(this.templateNameInput).toBeVisible({ timeout: this.uiTimeout });
        await this.templateNameInput.fill(name);
        await expect(this.templateNameInput).toHaveValue(name, { timeout: this.uiTimeout });
        this.lastCreatedTemplate = { ...this.lastCreatedTemplate, name };
        this.logStep(`Entered Template Name "${name}"`);
    }

    async selectAnyCategory() {
        await expect(this.categoryInput).toBeVisible({ timeout: this.uiTimeout });
        await this.categoryInput.click({ timeout: this.uiTimeout });
        const options = this.page.getByRole('option');
        await expect(options.first()).toBeVisible({ timeout: this.uiTimeout });
        const labels = (await options.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
        const category = labels[Math.floor(Math.random() * labels.length)];
        await options.filter({ hasText: new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click({
            timeout: this.uiTimeout,
        });
        await expect(this.categoryInput).toHaveValue(category, { timeout: this.uiTimeout });
        this.lastCreatedTemplate = { ...this.lastCreatedTemplate, category };
        this.logStep(`Selected Category "${category}"`);
    }

    async enterTermsContent(
        content = 'All payments must be made within 30 days of the invoice date. Late payments may incur a 2% monthly fee.'
    ) {
        await expect(this.contentEditor).toBeVisible({ timeout: this.uiTimeout });
        await this.contentEditor.click({ timeout: this.uiTimeout });
        await this.page.keyboard.type(content);
        await expect(this.contentEditor).toContainText(content, { timeout: this.uiTimeout });
        this.lastCreatedTemplate = { ...this.lastCreatedTemplate, content };
        this.logStep('Entered Terms and Conditions content');
    }

    /**
     * Toasts auto-hide in ~2-3s — shorter than the headed AfterStep delay — so start listening
     * before Save and keep the text for the verification step.
     */
    async saveTemplate() {
        await expect(this.saveButton).toBeEnabled({ timeout: this.uiTimeout });
        this.lastResultToastMessage = '';
        const capture = this.resultToast
            .waitFor({ state: 'visible', timeout: this.defaultTimeout })
            .then(async () => ((await this.resultToast.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim())
            .catch(() => '');
        await this.saveButton.click({ timeout: this.uiTimeout });
        this.lastResultToastMessage = await capture;
        await this.page.waitForURL((url) => !/\/create/i.test(url.pathname), { timeout: this.defaultTimeout });
        await this.waitForNetworkSettled();
        this.logStep(`Saved template${this.lastResultToastMessage ? ` — toast "${this.lastResultToastMessage}"` : ''}`);
    }

    _templateRow(name) {
        return this.page
            .getByRole('row')
            .filter({ has: this.page.getByLabel(name, { exact: true }).or(this.page.getByText(name, { exact: true })) })
            .first();
    }

    async expectTemplateCreated() {
        expect(this.lastResultToastMessage).toMatch(/terms and conditions (created|added|saved) successfully/i);
        const { name, category } = this.lastCreatedTemplate;
        await expect(this.createTemplateButton).toBeVisible({ timeout: this.defaultTimeout });
        const row = this._templateRow(name);
        if (!(await row.isVisible({ timeout: 5000 }).catch(() => false))) {
            if (!(await this.listSearchInput.isVisible({ timeout: 1000 }).catch(() => false))) {
                await this.listSearchButton.click({ timeout: this.uiTimeout });
            }
            await this.listSearchInput.fill(name);
            await this.waitForNetworkSettled();
        }
        await expect(row).toBeVisible({ timeout: this.defaultTimeout });
        await expect(row.getByText(category, { exact: true })).toBeVisible({ timeout: this.uiTimeout });
        this.logStep(`Verified template "${name}" (${category}) created — toast "${this.lastResultToastMessage}"`);
    }
}

module.exports = TermsConditionsTemplatePage;
