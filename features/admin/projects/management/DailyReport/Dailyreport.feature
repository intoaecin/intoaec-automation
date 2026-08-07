# -----------------------------------------------------------------------------
# Daily Report — incremental manual TCs in ONE file.
#
# TS-01 Create Daily Report — @TS01 @TC01 …
#   TC-01 — Project Management → Daily report → Create × 3 (list → popup → form)
#   TC-02 — Create page → Notes edit popup → random notes → Save → Create
#   TC-03 — Create page → Attachments → add file(s) → ENTER → Upload → Create
#   TC-04 — Create page → Weather Condition → toggle ON → random notes → Save → Create
#   TC-05 — Time Tracking create timesheet → Daily Report create → Time Log shows timesheet → Create
#   TC-06 — Schedule create (×1, today) → Daily Report create → Create
#   TC-07 — Schedule create (×3, same as TC-06) → Daily Report → Schedule Progress edit → verify → unselect 1 → Save → Create
#   TC-08 — Task create (random name, today, first assignee) → Daily Report → task listed → Create
#   TC-09 — Task create (×3, same as TC-08) → Daily Report → Task Progress edit → verify → unselect 1 → Save → Create
#
# Run one case:
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/management/DailyReport/Dailyreport.feature --tags "@TS01 and @TC01"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/management/DailyReport/Dailyreport.feature --tags "@TS01 and @TC02"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/management/DailyReport/Dailyreport.feature --tags "@TS01 and @TC03"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/management/DailyReport/Dailyreport.feature --tags "@TS01 and @TC04"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/management/DailyReport/Dailyreport.feature --tags "@TS01 and @TC05"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/management/DailyReport/Dailyreport.feature --tags "@TS01 and @TC06"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/management/DailyReport/Dailyreport.feature --tags "@TS01 and @TC07"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/management/DailyReport/Dailyreport.feature --tags "@TS01 and @TC08"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/management/DailyReport/Dailyreport.feature --tags "@TS01 and @TC09"
#
# npm:
#   npm run test:admin:projects:management:dailyreport
#   npm run test:admin:projects:management:dailyreport:tc01
#   npm run test:admin:projects:management:dailyreport:tc02
#   npm run test:admin:projects:management:dailyreport:tc03
#   npm run test:admin:projects:management:dailyreport:tc04
#   npm run test:admin:projects:management:dailyreport:tc05
#   npm run test:admin:projects:management:dailyreport:tc06
#   npm run test:admin:projects:management:dailyreport:tc07
#   npm run test:admin:projects:management:dailyreport:tc08
#   npm run test:admin:projects:management:dailyreport:tc09
#
# Layering: `AGENTS.md` — scenarios here; logic in pages/.../management/DailyReport/;
#            step-definitions/.../management/DailyReport/
#            Time Tracking helpers: pages/.../managements/timetracking/TimeTrackingPage.js
#            Schedule helpers: pages/.../management/Schedule/SchedulePage.js
#            Task helpers: pages/.../management/TaskManagement/TaskManagementPage.js
# -----------------------------------------------------------------------------

