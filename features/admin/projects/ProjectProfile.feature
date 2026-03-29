# features/admin/projects/ProjectProfile.feature
Feature: Project Profile Navigation

  Scenario: Navigate to a project and interact with modules
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Design & Estimates" heading
    And I click the "Proposal" module card
