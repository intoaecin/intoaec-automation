# -----------------------------------------------------------------------------
# Schedule — incremental manual TCs in ONE file.
#
# TS-01 Add Schedule     — @TS01 @TC01 … @TS01 @TC16  (complete)
# TS-02 Update Schedule    — starts at @TS02 @TC17
#   Add TS-02 scenarios below the TS-01 block; reuse same Background + session skip pattern.
#
# Run one case (always pass this file path):
#   npx cucumber-js features/admin/projects/managements/Schedule/Schedule_TestCases.feature --tags "@TS01 and @TC16"
#   npx cucumber-js features/admin/projects/managements/Schedule/Schedule_TestCases.feature --tags "@TS02 and @TC17"
#
# Run all TS-01:
#   npx cucumber-js features/admin/projects/managements/Schedule/Schedule_TestCases.feature --tags "@TS01"
#
# Run entire file (one browser session; Background skips repeat login when already on Schedule):
#   npx cucumber-js features/admin/projects/managements/Schedule/Schedule_TestCases.feature
#
# npm (extra args after `--`):
#   npm run test:admin:projects:managements:schedule:tc -- --tags "@TS02 and @TC17"
#
# Shorthand scripts exist for TC01 and TC02 only; add more shorthands or use the line above.
#
# Layering: `AGENTS.md` — scenarios here; logic in pages/.../Schedule/SchedulePage.js;
#            step-definitions/.../Schedule/ScheduleStep.js
# -----------------------------------------------------------------------------

