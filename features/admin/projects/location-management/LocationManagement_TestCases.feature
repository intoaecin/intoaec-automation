# -----------------------------------------------------------------------------
# Project Location Management — incremental TCs + bridge flow
#
# TS-01 Smoke                         — @TS01
# TS-02 Add                           — @TS02
# TS-03 Search & filter               — @TS03
# TS-04 Allocate                      — @TS04
# TS-05 Remove                        — @TS05
# TS-06 Guards                        — @TS06
# Bridge (prefs Approved → project)   — @location-bridge
#
# Prerequisites:
#   - Admin with Location feature + CLIENT_LOCATION
#   - Fixture creates one disposable Active Clients client/project per run and reuses it
#     across scenarios while Add stays enabled (creates again after allocate / Add lock)
#     (optional LOCATION_MGMT_PROJECT is tried first when Add is still enabled)
#   - At least one Approved Location Pool entry not allocated elsewhere
#     (bridge scenario creates its own)
#
# Run:
#   npx.cmd cucumber-js features/admin/projects/location-management/LocationManagement_TestCases.feature
#   npx.cmd cucumber-js features/admin/projects/location-management/LocationManagement_TestCases.feature --tags "@TS01 and @TC01"
#   npx.cmd cucumber-js features/admin/projects/location-management/LocationManagement_TestCases.feature --tags "@location-bridge"
#
# Layering:
#   Feature: this file
#   Steps:   step-definitions/admin/projects/location-management/LocationManagementStep.js
#   Page:    pages/admin/projects/location-management/LocationManagementPage.js
# Reuses: ProjectProfile.steps navigation helpers
# -----------------------------------------------------------------------------

@project-location @location-management @regression
Feature: Project Location Management — incremental test cases

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I open the Location Management fixture project
    And I open the project Location module
    And I wait for Location Management to load

  # ===========================================================================
  # TS-01 — Smoke
  # ===========================================================================

  @TS01 @TC01 @smoke @positive
  Scenario: TC-01 — Location Management loads with Add control
    Then Location Management should be loaded
    And the Location Management Add control should be visible

  @TS01 @TC02 @smoke @positive
  Scenario: TC-02 — Table headers or empty state are visible
    Then the Location Management table or empty state should be visible

  @TS01 @TC03 @smoke @positive
  Scenario: TC-03 — Search control is available
    Then the Location Management search control should be available

  # ===========================================================================
  # TS-02 — Add
  # ===========================================================================

  @TS02 @TC01 @positive
  Scenario: TC-01 — Add Location dialog shows warning and disabled confirm
    When I open the project Add Location dialog
    Then the project Add Location dialog should be ready
    When I cancel the project Add Location dialog

  @TS02 @TC02 @smoke @positive
  Scenario: TC-02 — Add first available Approved pool location
    When I add the first available Approved location to the project
    Then the added project location should be listed

  @TS02 @TC03 @positive
  Scenario: TC-03 — Cancel Add Location leaves module loaded
    When I cancel the project Add Location dialog
    Then Location Management should be loaded

  # ===========================================================================
  # TS-03 — Search & filter
  # ===========================================================================

  @TS03 @TC01 @positive
  Scenario: TC-01 — Search finds the added location and non-match shows empty
    When I add the first available Approved location to the project
    And I search Location Management for the added location
    Then the added project location should remain visible
    When I search Location Management for "zzz-no-match-location-xyz"
    Then Location Management should show no matching locations
    When I clear the Location Management search
    Then the added project location should remain visible

  @TS03 @TC02 @positive
  Scenario: TC-02 — Filter by Pending Approval allocation
    When I add the first available Approved location to the project
    And I filter Location Management allocation by "Pending Approval"
    Then the added project location should remain visible

  @TS03 @TC03 @positive
  Scenario: TC-03 — Clear Location Management filters
    When I add the first available Approved location to the project
    And I filter Location Management allocation by "Pending Approval"
    And I clear Location Management filters
    Then the added project location should remain visible

  # ===========================================================================
  # TS-05 — Remove (before allocate lock)
  # ===========================================================================

  @TS05 @TC01 @smoke @positive
  Scenario: TC-01 — Remove a pending project location
    When I add the first available Approved location to the project
    And I remove the added project location
    Then the added project location should not be listed

  @TS05 @TC02 @positive
  Scenario: TC-02 — Cancel remove keeps the location
    When I add the first available Approved location to the project
    And I open remove for the added project location and cancel
    Then the added project location should remain visible

  # ===========================================================================
  # TS-04 — Allocate
  # ===========================================================================

  @TS04 @TC01 @smoke @positive
  Scenario: TC-01 — Allocate a pending project location
    When I add the first available Approved location to the project
    And I allocate the added project location
    Then the added project location should show Allocated

  @TS04 @TC02 @positive
  Scenario: TC-02 — Add is disabled after allocate
    When I add the first available Approved location to the project
    And I allocate the added project location
    Then the project Location Add button should be disabled

  @TS04 @TC03 @positive
  Scenario: TC-03 — Cancel allocate leaves the pending location
    When I add the first available Approved location to the project
    And I open allocate for the added project location and cancel
    Then the added project location should remain visible

  # ===========================================================================
  # TS-06 — Guards
  # ===========================================================================

  @TS06 @TC01 @positive
  Scenario: TC-01 — Guardrails for allocated lock or booked rows
    Then Location Management guardrails should be satisfied
