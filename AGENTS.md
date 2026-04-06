# Automation Agent Guidance

This repo uses **Cucumber.js** feature files + **Playwright** page objects.
When the AI agent adds or updates automation, it must keep logic in the right layer:

## File Responsibilities

1. **Feature files** (`.features/`)
   - Describe behavior in Gherkin.
   - Add/modify scenarios for specific flows (ex: `@estimate`).
   - Use existing step wording where possible.

2. **Step definitions** (`step-definitions/`)
   - Translate Gherkin steps into calls to a page object.
   - Do **not** add Playwright locators or UI waiting logic in step definitions.

3. **Page objects** (`pages/`)
   - Hold Playwright locators and UI interactions.
   - Implement `async` methods used by step definitions.

## Preferred Workflow for `@estimate` Scenarios

For scenarios tagged `@estimate` in `features/admin/projects/design/estimate/`:

1. Reuse the existing `Background` navigation pattern (login -> project -> Design & Estimates -> Estimate module).
2. Implement new UI actions in:
   - `pages/admin/projects/design/estimate/estimate.page.js` (`EstimatePage`)
3. Wire Gherkin steps to page methods in:
   - `step-definitions/admin/projects/design/estimate/estimate.steps.js`
4. Ensure the step definitions use the existing page-caching helper pattern:
   - `world.estimatePage` + `getEstimatePage(world)`

## Mapping: Common Estimate Steps -> `EstimatePage` Methods

When adding new `When/Then` steps for the estimate module, prefer these method names/behaviors:

- `I wait for estimate module to load` -> `EstimatePage.waitForModuleToLoad()`
- `I wait for estimate form with slow load handling` -> `EstimatePage.waitForFormSlowHandling()`
  - Must wait for network idle and then ensure a stable element is visible (current implementation checks the title input).
- `I click Create Estimate` -> `EstimatePage.clickCreateEstimate()`
- `I start estimate from scratch and proceed` -> `EstimatePage.startFromScratchAndProceed()`
- `I fill estimate title with "<title>"` -> `EstimatePage.fillEstimateTitleOnly(title)`
- `I fill estimate mandatory details ...` -> `EstimatePage.fillMandatoryDetails(...)`
- `I add estimate section "<name>"` -> `EstimatePage.addSection(name)`
- `I add manual estimate item with name "<name>"` -> `EstimatePage.addManualItem(...)`
- `I add first item from estimate library` -> `EstimatePage.addFromLibraryFirstItem()`
- `I click estimate action compose email and send` -> `EstimatePage.composeAndSendEmail()`
- `I attempt to send estimate email` -> `EstimatePage.attemptSendEstimateEmail()`
- `Then I should see estimate success toast "<message>"` -> `EstimatePage.isToastVisible(message)`
- `Then I should see estimate validation message` -> `EstimatePage.expectValidationMessageVisible()`

## Page Object Implementation Rules

- Put locators in the constructor.
- Methods should:
  - `await expect(locator).toBeVisible({ timeout })` before interacting whenever possible.
  - Prefer `waitForNetworkIdle()`-style waits over arbitrary long sleeps.
  - Use concise, stable selectors (role/text where possible).

## What to Avoid

- Don’t duplicate locators in step definitions.
- Don’t hardcode long `waitForTimeout()` sequences unless a UI animation requires it (and keep them minimal).
- Don’t create new step-definition files for existing modules; extend the existing module steps/page objects unless the repo already has that pattern.

