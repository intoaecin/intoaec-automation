@common @callLog @edit @positive @regression
Feature: Edit Call Log

  Scenario: Verify editing an existing call log updates purpose and comments
    Given I am logged in
    When I create a call log ready for editing
    And I open edit from the row action menu for the created call log
    And I edit the call log mandatory fields
    And I submit the call log update form
    Then I should see the call log updated successfully

  Scenario: Verify edited call log persists after page refresh
    Given I am logged in
    When I create a call log ready for editing
    And I open edit from the row action menu for the created call log
    And I edit the call log mandatory fields
    And I submit the call log update form
    And I refresh the Call Log page
    Then I should see the edited call log persisted after refresh

  @negative
  Scenario: Verify mandatory validation when required fields are cleared during edit
    Given I am logged in
    When I create a call log ready for editing
    And I open edit from the row action menu for the created call log
    And I clear the call log mandatory fields and attempt to save
    Then I should see call log edit mandatory validation
    And the call log should not be updated