@schedule
Feature: Schedule — incremental test cases

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Project Management" heading
    And I click the "Schedule" module card
    And I wait for the schedule module to load

  # ===========================================================================

  # TS-01 — Add Schedule (@TS01 @TC01 … @TS01 @TC16)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Add schedule from Gantt tab (quick add) and validate gantt sidebar, timeline, list
    When I switch schedule to gantt view
    And I open quick add schedule from the gantt sidebar
    Then the gantt sidebar quick add name field should be visible
    When I enter schedule name quick add field with "phase 1"
    And I confirm quick add schedule with tick in gantt sidebar
    Then I should see schedule "phase 1" in the gantt sidebar list
    And in gantt sidebar list schedule "phase 1" start and end calendar dates match
    And in gantt sidebar list schedule "phase 1" completion displays 0%
    Then schedule name "phase 1" should be visible in the gantt chart area
    When I switch schedule to list view
    Then I should see schedule or milestone "phase 1" in the UI
    And in list tab schedule "phase 1" start, end, and created on calendar dates match
    And in list tab schedule "phase 1" duration shows one working day
    And in list tab schedule "phase 1" completion displays 0%
    And in list tab schedule "phase 1" assignee shows Unassigned

  # --- TC-02 (Create menu off-canvas, mandatory + High + random dates) -------
  @TS01 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Add schedule through Create button in Gantt view (mandatory fields)
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 2"
    And I choose priority High in the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I submit the schedule create form
    Then I should see schedule "phase 2" in the gantt sidebar list

  # --- TC-03 (Create menu off-canvas from list view, mandatory + Low + random dates) ------
  @TS01 @TC03 @smoke @regression @positive
  Scenario: TC-03 — Add schedule through Create button in list view (mandatory fields)
    When I switch schedule to list view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 3"
    And I choose priority Low in the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I submit the schedule create form
    When I switch schedule to gantt view
    Then I should see schedule "phase 3" in the gantt sidebar list

  # --- TC-04 (Create off-canvas, assignees + random dates, Gantt verify) -----------------
  @TS01 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Create schedule with assignees in Gantt view
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 4"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I submit the schedule create form
    Then I should see schedule "phase 4" in the gantt sidebar list

  # --- TC-05 (assignees + priority + status + completion 50%, Gantt verify) ---------------
  @TS01 @TC05 @smoke @regression @positive
  Scenario: TC-05 — Create schedule with assignees, status, and completion in Gantt view
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 5"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I choose status In Progress in the schedule create form
    Then the schedule create form completion should display 50%
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I submit the schedule create form
    Then I should see schedule "phase 5" in the gantt sidebar list

  # --- TC-06 (assignees + priority + manual random completion %, Gantt verify) --------------
  @TS01 @TC06 @smoke @regression @positive
  Scenario: TC-06 — Create schedule with assignees, priority, and random completion in Gantt view
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 6"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I submit the schedule create form
    Then I should see schedule "phase 6" in the gantt sidebar list

  # --- TC-07 (assignees + priority + completion + schedule color, Gantt verify) -----------
  @TS01 @TC07 @smoke @regression @positive
  Scenario: TC-07 — Create schedule with assignees, priority, completion, and schedule color in Gantt view
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 7"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I pick a random schedule color on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I submit the schedule create form
    Then I should see schedule "phase 7" in the gantt sidebar list

  # --- TC-08 (assignees + priority + completion + hex color code, Gantt verify) ----------
  @TS01 @TC08 @smoke @regression @positive
  Scenario: TC-08 — Create schedule with assignees, priority, completion, and hex color code in Gantt view
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 8"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I submit the schedule create form
    Then I should see schedule "phase 8" in the gantt sidebar list

  # --- TC-09 (TC-08 fields + description, Gantt verify) -----------------------------------
  @TS01 @TC09 @smoke @regression @positive
  Scenario: TC-09 — Create schedule with assignees, priority, completion, hex color, and description in Gantt view
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 9"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I enter a random description on the schedule create form
    And I submit the schedule create form
    Then I should see schedule "phase 9" in the gantt sidebar list

  # --- TC-10 (new task + Task kanban verify) ----------------------------------------------
  @TS01 @TC10 @smoke @regression @positive
  Scenario: TC-10 — Create schedule with new task and verify in Task todo kanban
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 10"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I enter a random description on the schedule create form
    And I expand additional details on the schedule create form
    And I add a new task named "phase 10" on the schedule create form
    And I select one assignee on the schedule create form task
    And I pick a random weekday end datetime on the schedule create form task
    And I submit the schedule create form
    Then I should see schedule "phase 10" in the gantt sidebar list
    When I click back from the project module
    And I open the Task module from project management
    Then task "phase 10" should be visible in the todo kanban

  # --- TC-11 (new task In Progress + Task kanban verify) ----------------------------------
  @TS01 @TC11 @smoke @regression @positive
  Scenario: TC-11 — Create schedule with new task In Progress and verify in Task todo kanban
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 11"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I enter a random description on the schedule create form
    And I expand additional details on the schedule create form
    And I add a new task named "phase 11" on the schedule create form
    And I set the schedule create form task status to In Progress
    And I select one assignee on the schedule create form task
    And I pick a random weekday end datetime on the schedule create form task
    And I submit the schedule create form
    Then I should see schedule "phase 11" in the gantt sidebar list
    When I click back from the project module
    And I open the Task module from project management
    Then task "phase 11" should be visible in the todo kanban

  # --- TC-12 (new task Completed + Task kanban verify) ------------------------------------
  @TS01 @TC12 @smoke @regression @positive
  Scenario: TC-12 — Create schedule with new task Completed and verify in Task todo kanban
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 12"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I enter a random description on the schedule create form
    And I expand additional details on the schedule create form
    And I add a new task named "phase 12" on the schedule create form
    And I set the schedule create form task status to Completed
    And I select one assignee on the schedule create form task
    And I pick a random weekday end datetime on the schedule create form task
    And I submit the schedule create form
    Then I should see schedule "phase 12" in the gantt sidebar list
    When I click back from the project module
    And I open the Task module from project management
    Then task "phase 12" should be visible in the todo kanban

  # --- TC-13 (existing task + linked schedule verify) -------------------------------------
  @TS01 @TC13 @smoke @regression @positive
  Scenario: TC-13 — Create schedule with existing task and verify linked schedule on kanban card
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 13"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I enter a random description on the schedule create form
    And I expand additional details on the schedule create form
    And I select a random existing task on the schedule create form
    And I submit the schedule create form
    Then I should see schedule "phase 13" in the gantt sidebar list

  # --- TC-14 (existing task + reminder, Gantt verify) -------------------------------------
  @TS01 @TC14 @smoke @regression @positive
  Scenario: TC-14 — Create schedule with existing task and reminder in Gantt view
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 14"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I enter a random description on the schedule create form
    And I expand additional details on the schedule create form
    And I select a random existing task on the schedule create form
    And I add a random reminder on the schedule create form
    And I submit the schedule create form
    Then I should see schedule "phase 14" in the gantt sidebar list

  # --- TC-15 (existing task + reminder in weeks, Gantt verify) --------------------------
  @TS01 @TC15 @smoke @regression @positive
  Scenario: TC-15 — Create schedule with existing task, reminder, and weeks unit in Gantt view
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "phase 15"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I enter a random description on the schedule create form
    And I expand additional details on the schedule create form
    And I select a random existing task on the schedule create form
    And I add a random reminder on the schedule create form
    And I set the schedule create form reminder unit to weeks
    And I submit the schedule create form
    Then I should see schedule "phase 15" in the gantt sidebar list

  # --- TC-16 (phase + full form + task + reminder — capstone Gantt create) ----------------
  @TS01 @TC16 @smoke @regression @positive
  Scenario: TC-16 — Create schedule with phase, full optional fields, task, and reminder in Gantt view
    When I switch schedule to gantt view
    And I open the create schedule panel
    Then the add schedule off canvas should be open
    When I fill the schedule create form with name "FINAL OF 1ST TEST SCENARIO"
    And I select a random phase on the schedule create form
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I pick a random weekday end datetime after start in the schedule create form
    And I enter a random description on the schedule create form
    And I expand additional details on the schedule create form
    And I select a random existing task on the schedule create form
    And I add a random reminder on the schedule create form
    And I submit the schedule create form
    Then I should see schedule "FINAL OF 1ST TEST SCENARIO" in the gantt sidebar list

  # ===========================================================================
  # TS-02 — Update Schedule (@TS02 @TC17+)
  # ===========================================================================

  # --- TC-17 (update schedule name from Gantt row menu) ----------------------
  @TS02 @TC17 @smoke @regression @positive
  Scenario: TC-17 — Update schedule name from Gantt tab
    When I switch schedule to gantt view
    And I update schedule "FINAL OF 1ST TEST SCENARIO" to "SECOND SCENARIO" from the gantt sidebar row menu
    Then I should see schedule "SECOND SCENARIO" in the gantt sidebar list

  # --- TC-18 (update schedule phase in edit) -------------------------------
  @TS02 @TC18 @regression @positive
  Scenario: TC-18 — Update schedule phase
    When I switch schedule to list view
    And I update schedule "SECOND SCENARIO" phase from the list row menu
    Then I should see schedule or milestone "SECOND SCENARIO" in the UI

  # --- TC-19 (add/change schedule phase in edit) ---------------------------
  @TS02 @TC19 @regression @positive
  Scenario: TC-19 — Add schedule phase in edit
    When I switch schedule to list view
    And I add or change schedule "SECOND SCENARIO" phase from the list row menu
    Then I should see schedule or milestone "SECOND SCENARIO" in the UI

  # --- TC-20 (update schedule assignee in edit) ----------------------------
  @TS02 @TC20 @regression @positive
  Scenario: TC-20 — Update schedule assignee
    When I switch schedule to list view
    And I update schedule "SECOND SCENARIO" assignee from the list row menu
    Then I should see schedule or milestone "SECOND SCENARIO" in the UI

  # --- TC-21 (update schedule priority in edit) ----------------------------
  @TS02 @TC21 @regression @positive
  Scenario: TC-21 — Update schedule priority
    When I switch schedule to list view
    And I update schedule "phase 4" priority to Low from the list row menu
    Then I should see schedule or milestone "phase 4" in the UI

  # --- TC-22 (update schedule status in edit) ------------------------------
  @TS02 @TC22 @regression @positive
  Scenario: TC-22 — Update schedule status
    When I switch schedule to list view
    And I update schedule "phase 5" status to Completed from the list row menu
    Then I should see schedule or milestone "phase 5" in the UI

  # --- TC-23 (update schedule completion in edit) --------------------------
  @TS02 @TC23 @regression @positive
  Scenario: TC-23 — Update schedule completion percent
    When I switch schedule to list view
    And I update schedule "phase 5" completion percent from 0 to 99 from the list row menu
    Then I should see schedule or milestone "phase 5" in the UI

  # --- TC-24 (update random schedule start date in edit) -------------------
  @TS02 @TC24 @regression @positive
  Scenario: TC-24 — Update schedule start date
    When I switch schedule to list view
    And I update a random schedule start date from the list row menu
    Then the schedule form panel should be closed

  # --- TC-25 (update random schedule duration in edit) ---------------------
  @TS02 @TC25 @regression @positive
  Scenario: TC-25 — Update schedule duration
    When I switch schedule to list view
    And I update a random schedule duration from the list row menu
    Then the schedule form panel should be closed

  # --- TC-26 (update random schedule description in edit) ------------------
  @TS02 @TC26 @regression @positive
  Scenario: TC-26 — Update schedule description
    When I switch schedule to list view
    And I update a random schedule description from the list row menu
    Then the schedule form panel should be closed

  # --- TC-27 (add task to random schedule in edit) -------------------------
  @TS02 @TC27 @regression @positive
  Scenario: TC-27 — Update schedule by adding task
    When I switch schedule to list view
    And I add a random task to a random schedule from the list row menu
    Then the schedule form panel should be closed

  # --- TC-28 (add reminder to random schedule in edit) ---------------------
  @TS02 @TC28 @regression @positive
  Scenario: TC-28 — Update schedule by adding reminder
    When I switch schedule to list view
    And I add a random reminder to a random schedule from the list row menu
    Then the schedule form panel should be closed

  # --- TC-29 (update all schedule fields in one edit) ----------------------
  @TS02 @TC29 @regression @positive
  Scenario: TC-29 — Update schedule with all fields at once
    When I switch schedule to list view
    And I update schedule "SECOND SCENARIO" to "3RD SCENARIO" with all fields from the list row menu
    Then the schedule form panel should be closed
