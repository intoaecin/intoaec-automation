const AcceptedProposalPage = require('./AcceptedProposalPage');
const { expect } = require('@playwright/test');

class EditProposalPage extends AcceptedProposalPage {
    constructor(page) {
        super(page);
    }

    async clickEditProposal() {
        // Allow CRM states to settle after previous send
        await this.page.waitForTimeout(3000); 

        // Leverage precise SVG mapping supplied by the user to evade cloned row elements
        const viewEditBtnGroup = this.page.locator('button[aria-label="Edit Proposal"]')
            .or(this.page.locator('button:has(svg path[d^="M3.50146"])'));
            
        // Filter strictly for the mathematically visible instance on the dynamic CRM table
        const activeEditBtn = viewEditBtnGroup.filter({ state: 'visible' }).first();
        
        await expect(activeEditBtn).toBeVisible({ timeout: 15000 });
        await activeEditBtn.click({ force: true });
        
        // Wait for the proposal builder / stepper UI to completely load
        // Sometimes React blocks for a few seconds resolving the template JSON
        await this.page.waitForTimeout(3000); 
    }

    async stepThroughEditBuilderAndSkip() {
        // 1. Edit the Title to organically register a mutation event for the revision bump!
        // Lock exactly onto the targeted text input, bypassing "Untitled" Slate headings
        const titleInput = this.page.getByPlaceholder(/proposal title/i)
            .or(this.page.getByRole('textbox', { name: /proposal title/i }))
            .or(this.page.locator('input[type="text"]'))
            .first();
            
        await expect(titleInput).toBeVisible({ timeout: 10000 });
        
        let rawCurrentValue = await titleInput.inputValue().catch(() => '');
        if (!rawCurrentValue || rawCurrentValue.trim() === '') rawCurrentValue = "Automated Rev";
        
        // Append edit flag to force CRM system to view it as explicitly modified
        await titleInput.fill(`${rawCurrentValue} (Edited)`, { force: true });
        await this.page.waitForTimeout(2000);

        // DELIBERATE OMISSION: We do NOT natively click 'Next' or 'Skip & Proceed' here!
        // The inherited `sendProposalViaEmail()` method called directly after this in the Cucumber 
        // framework internally maps to the native page handlers which cycle the UI Stepper, 
        // bypass the Template Dialog block with "Skip", and launch the exact Mail Composer UI seamlessly!
    }
    
    async verifyRevisionUpdated() {
        // Assert the revision updates in the table viewport
        await this.page.waitForTimeout(4000); // Buffer for complex datagrid network refreshes

        // Map directly onto the explicitly provided DOM layout for the Revision Toggle Button
        const revisionsClickable = this.page.locator('.revisions-clickable')
            .or(this.page.getByText(/Revision\(s\)/i)).first();
            
        await expect(revisionsClickable).toBeVisible({ timeout: 15000 });
        
        // Pre-validate the parent text inherently incremented to > 1
        const toggleText = await revisionsClickable.innerText();
        const baseCount = parseInt(toggleText.replace(/[^\d]/g, ''), 10);
        if (baseCount <= 1) {
             throw new Error(`Revision trigger badge failed to bump mathematically! Found sequence: ${toggleText}`);
        }
        
        // Launch the off-canvas proposal history drawer
        await revisionsClickable.click({ force: true });
        
        // Anchor the DOM onto the off-canvas sidebar overlay
        const offcanvas = this.page.locator('.offcanvas, .MuiDrawer-root, .MuiDrawer-paper, [role="dialog"]')
            .filter({ hasText: /Revision/i })
            .first();
            
        await expect(offcanvas).toBeVisible({ timeout: 15000 });
        
        // Sift down to the first generated proposal card in the overlay stack
        const firstRevisionCard = offcanvas.locator('.MuiCard-root, .proposal-card, [class*="card"], li, .MuiBox-root')
            .filter({ hasText: /Rev|V\d|\d/i })
            .first();
            
        await expect(firstRevisionCard).toBeVisible({ timeout: 10000 });
        const cardText = await firstRevisionCard.innerText();
        
        // Dynamically strip the numerical revision tag parsing formats like "Revision 2", "V 2.0", "Rev-2", etc.
        const match = cardText.match(/(?:Revision|Rev|V|Version)[^\d]*(\d+)/i) || cardText.match(/(\d+)/);
        const revisionNo = match ? parseInt(match[1], 10) : 0;
        
        if (revisionNo <= 1) {
            throw new Error(`The latest revision block displayed a dormant version trace of ${revisionNo}. Edit mutation sequence failed to propagate!`);
        }
        
        // Conclusive visual buffer signifying completion for the automated dashboard overlay
        await this.page.waitForTimeout(2000);
    }
}
module.exports = EditProposalPage;
