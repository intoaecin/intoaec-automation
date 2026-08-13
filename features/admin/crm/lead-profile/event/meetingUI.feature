@crm @lead-profile @events @meeting @ui @validation @regression
Feature: Create Meeting UI Validation

  Background:
    Given I am logged in

  @smoke
  Scenario: Verify Create Meeting popup UI
    When I navigate to the first available lead
    And I open the Events module
    And I open the Events action menu
    And I select Create Meeting
    Then the Create Meeting popup should be displayed
    And the Create Meeting popup title should be correct
    And the Online and Offline tabs should be visible on Create Meeting popup
    And the Create Meeting close icon should be visible and clickable
    And all mandatory Create Meeting fields should be displayed on the popup
    And the Create Meeting button should be displayed
    And all Create Meeting popup controls should be properly aligned

  @smoke
  Scenario: Verify switching between Online and Offline tabs
    When I navigate to the first available lead
    And I open the Events module
    And I open the Events action menu
    And I select Create Meeting
    And I click the Online tab on Create Meeting popup
    Then the Online meeting form should be displayed
    When I click the Offline tab on Create Meeting popup
    Then the Offline meeting form should be displayed
    When I click the Online tab on Create Meeting popup
    Then the Online meeting form should be displayed
    And no UI issues should occur while switching Create Meeting tabs

  @smoke
  Scenario: Verify Close button on Create Meeting popup
    When I open the Create Meeting popup for UI validation
    And I click the Create Meeting close icon
    Then the Create Meeting popup should be closed
    And I should be returned to the Events page
