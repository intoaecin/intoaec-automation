# -----------------------------------------------------------------------------
# Time Sheet — incremental manual TCs in ONE file.
#
# TS-01 Create Time Sheet — @TS01 @TC01
#   TC-01 — Login → kumar project → click Time Tracking (project sidebar / module) →
#           + Create Time Sheet → Start from Scratch → fill required fields →
#           Create → verify success + displayed in time sheet list
#
# TS-02 Edit Time Sheet — @TS02 @TC02
#   TC-02 — Login → kumar project → Time Tracking → select existing time sheet →
#           three-dot → Edit → modify required details → Save/Update →
#           verify updated details are displayed
#
# TS-03 Delete Time Sheet — @TS03 @TC03
#   TC-03 — Login → kumar project → Time Tracking → select existing time sheet →
#           three-dot → Delete → confirm if prompted →
#           verify time sheet is removed from the list
#
# TS-04 Convert To Expense — @TS04 @TC04
#   TC-04 — Login → kumar project → Time Tracking → select existing time sheet →
#           three-dot → Convert To Expense → complete required fields / confirm →
#           verify converted to expense successfully
#
# TS-05 Filter Time Sheet — @TS05 @TC05
#   TC-05 — Login → kumar project → Time Tracking → Filter →
#           select criteria → Apply → verify only matching time sheets are listed
#
# TS-06 Create with Split by Project — @TS06 @TC06
#   TC-06 — Login → Time Tracking → Create Time Sheet → Start from Scratch →
#           user + date + start/end → Split by Project → chargeability →
#           other required details → Create → verify in Time Tracking list
#
# TS-07 Edit Time Sheet (list reflect) — @TS07 @TC07
#   TC-07 — Login → Time Tracking → select existing → three-dot → Edit →
#           modify required details → Update/Save →
#           verify updated successfully and reflected in the list
#
# TS-08 Delete Time Sheet (list gone) — @TS08 @TC08
#   TC-08 — Login → Time Tracking → select existing → three-dot → Delete →
#           confirm if prompted → verify deleted and no longer in the list
#
# Run one case:
#   npx.cmd cucumber-js features/admin/projects/managements/timetracking/TimeSheet_TestCases.feature --tags "@TS01 and @TC01"
#   npx.cmd cucumber-js --tags "@timesheet-tc and @TC01"
#   npx.cmd cucumber-js --tags "@timesheet-tc and @TC02"
#   npx.cmd cucumber-js --tags "@timesheet-tc and @TC03"
#   npx.cmd cucumber-js --tags "@timesheet-tc and @TC04"
#   npx.cmd cucumber-js --tags "@timesheet-tc and @TC05"
#   npx.cmd cucumber-js --tags "@timesheet-tc and @TC06"
#   npx.cmd cucumber-js --tags "@timesheet-tc and @TC07"
#   npx.cmd cucumber-js --tags "@timesheet-tc and @TC08"
#
# Run ALL Time Sheet TCs in this file:
#   npx.cmd cucumber-js --tags "@timesheet-all"
#   npx.cmd cucumber-js --tags "@timesheet-tc"
#
# Layering:
#   Feature: features/admin/projects/managements/timetracking/TimeSheet_TestCases.feature
#   Page:    pages/admin/projects/managements/timetracking/TimeTrackingPage.js
#            pages/admin/projects/managements/timetracking/ConvertTimesheetExpensePage.js
#   Steps:   step-definitions/admin/projects/management/DailyReport/DailyReport.steps.js
#            (create / fill / submit) +
#            step-definitions/admin/projects/managements/timetracking/timeSheetSteps.js
#            (list verification + edit / save / verify update + filter) +
#            step-definitions/admin/projects/managements/timetracking/deleteTimeSheetSteps.js
#            (delete / confirm / verify removed) +
#            step-definitions/admin/projects/managements/timetracking/convertTimesheetExpenseSteps.js
#            (convert to expense / confirm / verify)
# -----------------------------------------------------------------------------

