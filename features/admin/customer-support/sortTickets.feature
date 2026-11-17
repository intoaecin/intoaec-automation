@customer-support @positive @regression
Feature: Sort support tickets

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  Scenario: CS-ADM-10 Oldest and newest sort order
    When I create two support tickets for sort order
    Then the newer support ticket should appear before the older one
    When I sort support tickets oldest first
    Then the older support ticket should appear before the newer one
    When I sort support tickets newest first
    Then the newer support ticket should appear before the older one
