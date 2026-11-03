# -----------------------------------------------------------------------------
# Client Report — incremental manual TCs in ONE file.
#
# TS-01 Create Client Report — @TS01 @TC01 … @TS01 @TC11
#   TC-01 — Client Report → Create × 3
#   TC-02 — Create page → Notes edit popup → random notes + title → Create
#   TC-03 — Create page → title → Notes (first icon) → Save → attachment (MuiStack) → Upload → ENTER → Create
#   TC-04 — TC-03 flow → Weather edit icon → toggle ON → Enter your notes here → Save → Create
#   TC-05 — Schedule Gantt quick add → Client Report → title + notes + weather checkbox/notes → Create
#   TC-06 — TC-05 flow → schedule edit icon → unselect 2 pre-selected checkboxes → Create
#   TC-07 — Task kanban: add 3 quick tasks in To Do → Client Report → title + notes + weather → select task → Create
#   TC-08 — TC-07 flow → weather → task edit → unselect 1 checkbox → Save task panel → Create
#   TC-09 — Workers: create 2 shifts → Client Report → title + notes + weather → Create
#   TC-10 — TC-09 flow → workers/shift edit → unselect 1 checkbox → Save → Create
#   TC-11 — Inventory Create Group + Warehouse item → Client Report → title + notes + weather → Create
#
# Run one case:
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/communication/client-report/ClientReport_TestCases.feature --tags "@TS01 and @TC01"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/communication/client-report/ClientReport_TestCases.feature --tags "@TS01 and @TC02"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/communication/client-report/ClientReport_TestCases.feature --tags "@TS01 and @TC03"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/communication/client-report/ClientReport_TestCases.feature --tags "@TS01 and @TC04"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/communication/client-report/ClientReport_TestCases.feature --tags "@TS01 and @TC05"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/communication/client-report/ClientReport_TestCases.feature --tags "@TS01 and @TC06"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/communication/client-report/ClientReport_TestCases.feature --tags "@TS01 and @TC07"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/communication/client-report/ClientReport_TestCases.feature --tags "@TS01 and @TC08"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/communication/client-report/ClientReport_TestCases.feature --tags "@TS01 and @TC09"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/communication/client-report/ClientReport_TestCases.feature --tags "@TS01 and @TC10"
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/communication/client-report/ClientReport_TestCases.feature --tags "@TS01 and @TC11"
#
# npm:
#   npm run test:admin:projects:communication:clientreport
#   npm run test:admin:projects:communication:clientreport:tc01
#   npm run test:admin:projects:communication:clientreport:tc02
#   npm run test:admin:projects:communication:clientreport:tc03
#   npm run test:admin:projects:communication:clientreport:tc04
#   npm run test:admin:projects:communication:clientreport:tc05
#   npm run test:admin:projects:communication:clientreport:tc06
#   npm run test:admin:projects:communication:clientreport:tc07
#   npm run test:admin:projects:communication:clientreport:tc08
#   npm run test:admin:projects:communication:clientreport:tc09
#   npm run test:admin:projects:communication:clientreport:tc10
#   npm run test:admin:projects:communication:clientreport:tc11
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

  # ===========================================================================
  # TS-01 — Create Client Report (@TS01 @TC01 … @TS01 @TC09)
  # ===========================================================================

  # --- TC-01 (Create × 3 — list → form → submit) -----------------------------
  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Create client report successfully
    When I navigate to the client report module
    And I complete the client report create flow with three create clicks
    Then I should see the client report created successfully

  # --- TC-02 (Create page → title → Notes edit → Save → Create) ---------------
  @TS01 @TC02 @regression @positive @client-report-notes
  Scenario: TC-02 — Create client report with notes edit and random site process update title
    When I navigate to the client report module
    And I open the client report create page
    And I replace the client report title with a random site process update title
    And I edit client report notes with random text from the notes edit popup
    And I click Create on the client report create page
    Then I should see the client report created successfully

  # --- TC-03 (Create page → title → Notes edit → attachment → ENTER → Create) -
  @TS01 @TC03 @regression @positive @client-report-attachment @client-report-notes
  Scenario: TC-03 — Create client report with notes, attachment upload, and manual Enter gate
    When I navigate to the client report module
    And I open the client report create page
    And I replace the client report title with a random site process update title
    And I edit client report notes with random text from the notes edit popup
    And I click the client report attachment icon to upload a file
    And I press Enter in the terminal after the client report attachment is uploaded
    And I click Create on the client report create page
    Then I should see the client report created successfully

  # --- TC-04 (TC-03 flow → Weather Condition edit → toggle → notes → Save → Create) -
  @TS01 @TC04 @regression @positive @client-report-weather @client-report-attachment @client-report-notes
  Scenario: TC-04 — Create client report with notes, attachment, weather condition, and Create
    When I navigate to the client report module
    And I open the client report create page
    And I replace the client report title with a random site process update title
    And I edit client report notes with random text from the notes edit popup
    And I click the client report attachment icon to upload a file
    And I press Enter in the terminal after the client report attachment is uploaded
    And I edit client report weather condition with weather affecting work toggle and random notes
    And I click Create on the client report create page
    Then I should see the client report created successfully

  # --- TC-05 (Schedule Gantt quick add → Client Report → weather checkbox + notes → Create) -
  @TS01 @TC05 @regression @positive @client-report-schedule @client-report-weather @client-report-notes
  Scenario: TC-05 — Create schedule in Gantt then client report with weather condition and Create
    When I select the "Project Management" heading
    And I click the "Schedule" module card
    And I wait for the schedule module to load
    And I switch schedule to gantt view
    And I open quick add schedule from the gantt sidebar
    Then the gantt sidebar quick add name field should be visible
    When I enter a random schedule name in the gantt sidebar quick add field
    And I confirm quick add schedule with tick in gantt sidebar
    Then the created schedule should be visible in the gantt view
    When I navigate to the client report module
    Then I should see the client report list page
    When I open the client report create page
    And I replace the client report title with a random site process update title
    And I edit client report notes with random text from the notes edit popup
    And I edit client report weather condition with weather affecting work toggle and random notes
    And I click Create on the client report create page
    Then I should see the client report created successfully

  # --- TC-06 (TC-05 flow → schedule edit → unselect 2 selected checkboxes → Create) -
  @TS01 @TC06 @regression @positive @client-report-schedule @client-report-weather @client-report-notes
  Scenario: TC-06 — Create schedule in Gantt then client report with weather and unselect two schedules
    When I select the "Project Management" heading
    And I click the "Schedule" module card
    And I wait for the schedule module to load
    And I switch schedule to gantt view
    And I create 5 random schedules from the gantt sidebar quick add with tick
    Then 5 created schedules should be visible in the gantt view
    When I navigate to the client report module
    Then I should see the client report list page
    When I open the client report create page
    And I replace the client report title with a random site process update title
    And I edit client report notes with random text from the notes edit popup
    And I edit client report weather condition with weather affecting work toggle and random notes
    And I open the client report schedule section edit icon
    And I unselect two selected schedule checkboxes on the client report create page
    And I click Create on the client report create page
    Then I should see the client report created successfully

  # --- TC-07 (3× quick task in To Do → Client Report → weather → select task → Create) -
  @TS01 @TC07 @regression @positive @client-report-task @client-report-weather @client-report-notes
  Scenario: TC-07 — Create three quick tasks in To Do then client report with weather and select task
    When I select the "Project Management" heading
    And I click the "Task" module card
    And I wait for the task management module to load
    And I switch task management to kanban view
    And I add 3 quick tasks in kanban column "To Do"
    Then 3 quick task cards should be visible in kanban column "To Do"
    When I navigate to the client report module
    Then I should see the client report list page
    When I click Create on the client report list page
    Then I should see the create client report popup
    When I click Create in the create client report popup
    Then I should see the client report create form page
    And I replace the client report title with a random site process update title
    And I edit client report notes with random text from the notes edit popup
    And I edit client report weather condition with weather affecting work toggle and random notes
    And I select the created task on the client report create page
    And I click Create on the client report create page
    Then I should see the client report created successfully

  # --- TC-08 (TC-07 flow → weather → task edit → unselect 1 → Save task → Create) -
  @TS01 @TC08 @regression @positive @client-report-task @client-report-weather @client-report-notes
  Scenario: TC-08 — Create three quick tasks then client report with weather and unselect one task
    When I select the "Project Management" heading
    And I click the "Task" module card
    And I wait for the task management module to load
    And I switch task management to kanban view
    And I add 3 quick tasks in kanban column "To Do"
    Then 3 quick task cards should be visible in kanban column "To Do"
    When I navigate to the client report module
    Then I should see the client report list page
    When I click Create on the client report list page
    Then I should see the create client report popup
    When I click Create in the create client report popup
    Then I should see the client report create form page
    And I replace the client report title with a random site process update title
    And I edit client report notes with random text from the notes edit popup
    And I edit client report weather condition with weather affecting work toggle and random notes
    And I open the client report task section edit icon
    And I unselect one selected task checkbox on the client report create page
    And I click Save on the client report task selection panel
    And I click Create on the client report create page
    Then I should see the client report created successfully

  # --- TC-09 (Workers: create 2 shifts → Client Report → title + notes + weather → Create) -
  @TS01 @TC09 @regression @positive @client-report-shift @client-report-weather @client-report-notes @workers
  Scenario: TC-09 — Create two shifts then client report with notes and weather condition
    When I click Workers in the project
    And I wait for the workers module to load
    # Shift 1
    When I click the Add Shift button in workers
    Then I should see the add shift form or popup
    When I enter a random shift name in the add shift form
    And I select the second checkbox in the add shift form
    And I select today as the start date in the add shift form
    And I enter start and end time in the add shift form
    And I click Create on the add shift form
    Then the created shift should be visible in worker management
    # Shift 2
    When I click the Add Shift button in workers
    Then I should see the add shift form or popup
    When I enter a random shift name in the add shift form
    And I select the second checkbox in the add shift form
    And I select today as the start date in the add shift form
    And I enter start and end time in the add shift form
    And I click Create on the add shift form
    Then the created shift should be visible in worker management
    # Client Report (same weather flow as TC-04 / TC-08)
    When I navigate to the client report module
    Then I should see the client report list page
    When I click Create on the client report list page
    Then I should see the create client report popup
    When I click Create in the create client report popup
    Then I should see the client report create form page
    And I replace the client report title with a random site process update title
    And I edit client report notes with random text from the notes edit popup
    And I edit client report weather condition with weather affecting work toggle and random notes
    And I click Create on the client report create page
    Then I should see the client report created successfully

  # --- TC-10 (TC-09 flow → workers/shift edit → unselect 1 → Save → Create) -
  @TS01 @TC10 @regression @positive @client-report-shift @client-report-weather @client-report-notes @workers
  Scenario: TC-10 — Create two shifts then client report with weather and unselect one worker shift
    When I click Workers in the project
    And I wait for the workers module to load
    # Shift 1
    When I click the Add Shift button in workers
    Then I should see the add shift form or popup
    When I enter a random shift name in the add shift form
    And I select the second checkbox in the add shift form
    And I select today as the start date in the add shift form
    And I enter start and end time in the add shift form
    And I click Create on the add shift form
    Then the created shift should be visible in worker management
    # Shift 2
    When I click the Add Shift button in workers
    Then I should see the add shift form or popup
    When I enter a random shift name in the add shift form
    And I select the second checkbox in the add shift form
    And I select today as the start date in the add shift form
    And I enter start and end time in the add shift form
    And I click Create on the add shift form
    Then the created shift should be visible in worker management
    # Client Report → title + notes + weather → workers edit → unselect 1 → Save → Create
    When I navigate to the client report module
    Then I should see the client report list page
    When I click Create on the client report list page
    Then I should see the create client report popup
    When I click Create in the create client report popup
    Then I should see the client report create form page
    And I replace the client report title with a random site process update title
    And I edit client report notes with random text from the notes edit popup
    And I edit client report weather condition with weather affecting work toggle and random notes
    And I open the client report workers section edit icon
    And I unselect one selected workers checkbox on the client report create page
    And I click Save on the client report workers selection panel
    And I click Create on the client report create page
    Then I should see the client report created successfully

  # --- TC-11 (Inventory codegen → Client Report → weather → Create) -
  @TS01 @TC11 @regression @positive @client-report-inventory @client-report-weather @client-report-notes @inventory
  Scenario: TC-11 — Create inventory group item then client report with notes and weather condition
    When I click Inventory in the project
    And I wait for the inventory module to load
    Then I should see the inventory page
    When I click the Create Group button in inventory
    Then I should see the create inventory item group popup
    When I enter a random group name in the create inventory group popup
    And I click Create on the create inventory group popup
    Then the created inventory group should be visible
    When I open the newly created inventory group
    And I click the Add Item button in inventory group
    Then I should see the add item options
    When I select Add from Warehouse in inventory
    And I select the first checkbox from the inventory list
    And I click Next on the inventory selection
    Then I should see the inventory off-canvas page
    When I enter "1" in the required quantity field
    And I click Add on the inventory off-canvas
    Then the selected inventory item should be displayed in the inventory group
    When I navigate to the client report module
    Then I should see the client report list page
    When I click Create on the client report list page
    Then I should see the create client report popup
    When I click Create in the create client report popup
    Then I should see the client report create form page
    And I replace the client report title with a random site process update title
    And I edit client report notes with random text from the notes edit popup
    And I edit client report weather condition with weather affecting work toggle and random notes
    And I click Create on the client report create page
    Then I should see the client report created successfully
