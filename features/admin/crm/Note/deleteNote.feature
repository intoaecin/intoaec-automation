@common @note @delete @positive @regression
Feature: Delete Note

  Scenario: Verify deleting a note confirms and removes it from the list
    Given I am logged in
    When I create a note ready for deletion
    And I open delete from the three dots menu for the created note
    And I confirm note deletion from the popup
    Then I should see the note deleted successfully

  Scenario: Verify delete confirmation popup appears
    Given I am logged in
    When I create a note ready for deletion
    And I open delete from the three dots menu for the created note
    Then I should see the note delete confirmation popup

  @negative
  Scenario: Verify cancel delete keeps the note unchanged
    Given I am logged in
    When I create a note ready for deletion
    And I open delete from the three dots menu for the created note
    And I cancel note deletion from the popup
    Then I should see the note still present in the list
