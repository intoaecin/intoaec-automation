# -----------------------------------------------------------------------------
# Estimate — incremental TCs in ONE file.
#
# TS-01 Create Estimate from scratch and send — @TS01 @TC01
#   TC-01 — Create Estimate → Start from Scratch → AEC section + line item
#           (qty / unit / rate) → title → Action → Compose email
#           → Send as Estimate → Send Email
#
# Run one case (always pass this file path):
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/design/estimate/Estimate_TestCases.feature --tags "@TS01 and @TC01"
#
# npm:
#   npm run test:admin:projects:design:estimate
#   npm run test:admin:projects:design:estimate:tc01
#
# Layering: `AGENTS.md` — scenarios here; logic in pages/.../design/estimate/estimate.page.js;
#            step-definitions/.../design/estimate/estimate.steps.js
# -----------------------------------------------------------------------------

@estimate @design
Feature: Estimate — incremental test cases

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Design & Estimates" heading
    And I click the "Estimate" module card
    And I wait for estimate module to load

  # ===========================================================================
  # TS-01 — Create Estimate from scratch and send (@TS01 @TC01)
  # ===========================================================================
  # --- TC-01 (Create → Start from Scratch → AEC section/item → compose send) ---
  @TS01 @TC01 @smoke @regression @positive @estimate-create @estimate-send
  Scenario: TC-01 — Create estimate from scratch with AEC line item and send as estimate
    When I complete the estimate create from scratch and send as estimate journey
    Then I should see estimate success toast "Estimation created successfully|Email sent successfully"

