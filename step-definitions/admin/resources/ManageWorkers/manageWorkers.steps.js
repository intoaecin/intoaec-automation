const { When, Then } = require('@cucumber/cucumber');
const ManageWorkersPage = require('../../../../pages/admin/resources/ManageWorkers/ManageWorkersPage');
const { syncContextToWorld, getContext } = require('../../../../pages/admin/resources/ManageWorkers/workerTestContext');

function getManageWorkersPage(world) {
  if (!world.manageWorkersPage) {
    world.manageWorkersPage = new ManageWorkersPage(world.page);
  }
  return world.manageWorkersPage;
}

When('I navigate to the Resources Manage Workers page', { timeout: 120000 }, async function () {
  await getManageWorkersPage(this).navigateToManageWorkers();
});

When('I start creating an individual worker', { timeout: 120000 }, async function () {
  await getManageWorkersPage(this).startCreateIndividualWorker();
});

When('I start creating a contractor with workers', { timeout: 120000 }, async function () {
  await getManageWorkersPage(this).startCreateContractorWorker();
});

When('I fill the individual worker form with valid details', { timeout: 120000 }, async function () {
  const page = getManageWorkersPage(this);
  const data = await page.fillIndividualWorkerForm();
  syncContextToWorld(this, {
    individualName: data.individualName,
    rate: data.rate,
    workingHours: data.workingHours,
    workerTypeName: data.workerTypeName,
  });
});

When('I fill the contractor worker form with valid details', { timeout: 120000 }, async function () {
  const page = getManageWorkersPage(this);
  const data = await page.fillContractorWorkerForm();
  syncContextToWorld(this, {
    contractorName: data.contractorName,
    rate: data.rate,
    workingHours: data.workingHours,
    workerTypeName: data.workerTypeName,
  });
});

When('I leave the required individual worker fields empty', { timeout: 60000 }, async function () {
  await getManageWorkersPage(this).leaveRequiredIndividualFieldsEmpty();
});

When('I submit the worker form', { timeout: 120000 }, async function () {
  await getManageWorkersPage(this).submitWorkerForm();
});

When('I create an individual worker quickly', { timeout: 180000 }, async function () {
  const page = getManageWorkersPage(this);
  const data = await page.createIndividualWorkerQuick(this);
  syncContextToWorld(this, { individualName: data.individualName, rate: data.rate });
});

When('I create a contractor worker quickly', { timeout: 180000 }, async function () {
  const page = getManageWorkersPage(this);
  const data = await page.createContractorWorkerQuick(this);
  syncContextToWorld(this, { contractorName: data.contractorName, rate: data.rate });
});

When('I open edit for the created individual worker', { timeout: 120000 }, async function () {
  const ctx = getContext(this);
  await getManageWorkersPage(this).clickEditOnWorkerRow(ctx.individualName);
});

When('I update the individual worker details', { timeout: 120000 }, async function () {
  const page = getManageWorkersPage(this);
  await page.updateIndividualWorkerDetails();
  syncContextToWorld(this, {
    individualName: page.workerData.individualName,
    editedName: page.workerData.editedName,
  });
});

When('I open delete for the created individual worker', { timeout: 120000 }, async function () {
  const ctx = getContext(this);
  await getManageWorkersPage(this).clickDeleteOnWorkerRow(ctx.individualName);
});

When('I fill the worker delete reason', { timeout: 60000 }, async function () {
  await getManageWorkersPage(this).fillDeleteReason();
});

When('I confirm the worker delete', { timeout: 120000 }, async function () {
  await getManageWorkersPage(this).confirmDeleteWorker();
});

Then('I should see the worker created successfully', { timeout: 120000 }, async function () {
  const ctx = getContext(this);
  await getManageWorkersPage(this).verifyWorkerCreatedSuccessfully(
    ctx.individualName || ctx.contractorName
  );
});

Then('I should see the worker updated successfully', { timeout: 120000 }, async function () {
  await getManageWorkersPage(this).verifyWorkerUpdatedSuccessfully();
});

Then('I should see the worker deleted successfully', { timeout: 120000 }, async function () {
  const ctx = getContext(this);
  await getManageWorkersPage(this).verifyWorkerDeletedSuccessfully(ctx.individualName);
});

