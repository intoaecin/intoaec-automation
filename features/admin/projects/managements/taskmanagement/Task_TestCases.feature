# -----------------------------------------------------------------------------
# Task Management — incremental manual TCs in ONE file.
#
# TS-01 Add Task      — @TS01 @TC01 … @TC03
# TS-02 Add Column    — @TS02 @TC04 … @TC07
# TS-03 Quick Task    — @TS03 @TC08 … @TC12
# TS-04 Add task with — @TS04 @TC13 … @TC21
# TS-05 Edit task     — @TS05 @TC22 … @TC33
# TS-06 Edit column   — @TS06 @TC34 … @TC35
# TS-07 Duplicate     — @TS07 @TC36
# TS-08 Remove fields — @TS08 @TC37 … @TC41
# TS-09 Delete        — @TS09 @TC42 … @TC45
# TS-10 Checklist     — @TS10 @TC46
# TS-11 Filter        — @TS11 @TC47 … @TC51
# TS-12 Template      — @TS12 @TC52
#
# Run one case (always pass this file path):
#   npx cucumber-js features/admin/projects/managements/taskmanagement/Task_TestCases.feature --tags "@TS01 and @TC01"
#
# Run all TS-01:
#   npx cucumber-js features/admin/projects/managements/taskmanagement/Task_TestCases.feature --tags "@TS01"
#
# Run entire file (one browser session; Background skips repeat login when already on Task):
#   npx cucumber-js features/admin/projects/managements/taskmanagement/Task_TestCases.feature
#
# Layering: `AGENTS.md` — scenarios here; logic in pages/.../TaskManagement/TaskManagementPage.js;
#            step-definitions/.../TaskManagement/TaskStep.js
#
# Schedule integration: `Schedule_TestCases.feature` still uses `pages/.../TaskPage.js` for
#   "open Task module" / kanban verify steps — that flow is unchanged.
# -----------------------------------------------------------------------------

