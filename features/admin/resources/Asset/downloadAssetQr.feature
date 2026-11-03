@resources @asset @qr @positive
Feature: Download Asset QR

  Scenario: Create an asset and download its QR code from the row menu
    Given I am logged in
    When I create an owned individual asset quickly
    And I download the QR code for the created asset
    Then the asset QR download should start
