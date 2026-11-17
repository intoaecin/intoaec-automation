# -----------------------------------------------------------------------------
# Bridge — Preferences Location Pool (Approved) → Project Location Management
#
# Reuses the suite disposable client/project while Add is enabled; creates one when needed
# (optional LOCATION_MGMT_PROJECT hint tried first via list search near Manage Columns).
#
# Run:
#   npx.cmd cucumber-js features/admin/projects/location-management/LocationBridge_TestCases.feature --tags "@location-bridge"
# -----------------------------------------------------------------------------

@location-bridge @project-location @location-pool @regression
Feature: Location bridge — Preferences pool to project Location Management

  @TS07 @TC01 @smoke @positive
  Scenario: TC-01 — Create Approved pool location then add and remove on project
    Given I am logged in
    When I prepare an Approved Location Pool entry for the project bridge
    And I navigate to the Projects page
    And I open the Location Management fixture project
    And I open the project Location module
    And I wait for Location Management to load
    And I add the bridge Location Pool entry to the project
    Then the added project location should be listed
    When I remove the added project location
    Then the added project location should not be listed

  @TS07 @TC02 @positive
  Scenario: TC-02 — Create Approved pool location then allocate on project
    Given I am logged in
    When I prepare an Approved Location Pool entry for the project bridge
    And I navigate to the Projects page
    And I open the Location Management fixture project
    And I open the project Location module
    And I wait for Location Management to load
    And I add the bridge Location Pool entry to the project
    And I allocate the added project location
    Then the added project location should show Allocated
    And the project Location Add button should be disabled