@task
Feature: Task Management — incremental test cases

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Project Management" heading
    And I navigate to the task management module
    And I wait for the task management module to load
    And I switch task management to kanban view

  # ===========================================================================
  # TS-01 — Add Task (@TS01 @TC01 … @TS03)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Add task in To Do column via Add Task offcanvas
    When I open the task create offcanvas
    Then the task create offcanvas should be open
    When I fill the task create form with name "task 1"
    And I pick a random weekday start datetime in the task create form
    And I pick a random weekday end datetime after start in the task create form
    And I submit the task create form
    Then task "task 1" should be visible in kanban column "To Do"

  @TS01 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Add task in In Progress column via Add Task offcanvas
    When I open the task create offcanvas
    Then the task create offcanvas should be open
    When I fill the task create form with name "task 2"
    And I choose task status "In Progress" in the task create form
    And I pick a random weekday start datetime in the task create form
    And I pick a random weekday end datetime after start in the task create form
    And I submit the task create form
    Then task "task 2" should be visible in kanban column "In Progress"

  @TS01 @TC03 @smoke @regression @positive
  Scenario: TC-03 — Add task in Completed column via Add Task offcanvas
    When I open the task create offcanvas
    Then the task create offcanvas should be open
    When I fill the task create form with name "task 3"
    And I choose task status "Completed" in the task create form
    And I pick a random weekday start datetime in the task create form
    And I pick a random weekday end datetime after start in the task create form
    And I submit the task create form
    Then task "task 3" should be visible in kanban column "Completed"

  # ===========================================================================
  # TS-02 — Add Column (@TS02 @TC04 … @TC07)
  # ===========================================================================

  @TS02 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Add kanban column with default name Column 1
    When I scroll the kanban board to the last column
    And I open the add kanban column dialog
    And I confirm add kanban column with default name
    Then kanban column "Column 1" should be visible

  @TS02 @TC05 @smoke @regression @positive
  Scenario: TC-05 — Add kanban column named followup
    When I scroll the kanban board to the last column
    And I open the add kanban column dialog
    And I set add kanban column name to "followup"
    And I confirm add kanban column
    Then kanban column "followup" should be visible

  @TS02 @TC06 @smoke @regression @positive
  Scenario: TC-06 — Add kanban column named pending with random colour
    When I scroll the kanban board to the last column
    And I open the add kanban column dialog
    And I set add kanban column name to "pending"
    And I pick a random color in the add kanban column dialog
    And I confirm add kanban column
    Then kanban column "pending" should be visible

  @TS02 @TC07 @smoke @regression @positive
  Scenario: TC-07 — Add task in followup column via Add Task offcanvas
    When I open the task create offcanvas
    Then the task create offcanvas should be open
    When I fill the task create form with name "task followup"
    And I choose task status "followup" in the task create form
    And I pick a random weekday start datetime in the task create form
    And I pick a random weekday end datetime after start in the task create form
    And I submit the task create form
    Then task "task followup" should be visible in kanban column "followup"

  # ===========================================================================
  # TS-03 — Add Quick Task (@TS03 @TC08 … @TC12)
  # ===========================================================================

  @TS03 @TC08 @smoke @regression @positive
  Scenario: TC-08 — Add quick task in To Do column
    When I add a quick task in kanban column "To Do"
    Then quick task card should be visible in kanban column "To Do"

  @TS03 @TC09 @smoke @regression @positive
  Scenario: TC-09 — Add quick task in In Progress column
    When I add a quick task in kanban column "In Progress"
    Then quick task card should be visible in kanban column "In Progress"

  @TS03 @TC10 @smoke @regression @positive
  Scenario: TC-10 — Add quick task in Completed column
    When I add a quick task in kanban column "Completed"
    Then quick task card should be visible in kanban column "Completed"

  @TS03 @TC11 @smoke @regression @positive
  Scenario: TC-11 — Add quick task in Column 1
    When I add a quick task in kanban column "Column 1"
    Then quick task card should be visible in kanban column "Column 1"

  @TS03 @TC12 @smoke @regression @positive
  Scenario: TC-12 — Add quick task in pending column
    When I add a quick task in kanban column "pending"
    Then quick task card should be visible in kanban column "pending"

  # ===========================================================================
  # TS-04 — Add Task With (@TS04 @TC13 … @TC21)
  # ===========================================================================

  @TS04 @TC13 @smoke @regression @positive
  Scenario: TC-13 — Add task with High priority and verify in list view
    When I open the task create offcanvas
    When I fill the task create form with name "task 4"
    And I choose task priority "High" in the task create form
    And I pick a random weekday start datetime in the task create form
    And I pick a random weekday end datetime after start in the task create form
    And I submit the task create form
    When I switch task management to list view
    Then task "task 4" should be visible in list view
    And task "task 4" should show priority "High" in list view

  @TS04 @TC14 @smoke @regression @positive
  Scenario: TC-14 — Add task with Low priority and verify in list view
    When I open the task create offcanvas
    When I fill the task create form with name "task 5"
    And I choose task priority "Low" in the task create form
    And I pick a random weekday start datetime in the task create form
    And I pick a random weekday end datetime after start in the task create form
    And I submit the task create form
    When I switch task management to list view
    Then task "task 5" should be visible in list view
    And task "task 5" should show priority "Low" in list view

  @TS04 @TC15 @smoke @regression @positive
  Scenario: TC-15 — Add task with description and verify in list view
    When I open the task create offcanvas
    When I fill the task create form with name "task 6"
    And I enter a random description on the task create form
    And I pick a random weekday start datetime in the task create form
    And I pick a random weekday end datetime after start in the task create form
    And I submit the task create form
    When I switch task management to list view
    Then task "task 6" should be visible in list view

  @TS04 @TC16 @smoke @regression @positive
  Scenario: TC-16 — Add task with user and vendor assignees
    When I open the task create offcanvas
    When I fill the task create form with name "task 7"
    And I pick a random weekday start datetime in the task create form
    And I pick a random weekday end datetime after start in the task create form
    And I add user and vendor assignees on the task create form
    And I submit the task create form
    When I switch task management to list view
    Then task "task 7" should be visible in list view

  @TS04 @TC17 @smoke @regression @positive
  Scenario: TC-17 — Add task with reporter
    When I open the task create offcanvas
    When I fill the task create form with name "task 8"
    And I pick a random weekday start datetime in the task create form
    And I pick a random weekday end datetime after start in the task create form
    And I add a random reporter on the task create form
    And I submit the task create form
    When I switch task management to list view
    Then task "task 8" should be visible in list view

  @TS04 @TC18 @smoke @regression @positive
  Scenario: TC-18 — Add task with reminder
    When I open the task create offcanvas
    When I fill the task create form with name "task 9"
    And I pick a random weekday start datetime in the task create form
    And I pick a random weekday end datetime after start in the task create form
    And I add a random reminder on the task create form
    And I submit the task create form
    When I switch task management to list view
    Then task "task 9" should be visible in list view

  @TS04 @TC19 @smoke @regression @positive
  Scenario: TC-19 — Add task with checklist
    When I open the task create offcanvas
    When I fill the task create form with name "task 10"
    And I pick a random weekday start datetime in the task create form
    And I pick a random weekday end datetime after start in the task create form
    And I add a random checklist item on the task create form
    And I submit the task create form
    When I switch task management to list view
    Then task "task 10" should be visible in list view

  @TS04 @TC20 @smoke @regression @positive
  Scenario: TC-20 — Add task with checklist and checklist assignee
    When I open the task create offcanvas
    When I fill the task create form with name "task 10"
    And I pick a random weekday start datetime in the task create form
    And I pick a random weekday end datetime after start in the task create form
    And I add a random checklist item on the task create form
    And I add a checklist assignee on the task create form
    And I submit the task create form
    When I switch task management to list view
    Then task "task 10" should be visible in list view

  @TS04 @TC21 @smoke @regression @positive
  Scenario: TC-21 — Add task with all optional fields
    When I open the task create offcanvas
    When I fill the task create form with all optional fields named "task 11"
    And I submit the task create form
    When I switch task management to list view
    Then task "task 11" should be visible in list view

  # ===========================================================================
  # TS-05 — Edit Task (@TS05 @TC22 … @TC33)
  # ===========================================================================

  @TS05 @TC22 @smoke @regression @positive
  Scenario: TC-22 — Edit task name on kanban card and verify in list view
    When I rename kanban task "task 1" to "task 12"
    When I switch task management to list view
    Then task "task 12" should be visible in list view

  @TS05 @TC23 @smoke @regression @positive
  Scenario: TC-23 — Edit task description from list view
    When I switch task management to list view
    And I open view task for "task 6" from list row menu
    And I update the task description in view task offcanvas
    And I close the view task offcanvas

  @TS05 @TC24 @smoke @regression @positive
  Scenario: TC-24 — Edit task reminder from list view (task 9)
    When I switch task management to list view
    And I open view task for "task 9" from list row menu
    And I update the task reminder in view task offcanvas
    And I close the view task offcanvas

  @TS05 @TC25 @smoke @regression @positive
  Scenario: TC-25 — Edit checklist assignee from list view
    When I switch task management to list view
    And I open view task for "task 10" from list row menu
    And I swap the checklist assignee in view task offcanvas
    And I close the view task offcanvas

  @TS05 @TC26 @smoke @regression @positive
  Scenario: TC-26 — Add comment on kanban view task panel
    When I open view task for "task 2" from kanban card
    And I add comment "Automation comment 26" in view task offcanvas
    Then comment "Automation comment 26" should be visible in view task offcanvas
    And I close the view task offcanvas

  @TS05 @TC27 @smoke @regression @positive
  Scenario: TC-27 — Edit task start and end dates from list view
    When I switch task management to list view
    And I open view task for "task 3" from list row menu
    And I update task start and end dates in view task offcanvas
    And I close the view task offcanvas

  @TS05 @TC28 @smoke @regression @positive
  Scenario: TC-28 — Edit assignee on kanban task card
    When I update assignees on kanban task card "task 7"

  @TS05 @TC29 @smoke @regression @positive
  Scenario: TC-29 — Edit task status from list view
    When I switch task management to list view
    And I open view task for "task 4" from list row menu
    And I update task status to "In Progress" in view task offcanvas
    And I close the view task offcanvas

  @TS05 @TC30 @smoke @regression @positive
  Scenario: TC-30 — Edit task priority from list view
    When I switch task management to list view
    And I open view task for "task 5" from list row menu
    And I update task priority to "Medium" in view task offcanvas
    And I close the view task offcanvas

  @TS05 @TC31 @smoke @regression @positive
  Scenario: TC-31 — Edit task reporter from list view
    When I switch task management to list view
    And I open view task for "task 8" from list row menu
    And I update task reporter in view task offcanvas
    And I close the view task offcanvas

  @TS05 @TC32 @smoke @regression @positive
  Scenario: TC-32 — Edit comment on kanban view task panel
    When I open view task for "task 2" from kanban card
    And I edit the latest comment to "Automation comment 32 edited" in view task offcanvas
    Then comment "Automation comment 32 edited" should be visible in view task offcanvas
    And I close the view task offcanvas

  @TS05 @TC33 @smoke @regression @positive
  Scenario: TC-33 — Edit task completion percent from list view
    When I switch task management to list view
    And I open view task for "task 2" from list row menu
    And I set a random task progress percent in view task offcanvas
    And I close the view task offcanvas

  # ===========================================================================
  # TS-06 — Edit Kanban Column (@TS06 @TC34 … @TC35)
  # ===========================================================================

  @TS06 @TC34 @smoke @regression @positive
  Scenario: TC-34 — Rename kanban column Column 1 to edit
    When I rename kanban column "Column 1" to "edit"
    Then kanban column "edit" should be visible

  @TS06 @TC35 @smoke @regression @positive
  Scenario: TC-35 — Change kanban column colour
    When I change colour of kanban column "edit"

  # ===========================================================================
  # TS-07 — Duplicate (@TS07 @TC36)
  # ===========================================================================

  @TS07 @TC36 @smoke @regression @positive
  Scenario: TC-36 — Duplicate kanban task card
    When I duplicate kanban task "task 11" from card menu
    Then a duplicate of task "task 11" should be visible on kanban

  # ===========================================================================
  # TS-08 — Remove Fields (@TS08 @TC37 … @TC41)
  # ===========================================================================

  @TS08 @TC37 @smoke @regression @positive
  Scenario: TC-37 — Remove task description
    When I switch task management to list view
    And I open view task for "task 6" from list row menu
    And I clear the task description in view task offcanvas
    And I close the view task offcanvas

  @TS08 @TC38 @smoke @regression @positive
  Scenario: TC-38 — Remove task reminder
    When I switch task management to list view
    And I open view task for "task 9" from list row menu
    And I remove the task reminder in view task offcanvas
    And I close the view task offcanvas

  @TS08 @TC39 @smoke @regression @positive
  Scenario: TC-39 — Remove checklist item
    When I switch task management to list view
    And I open view task for "task 10" from list row menu
    And I remove the checklist item in view task offcanvas
    And I close the view task offcanvas

  @TS08 @TC40 @smoke @regression @positive
  Scenario: TC-40 — Remove task comment
    When I switch task management to list view
    And I open view task for "task 2" from list row menu
    And I remove the comment in view task offcanvas
    And I close the view task offcanvas

  @TS08 @TC41 @smoke @regression @positive
  Scenario: TC-41 — Remove all assignees on kanban card
    When I remove all assignees on kanban task card "task 7"

  # ===========================================================================
  # TS-09 — Delete (@TS09 @TC42 … @TC45)
  # ===========================================================================

  @TS09 @TC42 @smoke @regression @positive
  Scenario: TC-42 — Delete quick task in To Do column
    When I delete quick task from kanban column "To Do"
    Then quick task should not be visible in kanban column "To Do"

  @TS09 @TC43 @smoke @regression @positive
  Scenario: TC-43 — Delete quick task in pending column
    When I delete quick task from kanban column "pending"
    Then quick task should not be visible in kanban column "pending"

  @TS09 @TC44 @smoke @regression @positive
  Scenario: TC-44 — Delete followup column with task migration to pending
    When I delete kanban column "followup" migrating tasks to "pending"
    Then kanban column "followup" should not be visible

  @TS09 @TC45 @smoke @regression @positive
  Scenario: TC-45 — Delete empty followup column after re-adding
    When I scroll the kanban board to the last column
    And I open the add kanban column dialog
    And I set add kanban column name to "followup"
    And I confirm add kanban column
    And I delete kanban column "followup"
    Then kanban column "followup" should not be visible

  # ===========================================================================
  # TS-10 — Checklist (@TS10 @TC46)
  # ===========================================================================

  @TS10 @TC46 @smoke @regression @positive
  Scenario: TC-46 — Toggle checklist and verify task progress
    When I switch task management to list view
    And I open view task for "task 11" from list row menu
    And I check the first checklist item in view task offcanvas
    Then task progress should show 100% in view task offcanvas
    And I uncheck the first checklist item in view task offcanvas
    Then task progress should show 0% in view task offcanvas
    And I close the view task offcanvas

  # ===========================================================================
  # TS-11 — Filter (@TS11 @TC47 … @TC51)
  # ===========================================================================

  @TS11 @TC47 @smoke @regression @positive
  Scenario: TC-47 — Filter kanban by status
    When I open the task filter menu
    And I apply task filter status "In Progress"
    Then filtered kanban should show results for status "In Progress"

  @TS11 @TC48 @smoke @regression @positive
  Scenario: TC-48 — Filter kanban by assignee
    When I open the task filter menu
    And I clear task filters
    And I apply task filter assignee with first available option
    Then filtered kanban results should be visible

  @TS11 @TC49 @smoke @regression @positive
  Scenario: TC-49 — Filter kanban by priority
    When I open the task filter menu
    And I clear task filters
    And I apply task filter priority "High"
    Then filtered kanban results should be visible

  @TS11 @TC50 @smoke @regression @positive
  Scenario: TC-50 — Filter kanban by tags
    When I open the task filter menu
    And I clear task filters
    And I apply task filter tags with first available option
    Then filtered kanban results should be visible

  @TS11 @TC51 @smoke @regression @positive
  Scenario: TC-51 — Search task by name and clear search
    When I search tasks for "task 11"
    Then search should show task "task 11" on kanban
    When I clear the task search field

  # ===========================================================================
  # TS-12 — Template (@TS12 @TC52)
  # ===========================================================================

  @TS12 @TC52 @smoke @regression @positive
  Scenario: TC-52 — Add task by template
    When I apply a random task template
    Then a new task from template should appear on kanban
