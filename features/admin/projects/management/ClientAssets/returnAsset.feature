@project @clientAssets @return @positive
Feature: Return asset on project Assets

  Scenario: Project user marks an issued asset as returned
    Given I am logged in
    And an issued asset request exists from a project
    When I navigate to the project Client Assets module
    And I mark the asset request as return with notes
    Then I should see the asset request status as "RETURN_INITIATED"
