// config/urls.js
// Composed page URLs. Never hardcode hosts — read them from config/env.js.

const env = require('./env');

function stripSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function joinUrl(base, pathAndQuery) {
  const root = stripSlash(base);
  const suffix = String(pathAndQuery || '');
  if (!suffix) return root;
  return `${root}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
}

function pathnameOf(url, base = env.admin) {
  try {
    return new URL(url, base).pathname.replace(/\/+$/, '') || '/';
  } catch {
    return '';
  }
}

const adminBase = stripSlash(env.admin);

const urls = {
  env,
  adminBase,
  vendorSignIn: env.vendor,
  clientPortal: env.client,
  adminSignIn: joinUrl(adminBase, '/auth/signIn'),
  adminDashboard: joinUrl(adminBase, '/dashboard'),
  clientsProjectsList: joinUrl(adminBase, '/client?isActive=true'),
  clientProfile: joinUrl(adminBase, '/client/profile'),
  leadManagerMaster: joinUrl(adminBase, '/leadmanager/master?isActive=true&isSnoozed=false'),
  factoryManagement: joinUrl(adminBase, '/factory-management'),
  joinUrl,
  stripSlash,
  pathnameOf,
  isAdminDashboard(url) {
    return pathnameOf(url) === '/dashboard';
  },
  isClientsProjectsList(url) {
    const path = pathnameOf(url);
    if (path === '/client') return true;
    if (path !== '/client/profile') return false;
    try {
      return !new URL(url, adminBase).searchParams.get('projectId');
    } catch {
      return true;
    }
  },
  isFactoryManagement(url) {
    const path = pathnameOf(url);
    return path === '/factory-management' || path.startsWith('/factory-management/');
  },
  /** Client/lead profile hub opened from Clients/Projects (`/client/profile?...&projectId=`). */
  isClientProjectProfile(url) {
    const path = pathnameOf(url);
    if (path === '/client/profile') {
      try {
        return Boolean(new URL(url, adminBase).searchParams.get('projectId'));
      } catch {
        return false;
      }
    }
    if (/\/project\/[^/?#]+/i.test(path)) return true;
    if (/leadmanager\/profile/i.test(path)) return true;
    return false;
  },
};

module.exports = urls;
