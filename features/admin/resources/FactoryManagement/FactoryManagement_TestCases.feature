# -----------------------------------------------------------------------------
# Factory Management — incremental TCs in ONE file.
#
# Setup lives under Resources → Factory Management (/factory-management).
# Jobs are raised on a project Manufacturing Order tab, then accepted,
# produced, packed, and dispatched back on the factory page.
#
# TS-01 Navigation          TC-01 … TC-03
# TS-02 Locations           TC-04 … TC-08
# TS-03 Trades and stages   TC-09 … TC-15
# TS-04 Raise an order      TC-16 … TC-20
# TS-05 Accept and start    TC-21 … TC-23
# TS-06 Dates               TC-24 … TC-26
# TS-07 Stock               TC-27 … TC-30
# TS-08 Production          TC-31 … TC-32
# TS-09 Requests            TC-33 … TC-35
# TS-10 Dispatch            TC-36 … TC-37
# TS-11 Activities          TC-38
#
# Run one case (PowerShell: use npx.cmd / npm.cmd):
#   npx.cmd cucumber-js features/admin/resources/FactoryManagement/FactoryManagement_TestCases.feature --tags "@TS01 and @TC01"
#
# Run all:
#   npx.cmd cucumber-js features/admin/resources/FactoryManagement/FactoryManagement_TestCases.feature --tags "@factory-tc"
#   npm.cmd run test:admin:resources:factory
#
# Layering: AGENTS.md — scenarios here;
#            pages/admin/resources/FactoryManagement/;
#            step-definitions/admin/resources/FactoryManagement/FactoryManagementStep.js
# -----------------------------------------------------------------------------

