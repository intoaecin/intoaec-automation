# -----------------------------------------------------------------------------
# Schedule — incremental manual TCs in ONE file.
#
# TS-01 Add Schedule     — @TS01 @TC01 … @TS01 @TC16  (complete)
# TS-02 Update Schedule    — @TS02 @TC17 … @TS02 @TC29  (complete)
# TS-03 Remove in edit     — @TS03 @TC30 … @TS03 @TC35  (TC-35 depends on TC-15 → "phase 15")
# TS-04 Delete Schedule    — @TS04 @TC36 … @TS04 @TC38
# TS-06 Add Milestone      — @TS06 @TC40 … @TS06 @TC50
# TS-07 Update Milestone   — @TS07 @TC51 … @TS07 @TC61
# TS-08 Remove Milestone   — @TS08 @TC62 … @TS08 @TC66
# TS-10 Delete Milestone   — @TS10 @TC81 … @TS10 @TC84
# TS-11 Activity Tracker   — @TS11 @TC85 … @TS11 @TC93
# TS-12 Today Button       — @TS12 @TC94
# TS-13 Working Calendar   — @TS13 @TC95 … @TS13 @TC98
# TS-14 Remove Off Days    — @TS14 @TC99 … @TS14 @TC100
#
# Run one case (always pass this file path):
#   npx cucumber-js features/admin/projects/managements/Schedule/Schedule_TestCases.feature --tags "@TS01 and @TC16"
#   npx cucumber-js features/admin/projects/managements/Schedule/Schedule_TestCases.feature --tags "@TS02 and @TC17"
#   npx cucumber-js features/admin/projects/managements/Schedule/Schedule_TestCases.feature --tags "@TS03 and @TC30"
#   npx cucumber-js features/admin/projects/managements/Schedule/Schedule_TestCases.feature --tags "@TS04 and @TC36"
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
  Scenario: TC-29 — Edit SECOND SCENARIO with all schedule fields
    When I switch schedule to list view
    And I search for schedule "SECOND SCENARIO" in the schedule list
    And I open the edit option for schedule "SECOND SCENARIO" from the list row menu
    Then the edit schedule off canvas should be open
    When I replace the open schedule name with "3RD SCENARIO"
    And I select another phase on the schedule form
    And I choose priority Low in the schedule create form
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose status Completed in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I enter a random duration on the schedule create form
    And I enter a random description on the schedule create form
    And I expand additional details on the schedule create form
    And I select a random existing task on the schedule create form
    And I add a new task named "2nd" on the schedule create form
    And I set the schedule create form task status to Completed
    And I select one assignee on the schedule create form task
    And I pick a random weekday end datetime on the schedule create form task
    And I add a random reminder on the schedule create form
    And I set the schedule create form reminder unit to weeks
    And I save the open schedule edit form
    Then the schedule form panel should be closed

  # ===========================================================================
  # TS-03 — Remove schedule fields in edit (@TS03 @TC30+)
  # Depends on TS-02 TC-29 creating "3RD SCENARIO" with assignees, phase, tasks, reminders.
  # ===========================================================================

  # --- TC-30 (edit schedule — remove assignee) -------------------------------
  @TS03 @TC30 @regression @positive
  Scenario: TC-30 — Edit schedule remove assignee
    When I switch schedule to list view
    And I search for schedule "3RD SCENARIO" in the schedule list
    And I open the edit option for schedule "3RD SCENARIO" from the list row menu
    Then the edit schedule off canvas should be open
    When I remove assignee on open schedule edit form
    Then the schedule create form assignees field should be empty
    When I save the open schedule edit form
    Then the schedule form panel should be closed

  # --- TC-31 (edit schedule — remove description) ----------------------------
  @TS03 @TC31 @regression @positive
  Scenario: TC-31 — Edit schedule by removing description
    When I switch schedule to list view
    And I open the edit option for a random schedule from the list row menu
    Then the edit schedule off canvas should be open
    When I clear the description on the open schedule edit form
    Then the schedule create form description field should be empty
    When I save the open schedule edit form
    Then the schedule form panel should be closed

  # --- TC-32 (edit schedule — remove task) -----------------------------------
  @TS03 @TC32 @regression @positive
  Scenario: TC-32 — Edit schedule by removing task
    When I switch schedule to list view
    And I open the edit option for schedule "phase 10" from the list row menu
    Then the edit schedule off canvas should be open
    When I expand additional details on the schedule create form
    And I scroll down on the schedule create form
    And I remove the first task on the open schedule edit form
    Then the first task should be removed on the open schedule edit form
    When I save the open schedule edit form
    Then the schedule form panel should be closed

  # --- TC-33 (edit schedule — remove reminder) -------------------------------
  @TS03 @TC33 @regression @positive
  Scenario: TC-33 — Edit schedule by removing reminder
    When I switch schedule to list view
    And I open the edit option for schedule "phase 14" from the list row menu
    Then the edit schedule off canvas should be open
    When I expand additional details on the schedule create form
    And I remove the first reminder on the open schedule edit form
    Then the first reminder should be removed on the open schedule edit form
    When I save the open schedule edit form
    Then the schedule form panel should be closed

  # --- TC-34 (edit schedule — remove phase) ----------------------------------
  @TS03 @TC34 @regression @positive
  Scenario: TC-34 — Edit schedule remove phase
    When I switch schedule to list view
    And I search for schedule "3RD SCENARIO" in the schedule list
    And I open the edit option for schedule "3RD SCENARIO" from the list row menu
    Then the edit schedule off canvas should be open
    When I clear the phase on the open schedule edit form
    Then the schedule create form phase field should be empty
    When I save the open schedule edit form
    Then the schedule form panel should be closed

  # --- TC-35 (edit schedule — remove all added fields at once) ---------------
  # Depends on TS-01 TC-15 creating "phase 15" with phase, assignees, description, task, reminder.
  @TS03 @TC35 @regression @positive
  Scenario: TC-35 — Edit schedule remove all added fields at once
    When I switch schedule to list view
    And I search for schedule "phase 15" in the schedule list
    And I open the edit option for schedule "phase 15" from the list row menu
    Then the edit schedule off canvas should be open
    When I clear the phase on the open schedule edit form
    Then the schedule create form phase field should be empty
    When I remove assignee on open schedule edit form
    Then the schedule create form assignees field should be empty
    When I clear the description on the open schedule edit form
    Then the schedule create form description field should be empty
    When I expand additional details on the schedule create form
    And I scroll down on the schedule create form
    And I remove all tasks on the open schedule edit form
    Then all tasks should be removed on the open schedule edit form
    And I remove all reminders on the open schedule edit form
    Then all reminders should be removed on the open schedule edit form
    When I save the open schedule edit form
    Then the schedule form panel should be closed

  # ===========================================================================
  # TS-04 — Delete Schedule (@TS04 @TC36+)
  # Each case deletes a random visible schedule; run after prior TS blocks have created data.
  # ===========================================================================

  # --- TC-36 (delete schedule via gantt sidebar list row menu) -------------
  @TS04 @TC36 @regression @positive
  Scenario: TC-36 — Delete a schedule via gantt list view
    When I switch schedule to gantt view
    And I delete a random schedule from the gantt sidebar list row menu
    Then the last deleted schedule should no longer be visible in the schedule UI

  # --- TC-37 (delete schedule via gantt chart context menu) ----------------
  @TS04 @TC37 @regression @positive
  Scenario: TC-37 — Delete a schedule via gantt view
    When I switch schedule to gantt view
    And I delete a random schedule from the gantt chart context menu
    Then the last deleted schedule should no longer be visible in the schedule UI

  # --- TC-38 (delete schedule via list row menu) ---------------------------
  @TS04 @TC38 @regression @positive
  Scenario: TC-38 — Delete schedule via list view
    When I switch schedule to list view
    And I delete a random schedule from the list row menu
    Then the last deleted schedule should no longer be visible in the schedule UI

  # ===========================================================================
  # TS-06 — Add Milestone (@TS06 @TC40+)
  # ===========================================================================

  @TS06 @TC40 @smoke @regression @positive
  Scenario: TC-40 — Add milestone in gantt off tab
    When I switch schedule to gantt view
    And I open quick add milestone from the gantt sidebar
    Then the gantt sidebar quick add milestone field should be visible
    When I enter milestone name quick add field with "milestone 1"
    And I confirm quick add milestone with tick in gantt sidebar
    Then I should see schedule "milestone 1" in the gantt sidebar list
    And in gantt sidebar list schedule "milestone 1" start and end calendar dates match
    And in gantt sidebar list schedule "milestone 1" completion displays 0%
    Then schedule name "milestone 1" should be visible in the gantt chart area
    When I switch schedule to list view
    Then I should see schedule or milestone "milestone 1" in the UI
    And in list tab schedule "milestone 1" start and end calendar dates match
    And in list tab schedule "milestone 1" duration shows one working day
    And in list tab schedule "milestone 1" completion displays 0%
    And in list tab schedule "milestone 1" assignee shows Unassigned

  @TS06 @TC41 @regression @positive
  Scenario: TC-41 — Add milestone through create button in gantt view
    When I switch schedule to gantt view
    And I open the create milestone panel
    Then the add milestone off canvas should be open
    When I fill the schedule create form with name "milestone 2"
    And I choose priority High in the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I submit the schedule create form
    Then I should see schedule "milestone 2" in the gantt sidebar list

  @TS06 @TC42 @regression @positive
  Scenario: TC-42 — Create milestone with adding assignee
    When I switch schedule to gantt view
    And I open the create milestone panel
    Then the add milestone off canvas should be open
    When I fill the schedule create form with name "milestone 3"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I submit the schedule create form
    Then I should see schedule "milestone 3" in the gantt sidebar list

  @TS06 @TC43 @regression @positive
  Scenario: TC-43 — Create milestone with adding status
    When I switch schedule to gantt view
    And I open the create milestone panel
    Then the add milestone off canvas should be open
    When I fill the schedule create form with name "milestone 4"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I choose status In Progress in the schedule create form
    Then the schedule create form completion should display 50%
    When I pick a random weekday start datetime in the schedule create form
    And I submit the schedule create form
    Then I should see schedule "milestone 4" in the gantt sidebar list

  @TS06 @TC44 @regression @positive
  Scenario: TC-44 — Create milestone with completion percent
    When I switch schedule to gantt view
    And I open the create milestone panel
    Then the add milestone off canvas should be open
    When I fill the schedule create form with name "milestone 5"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I submit the schedule create form
    Then I should see schedule "milestone 5" in the gantt sidebar list

  @TS06 @TC45 @regression @positive
  Scenario: TC-45 — Create milestone with schedule color
    When I switch schedule to gantt view
    And I open the create milestone panel
    Then the add milestone off canvas should be open
    When I fill the schedule create form with name "milestone 6"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I pick a random schedule color on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I submit the schedule create form
    Then I should see schedule "milestone 6" in the gantt sidebar list

  @TS06 @TC46 @regression @positive
  Scenario: TC-46 — Create milestone with description
    When I switch schedule to gantt view
    And I open the create milestone panel
    Then the add milestone off canvas should be open
    When I fill the schedule create form with name "milestone 7"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I enter a random description on the schedule create form
    And I submit the schedule create form
    Then I should see schedule "milestone 7" in the gantt sidebar list

  @TS06 @TC47 @regression @positive
  Scenario: TC-47 — Create milestone with new task
    When I switch schedule to gantt view
    And I open the create milestone panel
    Then the add milestone off canvas should be open
    When I fill the schedule create form with name "milestone 8"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I enter a random description on the schedule create form
    And I expand additional details on the schedule create form
    And I add a new task named "milestone 10" on the schedule create form
    And I select one assignee on the schedule create form task
    And I pick a random weekday end datetime on the schedule create form task
    And I submit the schedule create form
    Then I should see schedule "milestone 8" in the gantt sidebar list
    When I click back from the project module
    And I open the Task module from project management
    Then task "milestone 10" should be visible in the todo kanban

  @TS06 @TC48 @regression @positive
  Scenario: TC-48 — Create milestone with existing task
    When I switch schedule to gantt view
    And I open the create milestone panel
    Then the add milestone off canvas should be open
    When I fill the schedule create form with name "milestone 9"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I enter a random description on the schedule create form
    And I expand additional details on the schedule create form
    And I select a random existing task on the schedule create form
    And I submit the schedule create form
    Then I should see schedule "milestone 9" in the gantt sidebar list

  @TS06 @TC49 @regression @positive
  Scenario: TC-49 — Create milestone with reminder
    When I switch schedule to gantt view
    And I open the create milestone panel
    Then the add milestone off canvas should be open
    When I fill the schedule create form with name "milestone 10"
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I enter a random description on the schedule create form
    And I expand additional details on the schedule create form
    And I select a random existing task on the schedule create form
    And I add a random reminder on the schedule create form
    And I submit the schedule create form
    Then I should see schedule "milestone 10" in the gantt sidebar list

  @TS06 @TC50 @regression @positive
  Scenario: TC-50 — Create milestone MILESTONE with phase and full fields
    When I switch schedule to gantt view
    And I open the create milestone panel
    Then the add milestone off canvas should be open
    When I fill the schedule create form with name "MILESTONE"
    And I select a random phase on the schedule create form
    And I open the assignees dropdown on the schedule create form
    Then the schedule create form assignees list should be visible
    When I select up to 2 assignees on the schedule create form
    And I choose priority High in the schedule create form
    And I enter a random completion percent from 0 to 100 on the schedule create form
    And I enter a random hex color code on the schedule create form
    And I pick a random weekday start datetime in the schedule create form
    And I enter a random description on the schedule create form
    And I expand additional details on the schedule create form
    And I select a random existing task on the schedule create form
    And I add a random reminder on the schedule create form
    And I submit the schedule create form
    Then I should see schedule "MILESTONE" in the gantt sidebar list

  # ===========================================================================
  # TS-07 — Update Milestone (@TS07 @TC51+)
  # ===========================================================================

  @TS07 @TC51 @regression @positive
  Scenario: TC-51 — Update milestone name
    When I switch schedule to gantt view
    And I update schedule "MILESTONE" to "MILESTONE UPDATE" from the gantt sidebar row menu
    Then I should see schedule "MILESTONE UPDATE" in the gantt sidebar list

  @TS07 @TC52 @regression @positive
  Scenario: TC-52 — Update milestone phase
    When I switch schedule to list view
    And I search for schedule "MILESTONE UPDATE" in the schedule list
    And I open the edit option for schedule "MILESTONE UPDATE" from the list row menu
    Then the edit schedule off canvas should be open
    When I select a random phase on the schedule create form
    And I save the open schedule edit form
    Then the schedule form panel should be closed

  @TS07 @TC53 @regression @positive
  Scenario: TC-53 — Add milestone phase in edit
    When I switch schedule to list view
    And I search for schedule "milestone 1" in the schedule list
    And I open the edit option for schedule "milestone 1" from the list row menu
    Then the edit schedule off canvas should be open
    When I select a random phase on the schedule create form
    And I save the open schedule edit form
    Then the schedule form panel should be closed

  @TS07 @TC54 @regression @positive
  Scenario: TC-54 — Update milestone assignee
    When I switch schedule to list view
    And I update schedule "MILESTONE UPDATE" assignee from the list row menu
    Then I should see schedule or milestone "MILESTONE UPDATE" in the UI

  @TS07 @TC55 @regression @positive
  Scenario: TC-55 — Update milestone priority
    When I switch schedule to list view
    And I update schedule "milestone 1" priority to Low from the list row menu
    Then I should see schedule or milestone "milestone 1" in the UI

  @TS07 @TC56 @regression @positive
  Scenario: TC-56 — Update milestone status
    When I switch schedule to list view
    And I update schedule "milestone 2" status to Completed from the list row menu
    Then I should see schedule or milestone "milestone 2" in the UI

  @TS07 @TC57 @regression @positive
  Scenario: TC-57 — Update milestone completion percent
    When I switch schedule to list view
    And I update schedule "milestone 2" completion percent from 0 to 99 from the list row menu
    Then I should see schedule or milestone "milestone 2" in the UI

  @TS07 @TC58 @regression @positive
  Scenario: TC-58 — Update milestone start date
    When I switch schedule to list view
    And I update schedule "milestone 2" start date from the list row menu
    Then the schedule form panel should be closed

  @TS07 @TC59 @regression @positive
  Scenario: TC-59 — Update milestone description
    When I switch schedule to list view
    And I update schedule "milestone 7" description from the list row menu
    Then the schedule form panel should be closed

  @TS07 @TC60 @regression @positive
  Scenario: TC-60 — Update milestone add task
    When I switch schedule to list view
    And I add an existing task to schedule "milestone 9" from the list row menu
    Then the schedule form panel should be closed

  @TS07 @TC61 @regression @positive
  Scenario: TC-61 — Update milestone by add reminder
    When I switch schedule to list view
    And I add a reminder to schedule "milestone 10" from the list row menu
    Then the schedule form panel should be closed

  # ===========================================================================
  # TS-08 — Remove milestone fields in edit (@TS08 @TC62+)
  # ===========================================================================

  @TS08 @TC62 @regression @positive
  Scenario: TC-62 — Edit milestone remove assignee
    When I switch schedule to list view
    And I search for schedule "MILESTONE UPDATE" in the schedule list
    And I open the edit option for schedule "MILESTONE UPDATE" from the list row menu
    Then the edit schedule off canvas should be open
    When I remove assignee on open schedule edit form
    Then the schedule create form assignees field should be empty
    When I save the open schedule edit form
    Then the schedule form panel should be closed

  @TS08 @TC63 @regression @positive
  Scenario: TC-63 — Edit milestone by removing description
    When I switch schedule to list view
    And I search for schedule "milestone 7" in the schedule list
    And I open the edit option for schedule "milestone 7" from the list row menu
    Then the edit schedule off canvas should be open
    When I clear the description on the open schedule edit form
    Then the schedule create form description field should be empty
    When I save the open schedule edit form
    Then the schedule form panel should be closed

  @TS08 @TC64 @regression @positive
  Scenario: TC-64 — Edit milestone by removing task
    When I switch schedule to list view
    And I search for schedule "milestone 9" in the schedule list
    And I open the edit option for schedule "milestone 9" from the list row menu
    Then the edit schedule off canvas should be open
    When I expand additional details on the schedule create form
    And I remove the first task on the open schedule edit form
    Then the first task should be removed on the open schedule edit form
    When I save the open schedule edit form
    Then the schedule form panel should be closed

  @TS08 @TC65 @regression @positive
  Scenario: TC-65 — Edit milestone by removing reminder
    When I switch schedule to list view
    And I search for schedule "milestone 10" in the schedule list
    And I open the edit option for schedule "milestone 10" from the list row menu
    Then the edit schedule off canvas should be open
    When I expand additional details on the schedule create form
    And I remove the first reminder on the open schedule edit form
    Then the first reminder should be removed on the open schedule edit form
    When I save the open schedule edit form
    Then the schedule form panel should be closed

  @TS08 @TC66 @regression @positive
  Scenario: TC-66 — Edit milestone remove phase
    When I switch schedule to list view
    And I search for schedule "MILESTONE UPDATE" in the schedule list
    And I open the edit option for schedule "MILESTONE UPDATE" from the list row menu
    Then the edit schedule off canvas should be open
    When I clear the phase on the open schedule edit form
    Then the schedule create form phase field should be empty
    When I save the open schedule edit form
    Then the schedule form panel should be closed

  # ===========================================================================
  # TS-10 — Delete Milestone (@TS10 @TC81+)
  # ===========================================================================

  @TS10 @TC81 @regression @positive
  Scenario: TC-81 — Delete a milestone via gantt view
    When I switch schedule to gantt view
    And I delete schedule or milestone named "milestone 8" from the gantt sidebar row menu
    Then schedule or milestone "milestone 8" should not be visible in the schedule UI

  @TS10 @TC82 @regression @positive
  Scenario: TC-82 — Delete a milestone via gantt tab
    When I switch schedule to gantt view
    And I delete schedule or milestone named "milestone 6" from the gantt sidebar row menu
    Then schedule or milestone "milestone 6" should not be visible in the schedule UI

  @TS10 @TC83 @regression @positive
  Scenario: TC-83 — Delete milestone via list view
    When I switch schedule to list view
    And I delete schedule or milestone named "milestone 5" from list row menu
    Then schedule or milestone "milestone 5" should not be visible in the schedule UI

  @TS10 @TC84 @regression @positive
  Scenario: TC-84 — Delete parent schedule
    When I switch schedule to list view
    And I delete schedule or milestone named "milestone 3" from list row menu
    Then schedule or milestone "milestone 3" should not be visible in the schedule UI

  # ===========================================================================
  # TS-11 — Activity Tracker (@TS11 @TC85+)
  # ===========================================================================

  @TS11 @TC85 @regression @positive
  Scenario: TC-85 — Add schedule and check activity tracker
    When I enable the schedule live mode toggle
    And I switch schedule to gantt view
    And I open quick add schedule from the gantt sidebar
    Then the gantt sidebar quick add name field should be visible
    When I enter schedule name quick add field with "phase 16"
    And I confirm quick add schedule with tick in gantt sidebar
    Then I should see schedule "phase 16" in the gantt sidebar list
    When I click back from the project module
    And I open Activity Tracker from the sidebar
    Then the activity log should contain "created a schedule phase 16"

  @TS11 @TC86 @regression @positive
  Scenario: TC-86 — Update schedule and check activity tracker
    When I switch schedule to gantt view
    And I search for schedule "phase 16" in the schedule list
    And I open the edit option for schedule "phase 16" from the list row menu
    Then the edit schedule off canvas should be open
    When I replace the open schedule name with "phase 17"
    And I save the open schedule edit form
    When I click back from the project module
    And I open Activity Tracker from the sidebar
    Then the activity log should contain "updated a schedule phase 17"

  @TS11 @TC87 @regression @positive
  Scenario: TC-87 — Delete schedule and check activity tracker
    When I switch schedule to gantt view
    And I delete a random schedule from the gantt sidebar list row menu
    When I click back from the project module
    And I open Activity Tracker from the sidebar
    Then the activity log should contain "deleted a schedule"

  @TS11 @TC88 @regression @positive
  Scenario: TC-88 — Add milestone and check activity tracker
    When I switch schedule to gantt view
    And I open quick add milestone from the gantt sidebar
    Then the gantt sidebar quick add milestone field should be visible
    When I enter milestone name quick add field with "milestone 11"
    And I confirm quick add milestone with tick in gantt sidebar
    Then I should see schedule "milestone 11" in the gantt sidebar list
    When I click back from the project module
    And I open Activity Tracker from the sidebar
    Then the activity log should contain "created a milestone"

  @TS11 @TC89 @regression @positive
  Scenario: TC-89 — Update milestone and check activity tracker
    When I switch schedule to gantt view
    And I search for schedule "milestone 11" in the schedule list
    And I open the edit option for schedule "milestone 11" from the list row menu
    Then the edit schedule off canvas should be open
    When I replace the open schedule name with "milestone 12"
    And I save the open schedule edit form
    When I click back from the project module
    And I open Activity Tracker from the sidebar
    Then the activity log should contain "updated a milestone"

  @TS11 @TC90 @regression @positive
  Scenario: TC-90 — Delete milestone and check activity tracker
    When I switch schedule to gantt view
    And I delete schedule or milestone named "milestone 11" from the gantt sidebar row menu
    When I click back from the project module
    And I open Activity Tracker from the sidebar
    Then the activity log should contain "delete a milestone"

  @TS11 @TC91 @regression @positive
  Scenario: TC-91 — Add working calendar off days and check activity tracker
    When I open the working calendar dialog
    And I toggle working calendar day "Mon"
    And I save the working calendar dialog
    Then the working calendar updated toast should appear
    When I click back from the project module
    And I open Activity Tracker from the sidebar
    Then the activity log should contain "updated working days"

  @TS11 @TC92 @regression @positive
  Scenario: TC-92 — Remove working calendar off days and check activity tracker
    When I open the working calendar dialog
    And I toggle working calendar day "Mon"
    And I save the working calendar dialog
    Then the working calendar updated toast should appear
    When I click back from the project module
    And I open Activity Tracker from the sidebar
    Then the activity log should contain "updated working days"

  @TS11 @TC93 @regression @positive
  Scenario: TC-93 — Adjust working hours and check activity tracker
    When I open the working calendar dialog
    And I set working calendar start time to AM hours
    And I set working calendar end time to PM hours
    And I save the working calendar dialog
    Then the working calendar updated toast should appear
    When I click back from the project module
    And I open Activity Tracker from the sidebar
    Then the activity log should contain "updated working days"

  # ===========================================================================
  # TS-12 — Today button (@TS12 @TC94)
  # ===========================================================================

  @TS12 @TC94 @regression @positive
  Scenario: TC-94 — Click schedule today button
    When I switch schedule to gantt view
    And I click the schedule today button
    Then the today indicator should be visible in the gantt chart

  # ===========================================================================
  # TS-13 — Working calendar add (@TS13 @TC95+)
  # ===========================================================================

  @TS13 @TC95 @regression @positive
  Scenario: TC-95 — Working calendar add off days in working hours
    When I open the working calendar dialog
    And I toggle working calendar days "Mon" and "Fri"
    And I save the working calendar dialog
    Then the working calendar updated toast should appear

  @TS13 @TC96 @regression @positive
  Scenario: TC-96 — Working calendar add public holiday
    When I open the working calendar dialog
    And I add a public holiday named "Test Holiday" in the working calendar dialog
    And I save the working calendar dialog
    Then the working calendar updated toast should appear

  @TS13 @TC97 @regression @positive
  Scenario: TC-97 — Working calendar change start hours
    When I open the working calendar dialog
    And I set working calendar start time to AM hours
    And I save the working calendar dialog
    Then the working calendar updated toast should appear

  @TS13 @TC98 @regression @positive
  Scenario: TC-98 — Working calendar change end hours
    When I open the working calendar dialog
    And I set working calendar end time to PM hours
    And I save the working calendar dialog
    Then the working calendar updated toast should appear

  # ===========================================================================
  # TS-14 — Working calendar remove (@TS14 @TC99+)
  # ===========================================================================

  @TS14 @TC99 @regression @positive
  Scenario: TC-99 — Remove added off days in working hours
    When I open the working calendar dialog
    And I toggle working calendar days "Mon" and "Fri"
    And I save the working calendar dialog
    Then the working calendar updated toast should appear

  @TS14 @TC100 @regression @positive
  Scenario: TC-100 — Remove added public holiday
    When I open the working calendar dialog
    And I remove the first public holiday in the working calendar dialog
    And I save the working calendar dialog
    Then the working calendar updated toast should appear
