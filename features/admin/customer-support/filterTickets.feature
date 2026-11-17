@customer-support
Feature: Filter support tickets

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  @positive @regression
  Scenario: CS-ADM-06 Status, priority, and tag filters combine
    When I create a linked support ticket
    Then I should see the created support ticket
    When I filter support tickets by the created status, priority, and tag
    Then I should see the created support ticket
    When I filter support tickets by a different status
    Then I should not see the created support ticket

  @positive @regression
  Scenario: CS-ADM-07 Unassigned and no-reporter filters
    When I create a support ticket with no assignee
    Then I should see the created support ticket
    And the created support ticket should show Unassigned
    When I filter support tickets by Unassigned
    Then I should see the created support ticket
    When I clear support ticket filters
    And I create a support ticket with no reporter
    Then I should see the created support ticket
    When I filter support tickets by No reporter
    Then I should see the created support ticket

  @positive @regression
  Scenario: CS-ADM-08 Created-between includes today and hides a previous month
    When I create a linked support ticket
    Then I should see the created support ticket
    When I filter support tickets created today
    Then I should see the created support ticket
    When I clear support ticket filters
    And I filter support tickets created in the previous month
    Then I should not see the created support ticket

  @negative @regression
  Scenario: CS-ADM-09 An inverted created-between range is not applied
    When I create a linked support ticket
    Then I should see the created support ticket
    When I try an inverted support ticket created-between range
    Then I should see the created support ticket

  @positive @regression
  Scenario: CS-ADM-11 Clear filters restores the created ticket
    When I create a linked support ticket
    Then I should see the created support ticket
    When I filter support tickets by a different status
    Then I should not see the created support ticket
    When I clear support ticket filters
    Then I should see the created support ticket
