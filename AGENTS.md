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

---

## Task Management (`@task`) — incremental TC file

Mirror the **Schedule** pattern (`Schedule_TestCases.feature`):

| Layer | Path |
|-------|------|
| Feature | `features/admin/projects/managements/TaskManagement/Task_TestCases.feature` |
| Steps | `step-definitions/admin/projects/management/TaskManagement/TaskStep.js` |
| Page | `pages/admin/projects/management/TaskManagement/TaskManagementPage.js` |

**UI reference:** `intoaec-UI/src/features/TaskManagement/` (`TaskManagementHome.tsx`, kanban, create modal).

**Tags:** `@task` on the feature; `@TS01` / `@TC01` … per test sheet (same as Schedule).

**Background:** login → project → Project Management → `I navigate to the task management module` (handles arriving from Schedule without changing Schedule files).

**Schedule cross-module checks (unchanged):** `Schedule_TestCases.feature` still uses `pages/admin/projects/management/TaskPage.js` and steps in `ScheduleStep.js` (`I open the Task module from project management`, kanban verify, linked schedule). Do **not** move or refactor those for Task Management TCs.

**Step cache:** `world.taskManagementPage` + `getTaskManagementPage(world)` in `TaskStep.js`.

**Run one TC:**
```bash
npx cucumber-js features/admin/projects/managements/TaskManagement/Task_TestCases.feature --tags "@TS01 and @TC01"
```

---

## Budgeting (`@budgeting`) — incremental TC file

Mirror the **Schedule** / **Task** pattern (`Budgeting_TestCases.feature`):

| Layer | Path |
|-------|------|
| Feature | `features/admin/projects/managements/Budgeting/Budgeting_TestCases.feature` |
| Steps | `step-definitions/admin/projects/management/Budgeting/BudgetingStep.js` |
| Page | `pages/admin/projects/management/Budgeting/BudgetingPage.js` |

**UI reference:** `intoaec-UI/src/features/projectSchedule/components/` — `BudgetView.tsx`, `ActualBudgetCard.tsx`, `BudgetLinkPlannedCost.tsx`, `ManualBudgetTabContent.tsx`, `EstimatesTabContent.tsx`, `ProposalsTabContent.tsx`, `BudgetTable.tsx`.

**Tags:** `@budgeting` on the feature; `@TS01`…`@TS12` / `@TC01`…`@TC20` per test sheet (`TC04`–`TC07` share `@TS04`; `TC08`–`TC09` share `@TS05`; `TC10`–`TC11` share `@TS06`; `TC14`–`TC15` share `@TS09`; `TC16`–`TC17` share `@TS10`; `TC19`–`TC20` share `@TS12`).

**Background:** login → project → Project Management → `I navigate to the budgeting module` → wait for module load.

**Money / math rule:** amounts used for manual add and for estimate/proposal link validation must be **multiples of 100** (default random range **100–1,000** step 100). Estimate items: qty `1`, rate multiple of 100, profit `0`. Store last linked/deleted amounts on `world` so Actual Budget card total, category breakdown, and unallocated can be asserted with add/subtract. Login user is **Approver** (manual budgets show Approved).

**Cross-module:** TC-01 reuses Schedule quick-add / add-child steps. TC-04/05 reuse Estimate create+send steps (with controlled amount). TC-06/07 reuse Proposal send + Yopmail accept patterns; budgeting-specific steps live in `BudgetingStep.js` / `BudgetingPage.js`.

**Step cache:** `world.budgetingPage` + `getBudgetingPage(world)` in `BudgetingStep.js`.

**Run one TC:**
```bash
npx cucumber-js features/admin/projects/managements/Budgeting/Budgeting_TestCases.feature --tags "@TS01 and @TC01"
```

---

## Vendor Portal Login (`@vendor` / `@vendor-login`) — incremental TC file

Mirror the **Warehouse** / **Services** pattern (`VendorLogin_TestCases.feature`):

