/**
 * Module-level factory session. Cucumber builds a new world per scenario,
 * but this object survives so a later TC can reuse the workshop and job
 * created earlier in the same run. A TC run alone still creates what it needs.
 */

const TEMPLATE_TRADE_NAMES = [
  'Joinery, millwork and kitchens',
  'Aluminium windows and glazing',
  'Door sets',
  'Stone and countertops',
  'Structural steel fabrication',
  'Stretch ceilings and membrane',
  'Signage and feature walls',
  'Modular pods and cabins',
  'Light steel framing',
  'Ductwork prefabrication',
  'MEP prefabricated racks',
  'Precast concrete and GRC',
  'Rebar cutting and bending',
  'General workshop',
];

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
}

function buildSession() {
  const id = `${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 1000)}`;
  return {
    id,
    workshopName: `Auto Workshop ${id}`,
    address: '12 Automation Street',
    country: 'India',
    state: 'Tamil Nadu',
    city: 'Chennai',
    zip: '600001',
    editedZip: '600028',
    pickedTradeName: '',
    tradeName: `Auto Trade ${id}`,
    renamedTradeName: `Auto Trade Renamed ${id}`,
    secondTradeName: `Auto Trade Two ${id}`,
    originalPrimaryTrade: '',
    stageName: `Auto Stage ${id}`,
    editedStageName: `Auto Stage Edited ${id}`,
    unusedStageName: `Unused Stage ${id}`,
    secondStageName: `Auto Stage Two ${id}`,
    jobTitle: `Auto Job ${id}`,
    jobNotes: `Workshop notes ${id}`,
    declineJobTitle: `Decline Job ${id}`,
    deleteJobTitle: `Delete Job ${id}`,
    dateAcceptJobTitle: `Date Accept Job ${id}`,
    dateDeclineJobTitle: `Date Decline Job ${id}`,
    invalidDateJobTitle: `Date Invalid Job ${id}`,
    noMaterialJobTitle: `No Material Job ${id}`,
    dispatchJobTitle: `Dispatch Job ${id}`,
    materialName: `Auto Material ${id}`,
    secondMaterialName: `Auto Material Two ${id}`,
    stockMaterialName: '',
    stockQty: '5',
    jobQty: '4',
    unit: '',
    jobNo: '',
    indentTitle: `Auto Indent ${id}`,
    secondIndentTitle: `Auto Indent Two ${id}`,
    destination: `Auto Site ${id}`,
    projectUrl: '',
    projectName: '',
    neededOnSite: addDays(21),
    proposedDate: addDays(28),
    earlyProposedDate: addDays(7),
    flags: {},
  };
}

let session = buildSession();

function getContext() {
  return session;
}

function patch(partial = {}) {
  Object.assign(session, partial);
  return session;
}

function flag(name, value = true) {
  session.flags[name] = value;
  return session;
}

function has(name) {
  return Boolean(session.flags[name]);
}

function escapeRe(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  TEMPLATE_TRADE_NAMES,
  addDays,
  getContext,
  patch,
  flag,
  has,
  escapeRe,
};
