@resources @workers @positive @manage-workers @yopmail @user-wage
Feature: Create User With Wages for Worker Management

  Scenario: Invite a user with wage details, accept invitation, and verify Accepted status
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I navigate to User Hub user invite form
    Then the User Hub User Invite form should be displayed
    When I fill the User Hub invite first name with "WageAuto"
    And I fill the User Hub invite last name with "Worker"
    And I fill the User Hub invite email with "wageautoworker@yopmail.com"
    And I select the User Hub invite role "Site Engineer"
    And I fill the User Hub invite working hours with "8"
    And I fill the User Hub invite rate with "200"
    And I click Send Invite on the User Hub invite form
    Then the user invitation should be sent successfully from User Hub
    And I should see User Hub user invitation success toast
    When I open Yopmail for the invited user
    And I wait for the user invitation email to be received
    Then the user invitation email should be received successfully
    And the user invitation email should contain an invitation link
    When I extract and open the user invitation URL
    When I enter invited user mobile "9876543210" and password "WageAuto@123" and click Proceed to login
    Then the invited user invitation should be accepted successfully
    When I switch back to the Admin Portal User Hub tab
    And I refresh the User Hub users list
    And I search the User Hub users list for the invited user
    Then the invited user should appear in the User Hub users list with status "Accepted" after acceptance
