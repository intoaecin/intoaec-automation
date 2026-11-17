@customer-support @positive @regression
Feature: Support ticket Kanban list

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  Scenario: CS-ADM-13 Kanban keeps the current search
    When I create a linked support ticket
    Then I should see the created support ticket
    When I search support tickets for the created title
    And I switch the support desk to Kanban
    Then the created support ticket title should be on screen
    When I switch the support desk to List
    Then the created support ticket title should be on screen
