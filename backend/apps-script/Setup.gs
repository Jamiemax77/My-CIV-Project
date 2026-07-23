/**
 * One-time setup helpers. Open this project in the Apps Script editor,
 * select a function below in the toolbar dropdown, and click Run.
 * See backend/SETUP.md for the full deployment walkthrough.
 */

const SHEET_SCHEMAS = {
  profiles: [
    'id', 'role', 'full_name', 'id_number', 'email', 'phone', 'gender',
    'university', 'semester', 'photo_drive_id',
    'pin_hash', 'pin_salt', 'failed_attempts', 'locked_until',
  ],
  scholarships: [
    'id', 'participant_id', 'program', 'period', 'total_amount',
    'created_by', 'created_at',
  ],
  disbursements: [
    'id', 'participant_id', 'scholarship_id', 'title', 'amount', 'period',
    'disbursed_at', 'note', 'status', 'created_at',
  ],
  reimbursements: [
    'id', 'participant_id', 'type', 'category', 'amount', 'description',
    'proof_drive_id', 'proof_name', 'status', 'reviewed_by', 'reviewed_at',
    'created_at',
  ],
  reports: [
    'id', 'participant_id', 'semester', 'gpa', 'file_drive_id', 'file_name',
    'status', 'reviewed_by', 'reviewed_at', 'created_at',
  ],
  accounts: [
    'id', 'participant_id', 'kind', 'provider', 'number', 'holder_name',
    'is_primary',
  ],
  transfer_proofs: [
    'id', 'participant_id', 'disbursement_id', 'amount', 'sender_bank',
    'dest_account', 'transferred_at', 'reference_no', 'proof_drive_id',
    'proof_name', 'confirmed_by_participant',
  ],
};

/** Run once: creates every tab (if missing) with its header row frozen. Safe to re-run. */
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEET_SCHEMAS).forEach((name) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    const headers = SHEET_SCHEMAS[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  });

  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > Object.keys(SHEET_SCHEMAS).length) {
    ss.deleteSheet(defaultSheet);
  }

  Logger.log('Sheets ready: ' + Object.keys(SHEET_SCHEMAS).join(', '));
}

/**
 * Run once (or per new user): logs a salt + pin_hash pair for a given PIN.
 * Copy both values into that user's row in the `profiles` sheet.
 * Example: seedPin('123456') then check the execution log.
 */
function seedPin(pin) {
  const salt = Utilities.getUuid();
  const hash = hashPin(pin, salt);
  Logger.log('pin_salt: ' + salt);
  Logger.log('pin_hash: ' + hash);
  return { salt, hash };
}

/** Run once after setting Script Properties: confirms HMAC_SECRET is configured. */
function checkConfig() {
  const secret = PropertiesService.getScriptProperties().getProperty('HMAC_SECRET');
  if (!secret) {
    Logger.log('Missing HMAC_SECRET. Set it under Project Settings > Script Properties.');
  } else {
    Logger.log('HMAC_SECRET is set (' + secret.length + ' chars).');
  }
}
