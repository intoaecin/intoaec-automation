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

---

## General automation standards (all modules)

Apply these conventions when adding or refactoring tests. **If a rule is already satisfied in the repo, do not duplicate work;** only add or align what is missing.

### Timeouts

- Set the **default step/scenario timeout to 1 minute (60 seconds)** as the baseline. Align Cucumber `setDefaultTimeout`, Playwright action timeouts, and page-object `defaultTimeout` with this where practical.
- **Slow or heavy pages** (large forms, slow APIs, cold loads): **increase timeouts** for that flow only—e.g. raise `defaultTimeout` on the relevant page object, use a longer `timeout` on specific `expect` / `waitFor` calls, or add a dedicated “wait for module/form ready” step. **Do not** rely on the default 60s everywhere if a screen is known to need more time; document the reason in code or in the scenario notes.
- Prefer **condition-based waits** (element visible, network settled, navigation finished) before bumping arbitrary sleep values; use **longer timeouts** when the condition legitimately takes more time to become true.

### Feature organization and tags

- Keep **one concern per scenario** and group scenarios **by module** (folder and feature naming should match the area under test, e.g. `features/admin/projects/design/estimate/`).
- Use tags consistently:
  - **`@smoke`** — critical **main happy path** (minimal steps, runs often).
  - **`@regression`** — **deeper positive** coverage (full flows, more data/setup).
  - **`@positive`** — expected success / valid inputs.
  - **`@negative`** — validation errors, invalid data, or failure paths.
- Do not merge unrelated flows into a single scenario; split them so failures are easy to diagnose.

### Code quality and reuse

- **Optimize and deduplicate**: shared navigation, login, and repeated UI actions belong in **page objects** or small **helpers**, not copy-pasted across step definitions.
- Prefer one page method per meaningful user action; step definitions should stay thin (call the page object).

### Between-step delay (headed / observability)

- For **headed** runs (the default), a **~2 second delay after each step** is intentional so you can **see each action on screen** during debugging or demos. This is implemented centrally in **`support/hooks.js`** via an **`AfterStep`** hook (not scattered `waitForTimeout` calls in steps or page objects).
- **Environment variables:**
  - **`HEADLESS=true`** — run **without** a visible browser (overrides default headed). **`CI=true`** also selects headless (typical for pipelines).
  - **`HEADED=false`** — same as headless (explicit opt-out of headed).
  - **`STEP_DELAY_MS`** — milliseconds to wait after each step when headed (default **2000**). Set to **`0`** to disable the delay while still headed.
- Headless runs apply **no** between-step delay.
- This **slows total run time**; use **`HEADLESS=true`** or **`STEP_DELAY_MS=0`** when speed matters.
- This delay is **not** a substitute for proper waits: slow pages still need **longer timeouts** or explicit wait helpers as described under **Timeouts** above.

### Error handling

- Use **`try` / `catch`** around operations that can fail intermittently (network, animations, optional modals). Log the error, rethrow when the step must fail, or recover when the spec allows a fallback.

### Logging and reporting

- **Log each step** (or each page-object action): on success, print a short line to the **terminal** (step name + key detail). On failure, log context before the assertion throws.
- Where supported by the Cucumber/HTML reporter, attach the same message or a screenshot so **reports** show what passed, not only failures.

### Test data (random / dynamic inputs)

- For **text and number fields**, prefer **generated data** (random alphanumeric strings, random numbers in a valid range) so runs do not collide with existing records.
- When implementing helpers, **ask the stakeholder or author how many characters, format, or range** is required if it is not obvious from the UI validation rules.

### Browser window (headed runs)

- When running **headed** (visible browser), **maximize the window** (or set a large viewport) so layouts match real users and locators stay stable. Configure this in Playwright launch/context options or in `Before` hooks.

### Locators (preferred order)

- **Prefer accessible, user-facing selectors:**
  - **`getByRole`** with name/label (buttons, links, textboxes, checkboxes, etc.).
  - **`getByLabel`**, **`getByPlaceholder`**, or **`getByText`** when roles are ambiguous.
- Fall back to stable **`data-testid`** or scoped CSS only when the UI does not expose good roles/labels.
- Avoid brittle selectors that depend on generated CSS class names unless no alternative exists.