Then('I should see the created individual worker in the list', { timeout: 120000 }, async function () {
  const ctx = getContext(this);
  await getManageWorkersPage(this).verifyWorkerVisibleInList(ctx.individualName);
});

Then('I should see the created contractor worker in the list', { timeout: 120000 }, async function () {
  const ctx = getContext(this);
  await getManageWorkersPage(this).verifyWorkerVisibleInList(ctx.contractorName);
});

Then('I should see the edited individual worker in the list', { timeout: 120000 }, async function () {
  const ctx = getContext(this);
  await getManageWorkersPage(this).verifyWorkerVisibleInList(ctx.individualName || ctx.editedName);
});

Then('the worker create button should remain disabled', { timeout: 60000 }, async function () {
  await getManageWorkersPage(this).verifyCreateButtonDisabled();
});

When('I open Manage Worker Types', { timeout: 120000 }, async function () {
  await getManageWorkersPage(this).openManageWorkerTypes();
});

When('I start adding a worker type', { timeout: 120000 }, async function () {
  await getManageWorkersPage(this).startAddWorkerType();
});

When('I fill the worker type form with valid details', { timeout: 120000 }, async function () {
  const page = getManageWorkersPage(this);
  const data = await page.fillWorkerTypeForm();
  syncContextToWorld(this, {
    workerTypeName: data.name,
    workerTypeDescription: data.description,
  });
});

When('I leave the worker type name empty', { timeout: 60000 }, async function () {
  await getManageWorkersPage(this).leaveWorkerTypeNameEmpty();
});

When('I submit the worker type form', { timeout: 120000 }, async function () {
  await getManageWorkersPage(this).submitWorkerTypeForm();
});

When('I create a worker type quickly', { timeout: 180000 }, async function () {
  const page = getManageWorkersPage(this);
  const data = await page.createWorkerTypeQuick(this);
  syncContextToWorld(this, {
    workerTypeName: data.name,
    workerTypeDescription: data.description,
  });
});

When('I open edit for the created worker type', { timeout: 120000 }, async function () {
  const ctx = getContext(this);
  await getManageWorkersPage(this).openEditWorkerType(ctx.workerTypeName);
});

When('I update the worker type details', { timeout: 120000 }, async function () {
  const page = getManageWorkersPage(this);
  const data = await page.updateWorkerTypeDetails();
  syncContextToWorld(this, {
    workerTypeName: data.name,
    editedWorkerTypeName: data.name,
    workerTypeDescription: data.description,
  });
});

When('I open delete for the created worker type', { timeout: 120000 }, async function () {
  const ctx = getContext(this);
  await getManageWorkersPage(this).openDeleteWorkerType(ctx.workerTypeName);
});

When('I confirm the worker type delete', { timeout: 120000 }, async function () {
  await getManageWorkersPage(this).confirmDeleteWorkerType();
});

Then('I should see the worker type created successfully', { timeout: 120000 }, async function () {
  const ctx = getContext(this);
  await getManageWorkersPage(this).verifyWorkerTypeCreatedSuccessfully(ctx.workerTypeName);
});

Then('I should see the worker type updated successfully', { timeout: 120000 }, async function () {
  await getManageWorkersPage(this).verifyWorkerTypeUpdatedSuccessfully();
});

Then('I should see the worker type deleted successfully', { timeout: 120000 }, async function () {
  const ctx = getContext(this);
  await getManageWorkersPage(this).verifyWorkerTypeDeletedSuccessfully(ctx.workerTypeName);
});

Then('I should see the created worker type in the panel', { timeout: 120000 }, async function () {
  const ctx = getContext(this);
  await getManageWorkersPage(this).verifyWorkerTypeVisibleInPanel(ctx.workerTypeName);
});

Then('I should see the edited worker type in the panel', { timeout: 120000 }, async function () {
  const ctx = getContext(this);
  await getManageWorkersPage(this).verifyWorkerTypeVisibleInPanel(
    ctx.editedWorkerTypeName || ctx.workerTypeName
  );
});

Then('the worker type create button should remain disabled', { timeout: 60000 }, async function () {
  await getManageWorkersPage(this).verifyWorkerTypeCreateButtonDisabled();
});
