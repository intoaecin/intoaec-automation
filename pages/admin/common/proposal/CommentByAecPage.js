const CommentByLeadPage = require('./CommentByLeadPage');
const { expect } = require('@playwright/test');

const AEC_REPLY_TEXT = 'AEC Team Automation Review Reply';

class CommentByAecPage extends CommentByLeadPage {
    constructor(page) {
        super(page);
        this.aecReplyText = AEC_REPLY_TEXT;
        this.aecPreviewPage = null;
        this.clientPreviewPage = null;
    }

    async openCRMProposalPreviewViewer() {
        await this.page.bringToFront();

        // Locate the array of 'View Proposal' buttons.
        const viewProposalBtnGroup = this.page.locator('button[aria-label="View Proposal"]')
            .or(this.page.locator('button:has(svg path[d^="M4.625"])'));

        // Filter strictly for the visible instance, dropping invisible clones
        const activeViewBtn = viewProposalBtnGroup.filter({ visible: true }).first();
        await expect(viewProposalBtnGroup.first()).toBeAttached({ timeout: 60000 });

        // The CRM can open the preview in a new tab or in the same tab.
        const newPagePromise = this.page.context().waitForEvent('page', { timeout: 4000 }).catch(() => null);
        if (await activeViewBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
            await activeViewBtn.click({ force: true });
        } else {
            await viewProposalBtnGroup.first().click({ force: true });
        }
        const aecPreview = await newPagePromise;
        if (aecPreview) {
            await aecPreview.waitForLoadState('load');
        }
        this.aecPreviewPage = aecPreview || this.page;
    }

    async addAECReplyAndSave() {
        const page = this.aecPreviewPage || this.page;

        // 1. Click on the Comment Icon to enter Comment Mode on the AEC side
        const commentIcon = page.getByRole('button', { name: /show comments/i })
           .or(page.locator('button[aria-label="Show comments"]')).first();
        await expect(commentIcon).toBeVisible({ timeout: 30000 });
        await commentIcon.click({ force: true });

        // 2. Click on the Lead's comment/pin to expand the thread and reveal the Reply box
        const leadCommentText = page.getByText(this.leadSuggestionPrefix).first();
        if (await leadCommentText.isVisible({ timeout: 10000 }).catch(() => false)) {
             await leadCommentText.click({ force: true });
        } else {
             // Fallback: Click the pin dot or absolute box
             const pinIcon = page.locator('.commentNotifier, [data-testid="comment-pin"]').first();
             await pinIcon.click({ force: true }).catch(() => {});
        }

        // Wait for the native Reply input
        const replyInput = page.getByPlaceholder(/Reply/i).first();
        await expect(replyInput).toBeVisible({ timeout: 15000 });

        await replyInput.click({ force: true }).catch(() => {});
        await replyInput.fill(this.aecReplyText, { force: true });

        // Isolate the matching SendIcon save button explicitly contained inside that exact reply input box wrapper
        const sendBtn = replyInput.locator('xpath=./ancestor::div[contains(@class, "MuiInputBase-root")]')
             .locator('button').filter({ has: page.locator('svg[data-testid="SendIcon"]') }).first();

        await expect(sendBtn).toBeEnabled({ timeout: 5000 });
        await sendBtn.click({ force: true });
        await expect(page.getByText(this.aecReplyText).first()).toBeVisible({ timeout: 15000 });

        // Click Save Comments in the header of the AEC modal
        const saveCommentsBtn = page.getByRole('button', { name: /save comments/i })
            .or(page.locator('button').filter({ hasText: /Save Comments/i }))
            .first();

        await expect(saveCommentsBtn).toBeVisible({ timeout: 5000 });
        await expect(saveCommentsBtn).toBeEnabled({ timeout: 15000 });
        const commentsSaved = this.waitForCommentsSaved(page);
        await saveCommentsBtn.click({ force: true });
        await this.expectCommentsSaved(commentsSaved);

        if (page !== this.page) {
            await page.close();
        }
        this.aecPreviewPage = null;
        await this.page.bringToFront();
    }

    /** The reply notification links to the same proposal, so it is the next mail after the original proposal email. */
    async checkYopmailForAecReply() {
        if (!this.yopmailPage || this.yopmailPage.isClosed()) {
            await this.openYopmailForProposal();
        }
        await this.yopmailPage.bringToFront();

        const { link } = await this.waitForMailLinkingToProposal({
            excludeMailIds: this.proposalMailId ? [this.proposalMailId] : [],
            description: 'AEC reply notification email',
        });
        this.clientPreviewPage = await this.openProposalLinkFromOpenMail(link);
    }

    async assertAECReplyVisibleInClient() {
        const preview = this.clientPreviewPage;

        // Toggle Comment Mode active in the client's preview
        const commentIcon = preview.getByRole('button', { name: /show comments/i })
           .or(preview.locator('button[aria-label="Show comments"]')).first();
        await expect(commentIcon).toBeVisible({ timeout: 15000 });
        await commentIcon.click();

        // Dismiss "How it works" popup aggressively for the second iteration via Escape
        await preview.keyboard.press('Escape');

        // Click the pin to open the thread
        const pinIcon = preview.locator('.commentNotifier, [data-testid="comment-pin"], .comment-pin').first()
           .or(preview.getByText(this.leadSuggestionPrefix).first());
        await pinIcon.click({ force: true }).catch(() => {});

        // Wait and confirm the AEC reply text renders natively on the Client's viewport
        const replyText = preview.getByText(new RegExp(this.aecReplyText, 'i')).first();
        await expect(replyText).toBeVisible({ timeout: 15000 });
    }

    async closeExternalTabs() {
        for (const tab of [this.aecPreviewPage, this.clientPreviewPage]) {
            if (tab && tab !== this.page && !tab.isClosed()) {
                await tab.close().catch(() => {});
            }
        }
        this.aecPreviewPage = null;
        this.clientPreviewPage = null;
        await super.closeExternalTabs();
    }
}

module.exports = CommentByAecPage;