@factory-tc @factory @resources @factory-management
Feature: Factory Management — incremental test cases

  Background:
    Given I am logged in
    And I close the post-login popup or select Continue to My Account
    When I navigate to Resources
    And I select Factory Management

  # ===========================================================================
  # TS-01 — Navigation
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Open Factory Management Jobs with status tabs and workshop location
    Then the factory Jobs page should show status tabs and a workshop location

  @TS01 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Open every Factory Management workshop and settings menu item
    When I open each factory workshop and settings menu item
    Then each factory menu item should show its page title

  @TS01 @TC03 @regression @positive
  Scenario: TC-03 — Open the incoming tab alias on Requests
    When I open the factory incoming tab alias
    Then the factory Requests page should be displayed

  # ===========================================================================
  # TS-02 — Locations
  # ===========================================================================

  @TS02 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Create a factory location and assign the logged-in user
    When I create a factory location with a unique workshop name
    Then the factory location row should show the workshop name, trade, and address

  @TS02 @TC05 @regression @positive
  Scenario: TC-05 — Edit a factory location zip code
    When I edit the factory location zip code and save
    Then the factory location should show the updated zip code

  @TS02 @TC06 @regression @positive
  Scenario: TC-06 — Deactivate and activate a factory location
    When I deactivate and activate the factory location
    Then the factory location activated toast should be shown

  @TS02 @TC07 @negative
  Scenario: TC-07 — Block a factory location when required fields are blank
    When I try to create a factory location with blank required fields
    Then the factory location required field messages should be shown

  @TS02 @TC08 @negative
  Scenario: TC-08 — Reject a duplicate factory workshop name
    When I try to create a factory location with a duplicate workshop name
    Then the factory duplicate location message should be shown

  # ===========================================================================
  # TS-03 — Trades and stages
  # ===========================================================================

  @TS03 @TC09 @smoke @regression @positive
  Scenario: TC-09 — Add a custom factory trade and a stage
    When I add a custom factory trade and a stage
    Then the factory stage should appear under that trade

  @TS03 @TC10 @regression @positive
  Scenario: TC-10 — Keep stage Save disabled until the name changes
    When I open the factory stage editor
    Then the factory stage save button should be disabled until the name changes
    When I save the edited factory stage name
    Then the edited factory stage should be visible

  @TS03 @TC11 @regression @positive
  Scenario: TC-11 — Rename a factory trade
    When I rename the factory trade
    Then the renamed factory trade should be selected

  @TS03 @TC12 @regression @positive
  Scenario: TC-12 — Change the primary factory trade and restore the original
    When I change the factory primary trade and restore the original
    Then the original factory primary trade should be primary again

  @TS03 @TC13 @regression @positive
  Scenario: TC-13 — Delete an unused factory stage
    When I delete an unused factory stage
    Then the unused factory stage should be removed

  @TS03 @TC14 @negative
  Scenario: TC-14 — Reject blank or duplicate factory trade and stage names
    When I submit invalid factory trade and stage names
    Then the factory trade and stage validation messages should be shown

  @TS03 @TC15 @negative
  Scenario: TC-15 — Block deletion of a factory stage that a job has used
    When I try to delete a factory stage that a job has used
    Then the factory in-use stage message should be shown

  # ===========================================================================
  # TS-04 — Raise a manufacturing order
  # ===========================================================================

  @TS04 @TC16 @smoke @regression @positive
  Scenario: TC-16 — Raise a manufacturing order for the factory workshop
    When I raise a factory manufacturing order for the workshop
    Then the raised factory job should be listed under Yet to start

  @TS04 @TC17 @regression @positive
  Scenario: TC-17 — Open Add Location from Create New Workshop
    When I choose Create New Workshop on the manufacturing order form
    Then the factory Add Location form should open from the workshop shortcut

  @TS04 @TC18 @regression @positive
  Scenario: TC-18 — Edit notes on a raised manufacturing order
    When I edit the raised factory job notes and save
    Then the factory job update toast should be shown

  @TS04 @TC19 @regression @positive
  Scenario: TC-19 — Delete a raised manufacturing order from the project
    When I delete a raised factory job from the project
    Then the deleted factory job should not be listed

  @TS04 @TC20 @negative
  Scenario: TC-20 — Block a manufacturing order when required fields are invalid
    When I try to create a factory job with invalid required fields
    Then the factory job required field messages should be shown

  # ===========================================================================
  # TS-05 — Accept, decline, and start
  # ===========================================================================

  @TS05 @TC21 @smoke @regression @positive
  Scenario: TC-21 — Accept a factory job, add a material, and start it
    When I accept the factory job, add a material, and start it
    Then the factory job should be listed under In Progress

  @TS05 @TC22 @regression @positive
  Scenario: TC-22 — Decline a raised factory job
    When I decline a raised factory job
    Then the declined factory job should be absent from the job status tabs

  @TS05 @TC23 @negative
  Scenario: TC-23 — Keep Start job unavailable until the order has materials
    When I accept a factory job that has no materials
    Then the factory job should show Add materials and not Start job

  # ===========================================================================
  # TS-06 — Dates
  # ===========================================================================

  @TS06 @TC24 @regression @positive
  Scenario: TC-24 — Propose a factory date and accept it on the project card
    When I propose a factory date and accept it on the project card
    Then the factory job should no longer wait for date confirmation

  @TS06 @TC25 @regression @positive
  Scenario: TC-25 — Propose a factory date and decline it on the project card
    When I propose a factory date and decline it on the project card
    Then the factory proposed date declined toast should be shown

  @TS06 @TC26 @negative
  Scenario: TC-26 — Reject a ready-to-leave date and an early proposed date
    When I enter an invalid factory ready to leave date and an early proposed date
    Then the factory date validation messages should be shown

  # ===========================================================================
  # TS-07 — Stock and issued materials
  # ===========================================================================

  @TS07 @TC27 @smoke @regression @positive
  Scenario: TC-27 — Add factory stock from the cost catalog
    When I add factory stock for a cost catalog material
    Then the factory stock row should show received and available quantities

  @TS07 @TC28 @negative
  Scenario: TC-28 — Block factory stock without a material or with quantity zero
    When I try to add factory stock with invalid fields
    Then the factory stock validation messages should be shown

  @TS07 @TC29 @regression @positive
  Scenario: TC-29 — Issue factory stock to an in-progress job
    When I issue factory stock to the in-progress job
    Then the factory material status should no longer be Not in stock

  @TS07 @TC30 @negative
  Scenario: TC-30 — Reject an issued quantity above available stock
    When I issue more factory stock than is available
    Then the factory issued quantity validation message should be shown

  # ===========================================================================
  # TS-08 — Stages, pack, and complete
  # ===========================================================================

  @TS08 @TC31 @smoke @regression @positive
  Scenario: TC-31 — Update production, mark ready to leave, and complete the job
    When I update factory stage progress, mark the job ready to leave, and complete it
    Then the factory job should be listed under Completed

  @TS08 @TC32 @negative
  Scenario: TC-32 — Reject stage, pack, and return quantities that are too high
    When I enter factory stage, pack, and return quantities that are too high
    Then the factory progress validation messages should be shown

  # ===========================================================================
  # TS-09 — Requests and goods receipt
  # ===========================================================================

  @TS09 @TC33 @regression @positive
  Scenario: TC-33 — Create an indent from the job and receive the material
    When I create an indent from the factory job and receive the material
    Then the factory goods receipt should list the received material

  @TS09 @TC34 @regression @positive
  Scenario: TC-34 — Bulk receive two factory request materials
    When I bulk receive two factory request materials
    Then the factory bulk receive success toast should be shown

  @TS09 @TC35 @negative
  Scenario: TC-35 — Reject a received quantity of zero or above pending
    When I receive an invalid factory request quantity
    Then the factory receive validation messages should be shown

  # ===========================================================================
  # TS-10 — Dispatch
  # ===========================================================================

  @TS10 @TC36 @smoke @regression @positive
  Scenario: TC-36 — Create a dispatch load for a job that is ready to leave
    When I create a factory dispatch load for a ready job
    Then the factory load should be listed under Loads going out

  @TS10 @TC37 @negative
  Scenario: TC-37 — Block a dispatch load without a ready job or required fields
    When I try to create a factory dispatch load without required fields
    Then the factory dispatch validation should be shown

  # ===========================================================================
  # TS-11 — Activities
  # ===========================================================================

  @TS11 @TC38 @regression @positive
  Scenario: TC-38 — Filter factory activities and match the activity count
    When I filter factory activities by source and manufacturing order
    Then the factory activity count should match the visible list
