@regression @rfq @rfq-attachment
Feature: RFQ - attachment and compose email

  Same journey as compose RFQ; before Action -> Compose email, click Attachment and choose a file in the system picker.

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  Scenario: Add RFQ attachment then compose and send email
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ attachment compose flow"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    And I add an RFQ attachment before compose
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
