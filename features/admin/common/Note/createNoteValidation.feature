@common @note @negative @validation @regression
Feature: Create Note validation

  Background:
    Given I am logged in
    And I navigate to the lead Notes create form

  Scenario: Verify Title mandatory validation
    When I leave the note title empty and fill the paragraph
    And I attempt to submit the note create form
    Then I should see title mandatory validation for note

  Scenario: Verify Paragraph mandatory validation
    When I fill the note title and leave the paragraph empty
    And I attempt to submit the note create form
    Then I should see paragraph mandatory validation for note

  Scenario: Verify both Title and Paragraph mandatory validation
    When I leave the note title and paragraph empty
    And I attempt to submit the note create form
    Then I should see title and paragraph mandatory validation for note

  Scenario: Verify Title maximum character limit
    When I fill the note title exceeding the maximum character limit
    And I attempt to submit the note create form
    Then I should see title maximum character validation for note

  Scenario: Verify Paragraph maximum character limit
    When I fill the note paragraph exceeding the maximum character limit
    And I attempt to submit the note create form
    Then I should see paragraph maximum character validation for note

  Scenario: Verify special characters in Title
    When I fill special characters in the note title and valid paragraph
    And I attempt to submit the note create form
    Then I should see note special character input handled correctly

  Scenario: Verify special characters in Paragraph
    When I fill the note title and special characters in the paragraph
    And I attempt to submit the note create form
    Then I should see note special character input handled correctly

  Scenario: Verify unsupported file upload
    When I upload an unsupported note attachment file
    Then I should see unsupported note attachment validation

  Scenario: Verify maximum file size upload
    When I upload an oversized note attachment file
    Then I should see oversized note attachment validation
