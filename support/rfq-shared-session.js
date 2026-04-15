/**
 * Persists across Cucumber scenarios (World is recreated each scenario).
 * One login + full navigation per `cucumber` process; later scenarios only re-open RFQ list.
 */
let rfqSuiteSessionPrimed = false;

function isRfqSuiteSessionPrimed() {
  return rfqSuiteSessionPrimed;
}

function setRfqSuiteSessionPrimed(value) {
  rfqSuiteSessionPrimed = !!value;
}

function resetRfqSuiteSession() {
  rfqSuiteSessionPrimed = false;
}

module.exports = {
  isRfqSuiteSessionPrimed,
  setRfqSuiteSessionPrimed,
  resetRfqSuiteSession,
};
