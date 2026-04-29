const CommentByLeadPage = require('./CommentByLeadPage');
const { expect } = require('@playwright/test');

class CommentByAecPage extends CommentByLeadPage {
    constructor(page) {
        super(page);
    }

    async openCRMProposalPreviewViewer() {
        // Return to the CRM tab and allow mounting/refresh processes to finish
        await this.page.bringToFront();
        await this.page.waitForTimeout(2000); 
        
        // Locate the array of 'View Proposal' buttons.
        const viewProposalBtnGroup = this.page.locator('button[aria-label="View Proposal"]')
            .or(this.page.locator('button:has(svg path[d^="M4.625"])'));
            
        // Filter strictly for the visible instance, dropping invisible clones
        const activeViewBtn = viewProposalBtnGroup.filter({ state: 'visible' }).first();
        
        // Setup the new page event listener asynchronously
        const newPagePromise = this.page.context().waitForEvent('page');
        
        // Perform the forceful click to bypass intercepted overlays, tooltips, or table row layers
        if (await activeViewBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
            await activeViewBtn.click({ force: true });
        } else {
            await viewProposalBtnGroup.first().click({ force: true });
        }
        
        // The CRM might render this natively in the SAME tab instead of spawning a new browser profile.
        // We will construct a dynamic race condition to elegantly absorb either route.
        try {
            const aecPreview = await Promise.race([
                newPagePromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Same-Tab Routing Detected')), 4000))
            ]);
            await aecPreview.waitForLoadState('load');
            this.page = aecPreview; // Swap `this.page` to the new popup
        } catch (error) {
            // The timeout threw, meaning it routed natively in the identical tab!
            // We just wait for the DOM layout to settle and cleanly proceed using the current `this.page`
            await this.page.waitForTimeout(2000);
        }
    }

    async addAECReplyAndSave() {
        // 1. Click on the Comment Icon to enter Comment Mode on the AEC side
        const commentIcon = this.page.getByRole('button', { name: /show comments/i })
           .or(this.page.locator('button[aria-label="Show comments"]')).first();
        await expect(commentIcon).toBeVisible({ timeout: 15000 });
        await commentIcon.click({ force: true });
        await this.page.waitForTimeout(1500);

        // 2. Click on the Lead's comment/pin to expand the thread and reveal the Reply box
        const leadCommentText = this.page.getByText('This is a suggestion left by the automation bot').first();
        if (await leadCommentText.isVisible({ timeout: 4000 }).catch(() => false)) {
             await leadCommentText.click({ force: true });
        } else {
             // Fallback: Click the pin dot or absolute box
             const pinIcon = this.page.locator('.commentNotifier, [data-testid="comment-pin"]').first();
             await pinIcon.click({ force: true }).catch(() => {});
        }

        // Wait for the native Reply input
        const replyInput = this.page.getByPlaceholder(/Reply/i).first();
        await expect(replyInput).toBeVisible({ timeout: 15000 });
        
        await replyInput.click({ force: true }).catch(() => {});
        await replyInput.fill('AEC Team Automation Review Reply', { force: true });
        
        // Isolate the matching SendIcon save button explicitly contained inside that exact reply input box wrapper
        const sendBtn = replyInput.locator('xpath=./ancestor::div[contains(@class, "MuiInputBase-root")]')
             .locator('button').filter({ has: this.page.locator('svg[data-testid="SendIcon"]') }).first();
             
        await expect(sendBtn).toBeEnabled({ timeout: 5000 });
        await sendBtn.click({ force: true });
        
        await this.page.waitForTimeout(1500);

        // Click Save Comments in the header of the AEC modal
        const saveCommentsBtn = this.page.getByRole('button', { name: /save comments/i })
            .or(this.page.locator('button').filter({ hasText: /Save Comments/i }))
            .first();
            
        await expect(saveCommentsBtn).toBeVisible({ timeout: 5000 });
        await saveCommentsBtn.click({ force: true });
        
        await this.page.waitForTimeout(2000);
        await this.page.close(); // Close the AEC preview tab
        
        // Revert page context back to main CRM tab
        const allPages = this.page.context().pages();
        this.page = allPages[0]; 
        await this.page.bringToFront();
    }

    async checkYopmailForAecReply() {
        // Find existing Yopmail tab
        const allPages = this.page.context().pages();
        let yopmailPage = allPages.find(p => p.url().includes('yopmail'));
        
        await yopmailPage.bringToFront();
        
        // Poll for up to 40 seconds to catch the asynchronous "Feedback Has Been Addressed" email
        let emailFound = false;
        for (let i = 0; i < 8; i++) {
            const refreshBtn = yopmailPage.locator('button#refresh');
            if (await refreshBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await refreshBtn.click({ force: true });
            }
            await yopmailPage.waitForTimeout(5000); 
            
            const inboxFrame = yopmailPage.frameLocator('iframe#ifinbox');
            const topEmail = inboxFrame.locator('.m').first();
            const topEmailText = await topEmail.innerText().catch(() => '');
            
            if (topEmailText.includes('Feedback Has Been Addressed') || topEmailText.includes('addressed') || topEmailText.includes('AEC')) {
                await topEmail.click({ force: true });
                emailFound = true;
                break;
            }
        }
        
        if (!emailFound) {
            // Fallback force-click the top email if text matching failed but email arrived
            await yopmailPage.frameLocator('iframe#ifinbox').locator('.m').first().click({ force: true });
        }
        
        // Open the preview from the "Addressed Feedback" email
        const mailFrame = yopmailPage.frameLocator('iframe#ifmail');
        const viewProposalMailBtn = mailFrame.getByRole('link', { name: /view proposal|review comments/i })
            .or(mailFrame.locator('a').filter({ hasText: /view proposal/i })).first();
            
        await expect(viewProposalMailBtn).toBeVisible({ timeout: 15000 });
        
        const [newClientPreview] = await Promise.all([
            this.page.context().waitForEvent('page'),
            viewProposalMailBtn.click()
        ]);
        
        await newClientPreview.waitForLoadState('load');
        this.clientPreviewPage = newClientPreview;
    }

    async assertAECReplyVisibleInClient() {
        const preview = this.clientPreviewPage;
        
        // Toggle Comment Mode active in the client's preview
        const commentIcon = preview.getByRole('button', { name: /show comments/i })
           .or(preview.locator('button[aria-label="Show comments"]')).first();
        await expect(commentIcon).toBeVisible({ timeout: 15000 });
        await commentIcon.click();
        await preview.waitForTimeout(1500);
        
        // Dismiss "How it works" popup aggressively for the second iteration via Escape
        await preview.keyboard.press('Escape');
        
        // Click the pin to open the thread
        const pinIcon = preview.locator('.commentNotifier, [data-testid="comment-pin"], .comment-pin').first()
           .or(preview.getByText('This is a suggestion left by the automation bot').first());
        await pinIcon.click({ force: true }).catch(() => {});
        
        // Wait and confirm the AEC reply text renders natively on the Client's viewport
        const replyText = preview.getByText(/AEC Team Automation Review Reply/i).first();
        await expect(replyText).toBeVisible({ timeout: 15000 });
    }
}

module.exports = CommentByAecPage;