| Layer | Path |
|-------|------|
| Feature | `features/vendor/auth/VendorLogin_TestCases.feature` |
| Steps | `step-definitions/vendor/auth/VendorLoginStep.js` |
| Page | `pages/vendor/auth/VendorLoginPage.js`, `pages/vendor/profile/VendorProfilePage.js`, `pages/vendor/organization/VendorOrganizationPage.js`, `pages/vendor/products/VendorProductsPage.js`, `pages/vendor/services/VendorServicesPage.js` |

**Tags:** `@vendor-portal` is the unique tag to run this file alone (`@vendor` also matches purchase-order vendor features). Feature also has `@vendor` `@vendor-login`; scenarios use `@TS01` / `@TC01` … per test sheet.

**URL:** `https://vendor.aecplayhouse.com/auth/signIn` (`config/env.js` → `vendor`).

**TC-01** is the vendor sign-in flow. **TC-02** uses `Given I am logged in to the vendor portal` then Account Settings → **My Profile** → Edit → Save. **TC-03** uses My Profile → **Security** → change password (`Simple@10` → `Courage@10`) → logout → login with the new password. After TC-03 the original password is restored so TC-01 / TC-02 keep working. **TC-04** uses Account Settings → **My Organization** → **Company Info** → Edit → registration number + category → Update. **TC-05** uses My Organization → **Business Info** → Edit → address line 1/2, city, state, country, ZIP → Update. **TC-06** uses My Organization → **Social Media** → Edit → Facebook/Twitter/LinkedIn/Instagram/Public Profile/Website URLs → Save → refresh → verify. **TC-07** uses My Organization → **E-Signature** → Draw a signature → Update → refresh → verify Existing Digital Signature. **TC-08** uses My Organization → **E-Signature** → Upload `sample_signature.png` → Update → verify Existing Digital Signature. **TC-09** uses **Products** → **Add Product** → **Start From Scratch** → Product Information (name/category/subcategory/qty/brand/description) → Save → Product List. **TC-10** uses **Services** → **Create New** → Service Name/Category/Type/Description → Fixed Price / 2500 / Taxable → Save → Service List.

**Vendor My Profile fields:** the live form exposes core contact/address fields (First/Last Name, Email, Mobile, Organization, Job Title/Designation, Address, City, State, Country, Zip). Optional TC fields (Experience, Expertise, Skills, Industry, Website, Profile Description) are attempted when present and skipped otherwise.

**Step cache:** `world.vendorLoginPage` + `getVendorLoginPage(world)`; `world.vendorProfilePage` + `getVendorProfilePage(world)`; `world.vendorOrganizationPage` + `getVendorOrganizationPage(world)`; `world.vendorProductsPage` + `getVendorProductsPage(world)`; `world.vendorServicesPage` + `getVendorServicesPage(world)` in `VendorLoginStep.js`.

**Run all vendor portal TCs** (PowerShell: use `npx.cmd` / `npm.cmd` if `npx.ps1` is blocked by execution policy):
```bash
npx.cmd cucumber-js --tags "@vendor-portal"
```

**Run one TC:**
```bash
npx.cmd cucumber-js --tags "@vendor-portal and @TC01"
npx.cmd cucumber-js --tags "@vendor-portal and @TC02"
npx.cmd cucumber-js --tags "@vendor-portal and @TC03"
npx.cmd cucumber-js --tags "@vendor-portal and @TC04"
npx.cmd cucumber-js --tags "@vendor-portal and @TC05"
npx.cmd cucumber-js --tags "@vendor-portal and @TC06"
npx.cmd cucumber-js --tags "@vendor-portal and @TC07"
npx.cmd cucumber-js --tags "@vendor-portal and @TC08"
npx.cmd cucumber-js --tags "@vendor-portal and @TC09"
npx.cmd cucumber-js --tags "@vendor-portal and @TC10"
```

