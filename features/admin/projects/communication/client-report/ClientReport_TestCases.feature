# -----------------------------------------------------------------------------
# Client Report — incremental manual TCs in ONE file.
#
# TS-01 Create Client Report — @TS01 @TC01 … @TS01 @TC02
#   TC-01 — Client Report → Create × 3
#   TC-02 — Create page → Notes edit popup → random notes + title → Create
#
# Run one case:
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/communication/client-report/ClientReport_TestCases.feature --tags "@TS01 and @TC01"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/communication/client-report/ClientReport_TestCases.feature --tags "@TS01 and @TC02"
#
# npm:
#   npm run test:admin:projects:communication:clientreport
#   npm run test:admin:projects:communication:clientreport:tc01
#   npm run test:admin:projects:communication:clientreport:tc02
#
# Layering: `AGENTS.md` — scenarios here; logic in pages/.../communication/client-report/;
#            step-definitions/.../communication/client-report/
# -----------------------------------------------------------------------------

@communication @client-report
Feature: Client Report — incremental test cases

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I navigate to the client report module

  # ===========================================================================
  # TS-01 — Create Client Report (@TS01 @TC01 … @TS01 @TC02)
  # ===========================================================================

  # --- TC-01 (Create × 3 — list → form → submit) -----------------------------
  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Create client report successfully
    When I complete the client report create flow with three create clicks
    Then I should see the client report created successfully

  # --- TC-02 (Create page → title → Notes edit → Save → Create) ---------------
  @TS01 @TC02 @regression @positive @client-report-notes
  Scenario: TC-02 — Create client report with notes edit and random site process update title
    When I open the client report create page
    And I replace the client report title with a random site process update title
    And I edit client report notes with random text from the notes edit popup
    And I click Create on the client report create page
    Then I should see the client report created successfully
