@common @note @edit @positive @regression
Feature: Edit Note

  Scenario: Verify editing an existing note updates title and paragraph
    Given I am logged in
    When I create a note ready for editing
    And I open edit for the created note from the three dots menu
    And I edit the note title and paragraph
    And I save the note update
    Then I should see the note updated successfully

  Scenario: Verify edited note persists after page refresh
    Given I am logged in
    When I create a note ready for editing
    And I open edit for the created note from the three dots menu
    And I edit the note title and paragraph
    And I save the note update
    And I refresh the notes page
    Then I should see the edited note persisted after refresh

  @negative
  Scenario: Verify mandatory validation when title is cleared during edit
    Given I am logged in
    When I create a note ready for editing
    And I open edit for the created note from the three dots menu
    And I clear the note title and attempt to save
    Then I should see note validation message

  @negative
  Scenario: Verify mandatory validation when paragraph is cleared during edit
    Given I am logged in
    When I create a note ready for editing
    And I open edit for the created note from the three dots menu
    And I clear the note paragraph and attempt to save
    Then I should see note validation message