@management @daily-report
Feature: Daily Report — incremental test cases

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Project Management" heading

  # ===========================================================================
  # TS-01 — Create Daily Report (@TS01 @TC01 …)
  # ===========================================================================

  # --- TC-01 (Create — list → popup → form → submit) -------------------------
  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Create daily report successfully
    When I navigate to the daily report module
    Then I should see the daily report list page
    When I click Create on the daily report list page
    Then I should see the create daily report popup
    When I click Create in the create daily report popup
    Then I should see the create daily report page
    When I click Create on the daily report create page
    Then I should see the daily report created successfully

  # --- TC-02 (Create page → Notes edit → Save → Create) ----------------------
  @TS01 @TC02 @regression @positive @daily-report-notes
  Scenario: TC-02 — Create daily report with notes edit popup
    When I navigate to the daily report module
    Then I should see the daily report list page
    When I click Create on the daily report list page
    Then I should see the create daily report popup
    When I click Create in the create daily report popup
    Then I should see the create daily report page
    When I click the daily report notes edit icon
    Then I should see the daily report notes popup
    When I enter random content in the daily report notes field
    And I click Save on the daily report notes popup
    Then the daily report notes popup should be closed and the notes should be saved
    When I click Create on the daily report create page
    Then I should see the daily report created successfully

  # --- TC-03 (Create page → Attachments → ENTER → Upload → Create) -----------
  @TS01 @TC03 @regression @positive @daily-report-attachment
  Scenario: TC-03 — Create daily report with attachments upload and Enter gate
    When I navigate to the daily report module
    Then I should see the daily report list page
    When I click Create on the daily report list page
    Then I should see the create daily report popup
    When I click Create in the create daily report popup
    Then I should see the create daily report page
    When I click the daily report attachments icon
    Then I should see the daily report attachments popup
    When I add the required attachments on the daily report attachments popup
    And I press Enter in the terminal after adding the daily report attachment
    And I click Upload on the daily report attachments popup
    When I click Create on the daily report create page
    Then I should see the daily report created successfully

  # --- TC-04 (Create page → Weather Condition → toggle → notes → Save → Create) -
  @TS01 @TC04 @regression @positive @daily-report-weather
  Scenario: TC-04 — Create daily report with weather condition toggle and notes
    When I navigate to the daily report module
    Then I should see the daily report list page
    When I click Create on the daily report list page
    Then I should see the create daily report popup
    When I click Create in the create daily report popup
    Then I should see the create daily report page
    When I click the daily report weather condition edit icon
    And I enable the daily report weather affecting work toggle
    And I enter random text in the daily report weather condition notes field
    And I click Save on the daily report weather condition popup
    When I click Create on the daily report create page
    Then I should see the daily report created successfully

  # --- TC-05 (Time Tracking timesheet → Daily Report Time Log → Create) ------
  @TS01 @TC05 @regression @positive @daily-report-timelog @timetracking
  Scenario: TC-05 — Created timesheet appears under Time Log on Daily Report create page
    When I navigate to the time tracking module
    And I click Create Timesheet to open the get started popup
    And I select Start from Scratch and proceed on time tracking
    And I fill timesheet with first user, today, start 10:00 AM, end 6:00 PM and enable chargeable
    And I submit the timesheet for the daily report time log
    Then I should see the timesheet created successfully for the daily report
    When I navigate to the daily report module
    Then I should see the daily report list page
    When I click Create on the daily report list page
    Then I should see the create daily report popup
    When I click Create in the create daily report popup
    Then I should see the create daily report page
    And I should see the created timesheet under the Time Log section
    When I click Create on the daily report create page
    Then I should see the daily report created successfully

  # --- TC-06 (Schedule create → Daily Report create → Create — no Schedule Progress edit) -
  @TS01 @TC06 @regression @positive @daily-report-schedule
  Scenario: TC-06 — Created schedule appears on Daily Report create page
    When I click the "Schedule" module card
    And I wait for the schedule module to load
    And I create a schedule for daily report with random name first assignee and dates
    Then I should see the schedule created for the daily report
    When I navigate to the daily report module
    Then I should see the daily report list page
    When I click Create on the daily report list page
    Then I should see the create daily report popup
    When I click Create in the create daily report popup
    Then I should see the create daily report page
    When I click Create on the daily report create page
    Then I should see the daily report created successfully

  # --- TC-07 (×3 Schedule like TC-06 → Daily Report → Schedule Progress edit → unselect 1 → Create) -
  @TS01 @TC07 @regression @positive @daily-report-schedule
  Scenario: TC-07 — Three schedules in Schedule Progress unselect one and create daily report
    When I click the "Schedule" module card
    And I wait for the schedule module to load
    And I create 3 schedules for daily report with random names assignees and dates
    Then 3 schedules should be created for the daily report
    When I navigate to the daily report module
    Then I should see the daily report list page
    When I click Create on the daily report list page
    Then I should see the create daily report popup
    When I click Create in the create daily report popup
    Then I should see the create daily report page
    When I click the daily report schedule progress edit icon
    Then all created schedules should be displayed and selected in schedule progress
    When I unselect one selected schedule in the daily report schedule progress panel
    And I click Save on the daily report schedule progress panel
    When I click Create on the daily report create page
    Then I should see the daily report created successfully

  # --- TC-08 (Task create → Daily Report lists task → Create) ----------------
  @TS01 @TC08 @regression @positive @daily-report-task @task
  Scenario: TC-08 — Created task appears on Daily Report create page
    When I click the "Task" module card
    And I wait for the task management module to load
    And I create a task for daily report with random name today dates and first assignee
    Then I should see the task created for the daily report
    When I navigate to the daily report module
    Then I should see the daily report list page
    When I click Create on the daily report list page
    Then I should see the create daily report popup
    When I click Create in the create daily report popup
    Then I should see the create daily report page
    And I should see the created task listed on the daily report create page
    When I click Create on the daily report create page
    Then I should see the daily report created successfully

  # --- TC-09 (×3 Task like TC-08 → Daily Report → Task Progress edit → unselect 1 → Create) -
  @TS01 @TC09 @regression @positive @daily-report-task @task
  Scenario: TC-09 — Three tasks in Task Progress unselect one and create daily report
    When I click the "Task" module card
    And I wait for the task management module to load
    And I create 3 tasks for daily report with random names today dates and first assignee
    Then 3 tasks should be created for the daily report
    When I navigate to the daily report module
    Then I should see the daily report list page
    When I click Create on the daily report list page
    Then I should see the create daily report popup
    When I click Create in the create daily report popup
    Then I should see the create daily report page
    When I click the daily report task progress edit icon
    Then all created tasks should be displayed and selected in task progress
    When I unselect one selected task in the daily report task progress panel
    And I click Save on the daily report task progress panel
    When I click Create on the daily report create page
    Then I should see the daily report created successfully
