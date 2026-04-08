@po @procurement @vendor @po-vendor-yopmail
Feature: Purchase Order — vendor accepts PO via Yopmail (same browser)

  Reuses the create-po journey (list → scratch → title → vendor → line item → compose → send), then opens Yopmail in a **new tab**,
  finds the PO email, **View PO** → vendor portal URL, then **Accept**.

  Prerequisites:
  - The scenario uses **compose email → capture To**: the vendor’s Yopmail address is read from the **To** field before Send (no env required if it shows `*@yopmail.com`).
  - Optional env **PO_VENDOR_YOPMAIL_ID** (or **PO_VENDOR_YOPMAIL_LOGIN**) only if you open Yopmail without capturing from compose.
  - The **first vendor** in the modal must be a Yopmail address so the PO email is delivered there.
  - Optional **PO_VENDOR_PORTAL_URL_REGEX**: tighten the vendor portal URL check (e.g. your app host pattern).
  - Optional **PO_YOPMAIL_INBOX_TIMEOUT_MS** (default 180000): max time to refresh inbox until the PO email appears.
  - Optional **PO_YOPMAIL_MAIL_HINT_REGEX**: custom regex to match the email row in the inbox list (default: purchase order / PO phrases; excludes "View PO" so list links do not steal the click).

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Create PO, send email, Yopmail View PO, vendor accepts
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO - Cable wire procurement (Vendor accept via Yopmail)"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "Cable wire procurement for project needs — vendor to review and accept." quantity "10" unit "Nos" rate "2000"
    And I compose and send the purchase order email capturing vendor Yopmail from the To field
    Then I should see the purchase order created and sent success toast
    When I open Yopmail for the vendor in a new browser tab
    And I wait for the purchase order email in Yopmail open the message and click View PO for the vendor portal
    Then I should see the purchase order on the vendor portal page
    When I accept the purchase order on the vendor portal
