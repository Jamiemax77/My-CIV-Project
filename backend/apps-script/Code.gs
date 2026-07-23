/**
 * Web App entry points. Deploy this project as a Web App (Execute as: Me,
 * Who has access: Anyone) — see backend/SETUP.md. The app never talks to
 * Sheets/Drive directly; every request goes through doPost below.
 */

const WRITE_ACTIONS = [
  'login',
  'addReimbursement',
  'reviewReimbursement',
  'addReport',
  'reviewReport',
  'addAccount',
  'addDisbursement',
  'addTransferProof',
  'confirmTransferProof',
  'uploadFile',
];

function doGet() {
  return jsonResponse({ ok: true, data: { status: 'My CIV-Project API is running' } });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, error: 'Request tidak valid.' });
  }

  const action = body.action;
  const token = body.token;
  const payload = body.payload || {};

  try {
    const result = WRITE_ACTIONS.indexOf(action) !== -1
      ? withLock(() => routeAction(action, token, payload))
      : routeAction(action, token, payload);
    return jsonResponse({ ok: true, data: result });
  } catch (err) {
    return jsonResponse({ ok: false, error: String((err && err.message) || err) });
  }
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function routeAction(action, token, payload) {
  switch (action) {
    case 'login':
      return authLogin(payload);
    case 'me':
      return authMe(token);

    // Participant
    case 'getDashboard':
      return participantGetDashboard(requireAuth(token, 'participant'));
    case 'listReimbursements':
      return participantListReimbursements(requireAuth(token, 'participant'));
    case 'addReimbursement':
      return participantAddReimbursement(requireAuth(token, 'participant'), payload);
    case 'listReports':
      return participantListReports(requireAuth(token, 'participant'));
    case 'addReport':
      return participantAddReport(requireAuth(token, 'participant'), payload);
    case 'listAccounts':
      return participantListAccounts(requireAuth(token, 'participant'));
    case 'addAccount':
      return participantAddAccount(requireAuth(token, 'participant'), payload);
    case 'listTransferProofs':
      return participantListTransferProofs(requireAuth(token, 'participant'));
    case 'confirmTransferProof':
      return participantConfirmTransferProof(requireAuth(token, 'participant'), payload);

    // Admin
    case 'adminListParticipants':
      return adminListParticipants(requireAuth(token, 'admin'));
    case 'adminAddDisbursement':
      return adminAddDisbursement(requireAuth(token, 'admin'), payload);
    case 'adminListReimbursements':
      return adminListReimbursements(requireAuth(token, 'admin'));
    case 'adminReviewReimbursement':
      return adminReviewReimbursement(requireAuth(token, 'admin'), payload);
    case 'adminListReports':
      return adminListReports(requireAuth(token, 'admin'));
    case 'adminReviewReport':
      return adminReviewReport(requireAuth(token, 'admin'), payload);
    case 'adminAddTransferProof':
      return adminAddTransferProof(requireAuth(token, 'admin'), payload);

    // Drive (either role, ownership enforced inside the handler)
    case 'uploadFile':
      return driveUploadFile(requireAuth(token), payload);
    case 'getFile':
      return driveGetFile(requireAuth(token), payload);

    default:
      throw new Error('Aksi tidak dikenal: ' + action);
  }
}
