# -----------------------------------------------------------------------------
# Manage Services — incremental TCs in ONE file.
#
# Category / Type / Pricing Module are whatever the dropdowns currently offer
# (no fixed names); service name and price are generated per run.
#
# TS-06 Add Service — @TS06 @TC06
#   TC-06 — Services → Add Service → any available category / type → Save
# TS-07 Edit Service — @TS07 @TC07
#   TC-07 — Service List (create one first if empty) → available row → Edit → Update
# TS-08 Delete Service — @TS08 @TC08
#   TC-08 — Service List (create one first if empty) → available row → Delete → reason + Yes → confirm
#
# Run one case (PowerShell: use npx.cmd / npm.cmd — npx.ps1 is blocked by execution policy):
#   npx.cmd cucumber-js features/admin/resources/ManageServices/Services_TestCases.feature --tags "@TS06 and @TC06"
#   npx.cmd cucumber-js features/admin/resources/ManageServices/Services_TestCases.feature --tags "@TS07 and @TC07"
#   npx.cmd cucumber-js features/admin/resources/ManageServices/Services_TestCases.feature --tags "@TS08 and @TC08"
#
# npm:
#   npm.cmd run test:admin:resources:manageservices
#   npm.cmd run test:admin:resources:manageservices:tc06
#   npm.cmd run test:admin:resources:manageservices:tc07
#   npm.cmd run test:admin:resources:manageservices:tc08
#
# Layering: `AGENTS.md` — scenarios here;
#            logic in pages/admin/resources/ManageServices/ServicesPage.js;
#            step-definitions/admin/resources/ManageServices/ServicesStep.js
# -----------------------------------------------------------------------------

@services @manage-services @ashraf-modules
Feature: Manage Services — incremental test cases

  Background:
    Given I am logged in
    When I navigate to Manage Services

  # ===========================================================================
  # TS-06 — Add Service (@TS06 @TC06)
  # ===========================================================================

  @TS06 @TC06 @smoke @regression @positive
  Scenario: TC-06 — Add a new service with any available category and type
    When I click the services Add Service button
    Then the Add Service form should be displayed
    When I select any available service category and service type
    And I fill the service description with "Professional service created by automation"
    And I select an available service pricing module
    And I fill the service price with a random amount
    And I enable the service Taxable option
    Then the Add Service form should show the entered details
    When I click the services Save button
    When I refresh the services list
    Then the newly added service should be displayed in the Services List
    And the services list row should show the selected category, type, description, pricing module, price, and taxable status

  # ===========================================================================
  # TS-07 — Edit Service (@TS07 @TC07)
  # ===========================================================================

  @TS07 @TC07 @smoke @regression @positive
  Scenario: TC-07 — Edit an available service from the Service List
    Given at least one service exists in the Service List
    Then the services Service List should be displayed
    When I click the services Edit button for an available service
    Then the Edit Service form should be displayed with existing details
    When I select any available service category and service type
    And I fill the service description with "Updated service details by automation"
    And I select an available service pricing module
    And I fill the service price with a random amount
    And I enable the service Taxable option
    Then the Edit Service form should show the updated details
    When I click the services Update button
    When I refresh the services list
    Then the edited service should show the updated details in the Service List

  # ===========================================================================
  # TS-08 — Delete Service (@TS08 @TC08)
  # ===========================================================================

  @TS08 @TC08 @smoke @regression @positive
  Scenario: TC-08 — Delete an available service from the Service List
    Given at least one service exists in the Service List
    Then the services Service List should be displayed
    When I click the services Delete button for an available service
    Then the services Delete Service confirmation popup should be displayed
    When I enter the services deletion reason "Service is no longer required"
    And I enter "Yes" in the services deletion confirmation field
    And I click the services Delete Service confirm button
    When I refresh the services list
    Then the deleted service should not be displayed in the Service List