@timesheet-all @timesheet-tc @timetracking @ashraf-modules
Feature: Time Sheet — incremental test cases

  Background:
    Given I am logged in
    When I navigate to the Projects page
    # Prefer kumarorganization — "first project" often opens Vasanth without Time Tracking.
    And I click on the project "kumarorganization" in the list
    # Project profile sidebar (e.g. 05 — ONSITE → Time Tracking) or Project Management tile.
    And I navigate to the time tracking module

  # ===========================================================================
  # TS-01 — Create Time Sheet (@TS01 @TC01)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Create time sheet from scratch with required fields and verify in list
    When I click Create Timesheet to open the get started popup
    And I select Start from Scratch and proceed on time tracking
    And I fill timesheet with first user, today, start 10:00 AM, end 6:00 PM and enable chargeable
    And I submit the timesheet for the daily report time log
    Then I should see the timesheet created successfully for the daily report
    And I should see the created timesheet in the time sheet list

  # ===========================================================================
  # TS-02 — Edit Time Sheet (@TS02 @TC02)
  # ===========================================================================

  @TS02 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Edit an existing time sheet and verify updated details
    # Select existing row → three-dot menu → Edit
    When I click Edit on the timesheet
    # Modify required details (user / date / start / end) + description when present
    And I update all prefilled fields on the timesheet
    And I enter a random description in the dashboard text area
    And I save the timesheet changes
    Then I verify the timesheet is updated successfully

  # ===========================================================================
  # TS-03 — Delete Time Sheet (@TS03 @TC03)
  # ===========================================================================

  @TS03 @TC03 @smoke @regression @positive
  Scenario: TC-03 — Delete an existing time sheet and verify it is removed from the list
    # Select existing row → three-dot menu → Delete
    When I click Delete on the timesheet
    And I confirm the timesheet deletion
    Then I verify the timesheet is deleted successfully

  # ===========================================================================
  # TS-04 — Convert Time Sheet To Expense (@TS04 @TC04)
  # ===========================================================================

  @TS04 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Convert an existing time sheet to an expense and verify success
    # Select existing row → three-dot menu → Convert To Expense
    When I convert the created timesheet to an expense
    # Complete required fields (e.g. payment / expense type) and confirm
    And I confirm the timesheet expense conversion
    Then I verify the timesheet is converted to expense successfully

  # ===========================================================================
  # TS-05 — Filter Time Sheet (@TS05 @TC05)
  # ===========================================================================

  @TS05 @TC05 @smoke @regression @positive
  Scenario: TC-05 — Filter time sheets by criteria and verify matching results
    When I capture time sheet filter criteria from the first list row
    And I click the time sheet Filter option
    And I select the captured time sheet filter criteria
    And I apply the time sheet filter
    Then I should see only time sheets matching the selected filter criteria

  # ===========================================================================
  # TS-06 — Create Time Sheet with Split by Project (@TS06 @TC06)
  # ===========================================================================

  @TS06 @TC06 @smoke @regression @positive
  Scenario: TC-06 — Create time sheet with Split by Project and verify in list
    When I click Create Timesheet to open the get started popup
    And I select Start from Scratch and proceed on time tracking
    And I fill timesheet with user, date, times, split by project, chargeability and other required details
    And I submit the timesheet for the daily report time log
    Then I should see the timesheet created successfully for the daily report
    And I should see the created timesheet in the time sheet list

  # ===========================================================================
  # TS-07 — Edit Time Sheet and verify list (@TS07 @TC07)
  # ===========================================================================

  @TS07 @TC07 @smoke @regression @positive
  Scenario: TC-07 — Edit an existing time sheet and verify updates in the list
    # Select existing row → three-dot menu → Edit
    When I click Edit on the timesheet
    # Modify required details (user / date / start / end) + description when present
    And I update all prefilled fields on the timesheet
    And I enter a random description in the dashboard text area
    And I save the timesheet changes
    Then I verify the timesheet is updated successfully
    And I should see the created timesheet in the time sheet list

  # ===========================================================================
  # TS-08 — Delete Time Sheet and verify removed from list (@TS08 @TC08)
  # ===========================================================================

  @TS08 @TC08 @smoke @regression @positive
  Scenario: TC-08 — Delete an existing time sheet and verify it no longer appears in the list
    # Select existing row → three-dot menu → Delete
    When I click Delete on the timesheet
    And I confirm the timesheet deletion
    Then I verify the timesheet is deleted successfully
