@crm @lead-profile @events @meeting @google-integration @regression
Feature: Google Meet Integration for Online Meetings

  Background:
    Given I am logged in

  @smoke @requires-no-google-integration
  Scenario: Verify Connect Google Meet flow when Google Calendar is not connected
    When I open Create Meeting and click the Online tab
    Then Google Calendar should not be connected
    And the Connect Google Meet screen should be displayed
    When I click Connect Google Meet
    Then the Configure Google Account page should open
    And the Google integration card should be displayed
    When I click the Google integration card
    Then the Configure button should be displayed on the Google integration page

  @smoke @google-integration-connected
  Scenario: Verify Online Meeting form opens when Google Calendar is connected
    Given Google Calendar integration is configured
    When I open Create Meeting and click the Online tab
    Then Google Calendar should be connected
    And the Online Meeting form should open directly
    And the Connect Google Meet screen should not be displayed
    And I should be able to proceed to create an online meeting

  @regression @manual-oauth
  Scenario: Complete Google integration manually and verify Online Meeting form
    When I open Create Meeting and click the Online tab
    And I click Connect Google Meet
    Then the Configure Google Account page should open
    And the Configure button should be displayed on the Google integration page
    When I complete Google Calendar integration manually
    And I navigate back to Lead Events Create Meeting Online tab
    Then Google Calendar should be connected
    And the Online Meeting form should open directly
    And the Connect Google Meet screen should not be displayed
    And I should be able to proceed to create an online meeting

  @negative
  Scenario: Cancel Google OAuth popup without completing integration
    When I open Create Meeting and click the Online tab
    And I click Connect Google Meet
    And I click Configure on the Google integration page
    And I close the Google OAuth popup without signing in
    Then I should remain on the Configure Google Account page
    When I navigate back to Lead Events Create Meeting Online tab
    Then the Connect Google Meet screen should be displayed
    And Online Meeting creation should be blocked until integration is completed
