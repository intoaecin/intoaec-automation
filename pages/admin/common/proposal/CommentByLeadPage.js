const { expect } = require('@playwright/test');
const AcceptedProposalPage = require('./AcceptedProposalPage');

class CommentByLeadPage extends AcceptedProposalPage {
  constructor(page) {
    super(page);
    this.commentedStatusText = page.getByText(/lead commented/i).first();
  }

  async addCommentsToProposal() {
    const page = this.proposalPreviewPage;

    // 1. Click on the Comment Icon
    const commentIcon = page.getByRole('button', { name: /show comments/i })
       .or(page.locator('button[aria-label="Show comments"]')).first();
    await expect(commentIcon).toBeVisible({ timeout: 15000 });
    await commentIcon.click();
    await page.waitForTimeout(1500);

    // 1.5 Handle the "How it Works" tutorial modal popup that intercepts the UI
    // The Scribe tutorial can take several seconds to load over the network.
    // We run a high-frequency polling loop for 15 seconds to intercept it as soon as it renders.
    for (let attempts = 0; attempts < 30; attempts++) {
        let actionTaken = false;

        // Try Closing via the main DOM 'X' icon explicitly provided by user
        const modalCloseBtn = page.locator('button:has(svg path[d^="M18.3862"])').first();
        if (await modalCloseBtn.isVisible({ timeout: 100 }).catch(() => false)) {
            await modalCloseBtn.click({ force: true }).catch(() => {});
            actionTaken = true;
        }

        // Try Next/Finish globally in the page OR inside an iframe (Scribe usually uses iframes)
        const frameLocators = [page, page.frameLocator('iframe').first()];
        for (const frame of frameLocators) {
            const finishBtn = frame.locator('button').filter({ hasText: /Finish|Done/i }).first();
            if (await finishBtn.isVisible({ timeout: 100 }).catch(() => false)) {
                await finishBtn.click({ force: true }).catch(() => {});
                actionTaken = true;
                break;
            }

            const nextBtn = frame.locator('button').filter({ hasText: /^Next$/i }).first();
            if (await nextBtn.isVisible({ timeout: 100 }).catch(() => false)) {
                await nextBtn.click({ force: true }).catch(() => {});
                actionTaken = true;
                break;
            }
        }

        // If we successfully clicked a tutorial button, let the animation resolve
        if (actionTaken) {
            await page.waitForTimeout(600);
            continue; // Re-evaluate if more Next clicks are needed
        }

        // Wait before next scan. Also break entirely if it's already cleared the screen.
        await page.waitForTimeout(500);
        const howItWorksHeaderCheck = page.getByText(/How it Works/i).first();
        if (!(await howItWorksHeaderCheck.isVisible({ timeout: 100 }).catch(() => false))) {
            // Once the text disappears or if it hasn't appeared yet, we don't break immediately
            // because it might just be loading. We only break early if we are SURE.
            // But we will just let it loop to exhaust the wait. Actually, let's just let it loop 30 times (15s total max delay)
        }
    }
    
    // Safety buffer after tutorial logic completes
    await page.waitForTimeout(1000);

    // 2. Hover the specific content block to manifest its specific "Add Suggestions" button
    // Proposals can be SlateJS documents with multiple blocks instead of a single canvas.
    const addSuggestionBtn = page.locator('button').filter({ hasText: /Add Suggestions/i }).first()
        .or(page.getByRole('button', { name: /add suggestions/i }).first());
        
    // Navigate up to the containing overlay block and hover it to trigger the CSS hover state
    const parentBlock = addSuggestionBtn.locator('xpath=./ancestor::div[contains(@style, "position: absolute") or contains(@class, "MuiBox-root")]').first()
        .or(addSuggestionBtn.locator('..').locator('..'));
        
    await parentBlock.hover({ force: true }).catch(() => {});
    await page.waitForTimeout(1000); // Allow React hover states and opacity transitions to render

    // 3. Force click the "Add Suggestions" button
    // Bypassing toBeVisible() strict assertion because CSS opacity transitions can trick Playwright
    await addSuggestionBtn.click({ force: true }).catch(async () => {
         // Fallback coordinates click if DOM intercepts it
         const box = await addSuggestionBtn.boundingBox();
         if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    });
    
    await page.waitForTimeout(1000);

    // 4. Fill the spawned text box (Bypassing MUI hidden textarea intercepts)
    const suggestionInput = page.getByPlaceholder(/Enter your Text/i)
        .or(page.locator('textarea').last())
        .first(); // Guard against multiple shadow textareas
        
    await expect(suggestionInput).toBeVisible({ timeout: 10000 });
    await suggestionInput.click({ force: true }).catch(() => {});
    await suggestionInput.fill('This is a suggestion left by the automation bot to test the LEAD COMMENTED workflow.', { force: true });

    // 5. Click the green "Save" button in the popup
    // Must NOT overlap "Save Comments" button in the header. Chaining .first() at the end prevents strict mode crash.
    const saveSuggestionBtn = page.locator('button.btnSuccessUI').filter({ hasText: /^Save\b/i })
        .or(page.getByRole('button', { name: /^Save$/ }))
        .first();
        
    await expect(saveSuggestionBtn).toBeVisible({ timeout: 5000 });
    await saveSuggestionBtn.click({ force: true });
    
    await page.waitForTimeout(1500); // Allow popup to commit the API request and unmount

    // 5. Click "Save Comments" in the header
    const saveCommentsBtn = page.getByRole('button', { name: /save comments/i })
        .or(page.locator('button').filter({ hasText: /save comments/i })).first();
    await expect(saveCommentsBtn).toBeVisible({ timeout: 10000 });
    await saveCommentsBtn.click();
    
    // Let the network request resolve
    await page.waitForTimeout(3000);

    // 6. Exit the comments
    // Closing the preview popup window gracefully
    await page.close().catch(() => {});
  }

  async verifyLeadCommentedStatus() {
    await this.page.bringToFront();
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.proposalPage.verifyProposalTabLoaded();
    await expect(this.commentedStatusText).toBeVisible({ timeout: this.defaultTimeout });
  }
}

module.exports = CommentByLeadPage;
