# -----------------------------------------------------------------------------
# Time Sheet — incremental manual TCs in ONE file.
#
# TS-01 Create Time Sheet — @TS01 @TC01
#
# Run one case (always pass this file path):
#   npx.cmd cucumber-js features/admin/projects/managements/timetracking/TimeSheet_TestCases.feature --tags "@TS01 and @TC01"
#
# Run entire file:
#   npx.cmd cucumber-js --tags "@timesheet-tc"
#
# Layering: `AGENTS.md` — scenarios here; logic in
#   pages/admin/projects/managements/timetracking/TimeTrackingPage.js
# Steps: project → Time Tracking create flow is shared with Daily Report TC-05
#   (step-definitions/admin/projects/management/DailyReport/DailyReport.steps.js);
#   list verification lives in step-definitions/.../timetracking/timeSheetSteps.js
# -----------------------------------------------------------------------------

@timesheet-tc @timetracking
Feature: Time Sheet — incremental test cases

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Project Management" heading
    And I navigate to the time tracking module

  # ===========================================================================
  # TS-01 — Create Time Sheet (@TS01 @TC01)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Create time sheet from scratch with required fields
    When I click Create Timesheet to open the get started popup
    And I select Start from Scratch and proceed on time tracking
    And I fill timesheet with first user, today, start 10:00 AM, end 6:00 PM and enable chargeable
    And I submit the timesheet for the daily report time log
    Then I should see the timesheet created successfully for the daily report
    And I should see the created timesheet in the time sheet list
