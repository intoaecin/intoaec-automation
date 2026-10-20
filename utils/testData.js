// utils/testData.js
const testData = {
  admin: {
    validUser:   { email: 'kumar@diy.in', password: 'Simple@10' },
    // invalidUser: { email: 'wrong@gmail.com',       password: 'wrongpass' }
  },
  vendor: {
    validUser:   { email: 'praveen@yopmail.com', password: 'Simple@10' },
    rfqUser: {
      email: process.env.VENDOR_RFQ_EMAIL || 'praveen@yopmail.com',
      password: process.env.VENDOR_RFQ_PASSWORD || 'Simple@10',
      /** Connected org on vendor Procurement Hub; override with VENDOR_RFQ_ORG_NAME env. */
      organization: process.env.VENDOR_RFQ_ORG_NAME || 'Aditya Constructions',
      /** Admin client/project opened for RFQ (kumar@diy.in → client "Bhavani M"); override with VENDOR_RFQ_PROJECT. */
      project: process.env.VENDOR_RFQ_PROJECT || 'Bhavani',
      /**
       * Admin project for RFQ create/verify.
       * Default "any" = first Active Clients project whose name matches kumar
       * (never Aditya / malick / AEC Solutions / Dev-Inprogress / BBB).
       * Override: VENDOR_RFQ_ADMIN_PROJECT=<kumar project name>
       */
      adminProject: process.env.VENDOR_RFQ_ADMIN_PROJECT || 'any',
      /** Prefer these Admin Project Name values first (not Client Name — client can be John/Abu/etc.). */
      preferAdminProjects: (
        process.env.VENDOR_RFQ_PREFER_ADMIN_PROJECTS ||
        'kumarorganization,kumar'
      )
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      /** Skip these Active Clients names when adminProject is "any". */
      skipAdminProjects: (
        process.env.VENDOR_RFQ_SKIP_ADMIN_PROJECTS ||
        'Dev-Inprogress,Dev-Inprogress - Dont touch,Dont touch,BBB,AEC_Solutions,AEC Solutions,MVB,Hari,adityaconstructions,adityaconstuctions,Aditya Constructions,aditya constructions,malick,ZAYAN'
      )
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    },
    /** Goods Receipt TC-01 PO accept inbox (Yopmail External Page Accept). */
    goodsReceiptYopmail: {
      email:
        process.env.PO_VENDOR_YOPMAIL_EMAIL ||
        process.env.PO_VENDOR_YOPMAIL_ID ||
        'poojaal002@yopmail.com',
      searchHint: process.env.PO_VENDOR_YOPMAIL_SEARCH || 'Yopmail',
    },
    /** Optional Mailinator inbox (Goods Receipt TCs use Yopmail). */
    goodsReceiptMailinator: {
      email:
        process.env.PO_VENDOR_MAILINATOR_EMAIL ||
        'bhavani123456@mailinator.com',
      searchHint: process.env.PO_VENDOR_MAILINATOR_SEARCH || 'Mailinator',
    },
  },
  client: {
    validUser:   { email: 'client@gmail.com',      password: 'Client@10' },
    portalUser: {
      email: 'bhavani123@yopmail.com',
      originalName: 'john',
      updatedName: 'Hari',
      portalUrl: 'https://staging-bac9-intoaec1.wpcomstaging.com/cutomer-portal/',
    },
    myFiles: {
      folderName: 'My Folder',
      uploadFolderName: 'Upload Test Folder',
      uploadFolderPath: 'fixtures/Upload Test Folder',
    },
    meeting: {
      purpose: 'For Testing discussion for meeting',
      offlinePurpose: 'For Testing Process',
      offlineLocation: 'Chennai, Tamil Nadu, India',
      frequency: 'Monthly',
      mode: 'Online',
    },
    /** MVB project client — email captured live from Admin Client tab (TC-01). */
    mvb: {
      clientName: 'MVB',
      contactName: 'Bhavani M',
      email: 'bhavani123@yopmail.com',
      projectId: process.env.ADMIN_MVB_PROJECT_ID || '1808c568-ab81-47de-9559-9cbd6d9c56b7',
      clientId: process.env.ADMIN_MVB_CLIENT_ID || '810fe142-aae5-4596-91af-8710a241c5e3',
    },
  }
};

module.exports = testData;
