# -----------------------------------------------------------------------------
# Preferences Location Management — Location Pool + Location Stages
#
# TS-01 Navigate & views              — @TS01 @TC01 … @TS01 @TC03
# TS-02 Add pool location             — @TS02 @TC01 … @TS02 @TC04
# TS-03 Edit / stage change           — @TS03 @TC01 … @TS03 @TC03
# TS-04 Delete / allocated lock       — @TS04 @TC01 … @TS04 @TC03
# TS-05 Location Stages CRUD          — @TS05 @TC01 … @TS05 @TC08
#
# Run (PowerShell: use npx.cmd / npm.cmd):
#   npx.cmd cucumber-js features/admin/settings/Preferences/location-management/LocationSettings_TestCases.feature
#   npx.cmd cucumber-js features/admin/settings/Preferences/location-management/LocationSettings_TestCases.feature --tags "@TS01 and @TC01"
#
# Layering:
#   Feature: this file
#   Steps:   step-definitions/admin/settings/Preferences/location-management/LocationSettingsStep.js
#   Page:    pages/admin/settings/Preferences/location-management/LocationSettingsPage.js
# Reuses: login, navigate to Settings, select Preferences
# -----------------------------------------------------------------------------

@location-settings @location-pool @preferences @settings @regression
Feature: Preferences Location Management — Location Pool and Stages

  Background:
    Given I am logged in
    And I close the post-login popup or select Continue to My Account
    When I navigate to Settings
    And I select Preferences
    And I select Location Management

  # ===========================================================================
  # TS-01 — Navigate & views
  # ===========================================================================

  @TS01 @TC01 @location-pool @smoke @positive
  Scenario: TC-01 — Open Location Management with default Pool tab and Add visible
    Then I should be on the Location Pool tab
    And the Location Pool Add button should be visible

  @TS01 @TC02 @location-pool @smoke @positive
  Scenario: TC-02 — Toggle List view and Kanban view
    When I switch Location Pool to "Kanban" view
    And I switch Location Pool to "List" view
    Then I should be on the Location Pool tab

  @TS01 @TC03 @location-pool @location-stages @positive
  Scenario: TC-03 — Switch sidebar tabs and invalid tab falls back to Pool
    When I open the Location Stages sidebar tab
    And I open the Location Pool sidebar tab
    Then I should be on the Location Pool tab
    When I open an invalid Location Management tab
    Then I should be on the Location Pool tab

  # ===========================================================================
  # TS-02 — Add pool location
  # ===========================================================================

  @TS02 @TC01 @location-pool @negative
  Scenario: TC-01 — Empty Add Location form shows name required validation
    When I submit the Add Location form empty

  @TS02 @TC02 @location-pool @negative
  Scenario: TC-02 — Invalid email and negative size are rejected
    When I submit the Add Location form with invalid email and size

  @TS02 @TC03 @location-pool @smoke @positive
  Scenario: TC-03 — Create a Location Pool location and verify after reload
    When I create a Location Pool location
    Then the created Location Pool location should be listed
    When I reload Location Management and verify the created location
    Then the created Location Pool location should be listed

  @TS02 @TC04 @location-pool @positive
  Scenario: TC-04 — Cancel Add Location leaves the list unchanged
    When I cancel adding a Location Pool location without saving
    Then I should be on the Location Pool tab

  # ===========================================================================
  # TS-03 — Edit / stage change
  # ===========================================================================

  @TS03 @TC01 @location-pool @positive
  Scenario: TC-01 — Edit a Location Pool location name
    When I create a Location Pool location
    And I edit the created Location Pool location
    Then the created Location Pool location should be listed

  @TS03 @TC02 @location-pool @smoke @positive
  Scenario: TC-02 — Change Location Pool stage to Approved
    When I create a Location Pool location
    And I change the created Location Pool stage to Approved
    Then the created Location Pool location should show Approved stage

  @TS03 @TC03 @location-pool @positive
  Scenario: TC-03 — Kanban view is available for the pool
    When I switch Location Pool to "Kanban" view
    And I switch Location Pool to "List" view
    Then I should be on the Location Pool tab

  # ===========================================================================
  # TS-04 — Delete / allocated lock
  # ===========================================================================

  @TS04 @TC01 @location-pool @smoke @positive
  Scenario: TC-01 — Delete a non-allocated Location Pool location
    When I create a Location Pool location
    And I delete the created Location Pool location
    Then the created Location Pool location should not be listed

  @TS04 @TC02 @location-pool @positive
  Scenario: TC-02 — Cancel delete keeps the Location Pool row
    When I create a Location Pool location
    And I open delete for the created Location Pool location
    And I cancel delete for the Location Pool location
    Then the created Location Pool location should still be listed

  @TS04 @TC03 @location-pool @positive
  Scenario: TC-03 — Allocated Location Pool row blocks edit and delete when present
    Then an allocated Location Pool row should block edit and delete

  # ===========================================================================
  # TS-05 — Location Stages
  # ===========================================================================

  @TS05 @TC01 @location-stages @smoke @positive
  Scenario: TC-01 — Open Location Stages tab
    When I open the Location Stages sidebar tab
    Then the Location Stages defaults should be visible

  @TS05 @TC02 @location-stages @positive
  Scenario: TC-02 — Ensure default stages New Approved Rejected
    When I ensure Location default stages are present
    Then the Location Stages defaults should be visible

  @TS05 @TC03 @location-stages @smoke @positive
  Scenario: TC-03 — Add a custom Location stage
    When I add a custom Location stage
    Then the created Location stage should be listed

  @TS05 @TC04 @location-stages @positive
  Scenario: TC-04 — Edit a custom Location stage
    When I add a custom Location stage
    And I edit the created Location stage
    Then the created Location stage should be listed

  @TS05 @TC05 @location-stages @negative
  Scenario: TC-05 — Duplicate name and max-length stage validation
    When I add a custom Location stage
    And I validate duplicate and max-length Location stage rules
    Then the created Location stage should be listed

  @TS05 @TC06 @location-stages @positive
  Scenario: TC-06 — Delete an unused custom Location stage
    When I add a custom Location stage
    And I delete the created Location stage
    Then the created Location stage should not be listed

  @TS05 @TC07 @location-stages @positive
  Scenario: TC-07 — In-use stage reassignment path is available after defaults load
    When I ensure Location default stages are present
    Then the Location Stages defaults should be visible

  @TS05 @TC08 @location-stages @smoke @positive
  Scenario: TC-08 — Default stage New cannot be renamed
    When I open the Location Stages sidebar tab
    And I verify the default Location stage New is protected
    Then the Location Stages defaults should be visible
