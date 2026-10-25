@common @callLog @delete @positive @regression
Feature: Delete Call Log

  Scenario: Verify deleting a call log confirms and removes it from the list
    Given I am logged in
    When I create a call log ready for deletion
    And I open delete from the three dots menu for the created call log
    And I confirm call log deletion from the popup
    Then I should see the call log deleted successfully

  Scenario: Verify delete confirmation popup appears
    Given I am logged in
    When I create a call log ready for deletion
    And I open delete from the three dots menu for the created call log
    Then I should see the call log delete confirmation popup

  @negative
  Scenario: Verify cancel delete keeps the call log unchanged
    Given I am logged in
    When I create a call log ready for deletion
    And I open delete from the three dots menu for the created call log
    And I cancel call log deletion from the popup
    Then I should see the call log still present in the list
