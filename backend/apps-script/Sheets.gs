/** Generic row <-> object helpers shared by every action handler. */

function getSheet(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

/** Reads every data row into an object keyed by header name. Adds `__row` (1-indexed sheet row). */
function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.every((cell) => cell === '')) continue;
    const obj = {};
    headers.forEach((header, col) => {
      obj[header] = row[col];
    });
    obj.__row = i + 1;
    rows.push(obj);
  }
  return rows;
}

function appendObject(sheet, obj) {
  const headers = getHeaders(sheet);
  const row = headers.map((h) => (obj[h] !== undefined ? obj[h] : ''));
  sheet.appendRow(row);
}

/** Patches only the given keys on the row at `rowIndex` (as returned via `__row`). */
function updateObjectByRow(sheet, rowIndex, patch) {
  const headers = getHeaders(sheet);
  headers.forEach((header, col) => {
    if (patch[header] !== undefined) {
      sheet.getRange(rowIndex, col + 1).setValue(patch[header]);
    }
  });
}

function findRowById(sheet, id) {
  const match = sheetToObjects(sheet).find((row) => String(row.id) === String(id));
  if (!match) throw new Error('Data tidak ditemukan: ' + id);
  return match;
}
