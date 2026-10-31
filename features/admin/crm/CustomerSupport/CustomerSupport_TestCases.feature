# -----------------------------------------------------------------------------
# Customer Support — incremental TCs in ONE file.
#
# TS-01 Support Desk loads          — @TS01 @TC01
# TS-02 Switch list and kanban      — @TS02 @TC02
# TS-03 Create ticket offcanvas     — @TS03 @TC03
# TS-04 Open filter menu            — @TS04 @TC04
# TS-05 Ticket Statuses customize   — @TS05 @TC05
#
# Run one case (PowerShell: use npx.cmd / npm.cmd — npx.ps1 is blocked by execution policy):
#   npx.cmd cucumber-js features/admin/crm/CustomerSupport/CustomerSupport_TestCases.feature --tags "@TS01 and @TC01"
#   npx.cmd cucumber-js features/admin/crm/CustomerSupport/CustomerSupport_TestCases.feature --tags "@TS02 and @TC02"
#   npx.cmd cucumber-js features/admin/crm/CustomerSupport/CustomerSupport_TestCases.feature --tags "@TS03 and @TC03"
#   npx.cmd cucumber-js features/admin/crm/CustomerSupport/CustomerSupport_TestCases.feature --tags "@TS04 and @TC04"
#   npx.cmd cucumber-js features/admin/crm/CustomerSupport/CustomerSupport_TestCases.feature --tags "@TS05 and @TC05"
#
# Run all:
#   npx.cmd cucumber-js features/admin/crm/CustomerSupport/CustomerSupport_TestCases.feature --tags "@customer-support-tc"
#   npm.cmd run test:admin:crm:customersupport
#
# Layering: `AGENTS.md` — scenarios here;
#            logic in pages/admin/crm/CustomerSupport/CustomerSupportPage.js;
#            step-definitions/admin/crm/CustomerSupport/CustomerSupportStep.js
# -----------------------------------------------------------------------------

@customer-support-tc @customer-support
Feature: Customer Support — incremental test cases

  Background:
    Given I am logged in
    When I navigate to Customer Support
    And I wait for the customer support module to load

  # ===========================================================================
  # TS-01 — Support Desk loads (@TS01 @TC01)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Support Desk loads and page title is visible
    Then the Support Desk page title should be visible

  # ===========================================================================
  # TS-02 — Switch list and kanban views (@TS02 @TC02)
  # ===========================================================================

  @TS02 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Switch between list and kanban views
    When I switch customer support to kanban view
    And I switch customer support to list view

  # ===========================================================================
  # TS-03 — Create ticket offcanvas (@TS03 @TC03)
  # ===========================================================================

  @TS03 @TC03 @smoke @regression @positive
  Scenario: TC-03 — Open create ticket offcanvas and see title lead and summary fields
    When I open the customer support create ticket offcanvas
    Then the customer support create ticket offcanvas should show title lead and summary fields

  # ===========================================================================
  # TS-04 — Open filter menu (@TS04 @TC04)
  # ===========================================================================

  @TS04 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Open the customer support filter menu
    When I open the customer support filter menu

  # ===========================================================================
  # TS-05 — Ticket Statuses customize tab (@TS05 @TC05)
  # ===========================================================================

  @TS05 @TC05 @smoke @regression @positive
  Scenario: TC-05 — Navigate to Ticket Statuses customize tab via feature sidebar
    When I open the customer support Ticket Statuses tab
    Then the customer support Ticket Statuses page should be visible
