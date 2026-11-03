const { When, Then } = require('@cucumber/cucumber');
const InvoicePage = require('../../../../../pages/admin/projects/financial/create-invoice/invoice.page');
const CreditNotePage = require('../../../../../pages/admin/projects/financial/create-invoice/credit-note.page');
const PaymentPage = require('../../../../../pages/admin/projects/financial/create-invoice/payment.page');

function getInvoicePage(world) {
  if (!world.invoicePage || world.invoicePage.page !== world.page) {
    world.invoicePage = new InvoicePage(world.page);
  }
  return world.invoicePage;
}

When(
  'I complete the invoice create from scratch journey with name {string} line item {string} quantity {string} and rate {string}',
  { timeout: 360000 },
  async function (name, lineItem, quantity, rate) {
    const invoice = getInvoicePage(this);
    await invoice.completeInvoiceCreateFromScratchJourney({
      name,
      lineItem,
      quantity,
      rate,
    });
  }
);

Then('I should see the invoice created successfully', { timeout: 120000 }, async function () {
  const invoice = getInvoicePage(this);
  await invoice.expectInvoiceCreatedSuccessfully();
});

function getCreditNotePage(world) {
  if (!world.creditNotePage || world.creditNotePage.page !== world.page) {
    world.creditNotePage = new CreditNotePage(world.page);
  }
  return world.creditNotePage;
}

When('I complete the credit note create journey', { timeout: 360000 }, async function () {
  const creditNote = getCreditNotePage(this);
  await creditNote.completeCreditNoteCreateJourney();
});

Then('I should see the credit note created successfully', { timeout: 120000 }, async function () {
  const creditNote = getCreditNotePage(this);
  await creditNote.expectCreditNoteCreatedSuccessfully();
});

function getPaymentPage(world) {
  if (!world.paymentPage || world.paymentPage.page !== world.page) {
    world.paymentPage = new PaymentPage(world.page);
  }
  return world.paymentPage;
}

When(
  'I complete the register payment journey after creating an invoice',
  { timeout: 420000 },
  async function () {
    const payment = getPaymentPage(this);
    await payment.completeRegisterPaymentJourney({ ensureInvoice: true });
  }
);

Then('I should see the payment registered successfully', { timeout: 120000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.expectPaymentRegisteredAndPageClosed();
});

When('I complete the void payment journey after registering a payment', { timeout: 480000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.completeVoidPaymentJourney();
});

Then('I should see the payment voided successfully', { timeout: 120000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.expectPaymentVoidedSuccessfully();
});

When('I complete the delete invoice journey after registering a payment', { timeout: 480000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.completeDeleteInvoiceJourney();
});

Then('I should see the invoice deleted successfully', { timeout: 120000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.expectInvoiceDeletedSuccessfully();
});

When('I complete the invoice preview journey after registering a payment', { timeout: 480000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.completePreviewInvoiceJourney();
});

Then('I should see the invoice preview opened', { timeout: 120000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.expectInvoicePreviewOpened();
});

When('I complete the edit invoice journey after registering a payment', { timeout: 480000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.completeEditInvoiceJourney();
});

Then('I should see the invoice updated successfully', { timeout: 120000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.expectInvoiceUpdatedSuccessfully();
});

When('I complete the send invoice email journey after registering a payment', { timeout: 480000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.completeSendInvoiceEmailJourney();
});

Then('I should see the invoice email sent successfully', { timeout: 120000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.expectInvoiceEmailSentSuccessfully();
});

When('I complete the send invoice email journey after creating an invoice', { timeout: 480000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.completeSendInvoiceEmailAfterCreateJourney();
});

When('I complete the refund credit note journey after creating a credit note', { timeout: 480000 }, async function () {
  const creditNote = getCreditNotePage(this);
  await creditNote.completeRefundCreditNoteJourney();
});

Then('I should see the credit note refunded successfully', { timeout: 120000 }, async function () {
  const creditNote = getCreditNotePage(this);
  await creditNote.expectCreditNoteRefundedSuccessfully();
});

When('I complete the preview refund journey after refunding a credit note', { timeout: 480000 }, async function () {
  const creditNote = getCreditNotePage(this);
  await creditNote.completePreviewRefundJourney();
});

Then('I should see the refund preview opened', { timeout: 120000 }, async function () {
  const creditNote = getCreditNotePage(this);
  await creditNote.expectRefundPreviewOpened();
});

When('I complete the refund payment journey after registering a payment', { timeout: 480000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.completeRefundPaymentJourney();
});

Then('I should see the payment refunded successfully', { timeout: 120000 }, async function () {
  const payment = getPaymentPage(this);
  await payment.expectPaymentRefundedSuccessfully();
});

When(
  'I complete the invoice create from scratch journey with Pay Now to client enabled',
  { timeout: 360000 },
  async function () {
    const invoice = getInvoicePage(this);
    await invoice.completeInvoiceCreateFromScratchWithPayNowJourney({
      name: 'Electricians',
      lineItem: 'Labour 1',
    });
  }
);

When(
  'I complete the pay now card journey after creating an invoice with Pay Now enabled',
  { timeout: 480000 },
  async function () {
    const invoice = getInvoicePage(this);
    await invoice.completePayNowCardJourneyAfterCreate();
  }
);

When(
  'I complete the pay now card journey after creating an invoice with Pay Now and extra payment terms',
  { timeout: 480000 },
  async function () {
    const invoice = getInvoicePage(this);
    await invoice.completePayNowCardJourneyWithExtraPaymentTerms();
  }
);

Then('I should see the pay now payment successful message', { timeout: 120000 }, async function () {
  const invoice = getInvoicePage(this);
  await invoice.closePaymentSuccessPopup();
});
