@common @note @positive @smoke
Feature: Create Note

  Scenario: Create a note with mandatory fields and attachment on lead profile
    Given I am logged in
    When I navigate to the lead Notes create form
    And I fill the note mandatory fields
    And I add a note attachment
    And I submit the note create form
    Then I should see the note created successfully
