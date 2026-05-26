# Schedule — scenarios aligned with "Automation testing - Schedule.pdf" (TS/TC tags).
# Layering per repo `AGENTS.md`: Gherkin only here; Playwright in SchedulePage.js; thin step defs in Schedule/step.js.
# Page object: pages/admin/projects/management/Schedule/SchedulePage.js
# Steps: step-definitions/admin/projects/management/Schedule/step.js
# Many PDF rows (MS Project import, working calendar, activity tracker, full dependency matrix) are not yet automated; extend selectors as needed.

@schedule
Feature: Schedule

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Project Management" heading
    And I click the "Schedule" module card
    And I wait for the schedule module to load

  @smoke @regression @positive @TS01 @TC04
  Scenario: TS-01 TC-04 — Create schedule with only mandatory fields (list view)
    When I switch schedule to list view
    And I create a schedule with mandatory fields named "AUTO-TC04-LIST-MIN" in list view
    Then I should see schedule or milestone "AUTO-TC04-LIST-MIN" in the UI
    And I delete schedule or milestone named "AUTO-TC04-LIST-MIN" from list row menu

  @regression @positive @TS01 @TC02
  Scenario: TS-01 TC-02 — Create schedule through create button in gantt view
    When I create a schedule with mandatory fields named "AUTO-TC02-GANTT-MIN" in gantt view
    Then I should see schedule or milestone "AUTO-TC02-GANTT-MIN" in the UI
    And I switch schedule to list view
    And I delete schedule or milestone named "AUTO-TC02-GANTT-MIN" from list row menu

  @regression @positive @TS01 @TC03
  Scenario: TS-01 TC-03 — Create schedule through create button in list view
    When I create a schedule with mandatory fields named "AUTO-TC03-LIST-MIN" in list view
    Then I should see schedule or milestone "AUTO-TC03-LIST-MIN" in the UI
    And I delete schedule or milestone named "AUTO-TC03-LIST-MIN" from list row menu

  @regression @positive @TS01 @TC14
  Scenario: TS-01 TC-14 — Create schedule with all common optional fields
    When I create a schedule with all common optional fields named "AUTO-TC14-FULL"
    Then I should see schedule or milestone "AUTO-TC14-FULL" in the UI
    And I switch schedule to list view
    And I delete schedule or milestone named "AUTO-TC14-FULL" from list row menu

  @regression @positive @TS02 @TC15
  Scenario: TS-02 TC-15 — Update schedule name
    When I create a schedule with mandatory fields named "AUTO-TC15-OLD" in list view
    And I update schedule named "AUTO-TC15-OLD" to name "AUTO-TC15-NEW"
    Then I should see schedule or milestone "AUTO-TC15-NEW" in the UI
    And I delete schedule or milestone named "AUTO-TC15-NEW" from list row menu

  @regression @positive @TS05 @TC43
  Scenario: TS-05 TC-43 — Delete schedule via list view
    When I create a schedule with mandatory fields named "AUTO-TC43-DEL" in list view
    And I delete schedule or milestone named "AUTO-TC43-DEL" from list row menu
    Then the schedule form panel should be closed

  @regression @positive @TS06 @TC48
  Scenario: TS-06 TC-48 — Create milestone with only mandatory fields (list view)
    When I create a milestone with mandatory fields named "AUTO-TC48-MS-MIN" in list view
    Then I should see schedule or milestone "AUTO-TC48-MS-MIN" in the UI
    And I delete schedule or milestone named "AUTO-TC48-MS-MIN" from list row menu

  @regression @positive @TS06 @TC46
  Scenario: TS-06 TC-46 — Add milestone through create button in gantt view
    When I create a milestone with mandatory fields named "AUTO-TC46-MS-GANTT" in gantt view
    Then I should see schedule or milestone "AUTO-TC46-MS-GANTT" in the UI
    And I switch schedule to list view
    And I delete schedule or milestone named "AUTO-TC46-MS-GANTT" from list row menu

  @regression @positive @TS12 @TC92
  Scenario: TS-12 TC-92 — Click schedule today button
    When I switch schedule to gantt view
    And I click the schedule today button

  @regression @positive @TS15 @TC99
  Scenario: TS-15 TC-99 — Open create schedule off canvas and close without saving
    When I switch schedule to list view
    And I open the create schedule panel
    And I close the schedule form panel without saving
    Then the schedule form panel should be closed

  @regression @positive @TS15 @TC101
  Scenario: TS-15 TC-101 — Open create milestone off canvas and close without saving
    When I switch schedule to list view
    And I open the create milestone panel
    And I close the schedule form panel without saving
    Then the schedule form panel should be closed

  @regression @positive @TS21 @TC117 @TC118 @TC119
  Scenario: TS-21 TC-117–119 — Gantt day, week, and month views
    When I set gantt timeline to "day" view
    And I set gantt timeline to "week" view
    And I set gantt timeline to "month" view

  @regression @positive @TS22 @TC120 @TC121 @TC122
  Scenario: TS-22 TC-120–122 — Download from toolbar per view (when control exists)
    When I set gantt timeline to "day" view
    And I download from the schedule toolbar if available
    And I set gantt timeline to "week" view
    And I download from the schedule toolbar if available
    And I set gantt timeline to "month" view
    And I download from the schedule toolbar if available

  @regression @positive @TS23 @TC123
  Scenario: TS-23 TC-123 — Add child with mandatory fields
    When I create a schedule with mandatory fields named "AUTO-TC123-PARENT" in gantt view
    And I add a child schedule named "AUTO-TC123-CHILD" under parent "AUTO-TC123-PARENT"
    Then I should see schedule or milestone "AUTO-TC123-CHILD" in the UI
    And I switch schedule to list view
    And I delete schedule or milestone named "AUTO-TC123-CHILD" from list row menu
    And I delete schedule or milestone named "AUTO-TC123-PARENT" from list row menu

  @regression @positive @TS28 @TC162
  Scenario: TS-28 TC-162 — Pause child schedule from gantt menu
    When I create a schedule with mandatory fields named "AUTO-TC162-PARENT" in gantt view
    And I add a child schedule named "AUTO-TC162-CHILD" under parent "AUTO-TC162-PARENT"
    And I pause schedule "AUTO-TC162-CHILD" from gantt context menu
    And I switch schedule to list view
    And I delete schedule or milestone named "AUTO-TC162-CHILD" from list row menu
    And I delete schedule or milestone named "AUTO-TC162-PARENT" from list row menu

  @regression @positive @TS29 @TC163
  Scenario: TS-29 TC-163 — Resume child schedule from gantt menu
    When I create a schedule with mandatory fields named "AUTO-TC163-PARENT" in gantt view
    And I add a child schedule named "AUTO-TC163-CHILD" under parent "AUTO-TC163-PARENT"
    And I pause schedule "AUTO-TC163-CHILD" from gantt context menu
    And I resume schedule "AUTO-TC163-CHILD" from gantt context menu
    And I switch schedule to list view
    And I delete schedule or milestone named "AUTO-TC163-CHILD" from list row menu
    And I delete schedule or milestone named "AUTO-TC163-PARENT" from list row menu

  @regression @positive @TS30 @TS31 @TC164 @TC165
  Scenario: TS-30/TS-31 — Completed and incompleted from gantt context menu
    When I create a schedule with mandatory fields named "AUTO-TC164-SCH" in gantt view
    And I mark schedule "AUTO-TC164-SCH" completed from gantt context menu
    And I mark schedule "AUTO-TC164-SCH" incompleted from gantt context menu
    And I switch schedule to list view
    And I delete schedule or milestone named "AUTO-TC164-SCH" from list row menu

  @regression @positive @TS40 @TC178
  Scenario: TS-40 TC-178 — Filter by type schedule then clear
    When I apply schedule filter type "schedule" then clear

  @regression @positive @TS40 @TC179
  Scenario: TS-40 TC-179 — Filter by type milestone then clear
    When I apply schedule filter type "milestone" then clear

  @regression @positive @TS20 @TC115 @TC116
  Scenario: TS-20 TC-115/116 — Critical path toggle when control exists
    When I switch schedule to gantt view
    And I set critical path to "on"
    And I set critical path to "off"

  @regression @positive @TS16 @TC105
  Scenario: TS-16 TC-105 — Add baseline when baseline UI is available
    When I switch schedule to gantt view
    And I add baseline named "AUTO-BL-V1" if baseline UI is available

  @regression @positive @TS03 @TC29
  Scenario: TS-03 TC-29 — Edit schedule remove assignee
    When I create a schedule with all common optional fields named "AUTO-TC29-ASSIGN"
    And I open edit for schedule named "AUTO-TC29-ASSIGN"
    And I remove assignee on open schedule edit form
    And I save the open schedule edit form
    Then I should see schedule or milestone "AUTO-TC29-ASSIGN" in the UI
    And I delete schedule or milestone named "AUTO-TC29-ASSIGN" from list row menu
