/**
 * File storage in Google Drive, organized as /CIV-Project/{participant_id}/{category}/.
 * Files are kept private; the app must always go through `getFile` (never a public link).
 */

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function getOrCreateFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function getParticipantFolder(participantId, category) {
  const root = getOrCreateFolder(DriveApp.getRootFolder(), 'CIV-Project');
  const participantFolder = getOrCreateFolder(root, participantId);
  return getOrCreateFolder(participantFolder, category || 'lainnya');
}

/** payload: { category, filename, mimeType, base64 } */
function driveUploadFile(session, payload) {
  const base64 = payload.base64;
  if (!base64) throw new Error('File kosong.');

  const approxBytes = Math.ceil((base64.length * 3) / 4);
  if (approxBytes > MAX_FILE_BYTES) throw new Error('Ukuran file maks 5MB.');

  const folder = getParticipantFolder(session.profileId, payload.category);
  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64),
    payload.mimeType || 'application/octet-stream',
    payload.filename || 'file'
  );
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

  return { fileId: file.getId(), name: file.getName() };
}

/**
 * payload: { fileId }. Streams the file back as base64 rather than a shareable
 * link, so access always passes through this token-checked action.
 * Participants may only read files under their own CIV-Project/{profileId}/ folder;
 * admins may read any file (they can already see every participant's records).
 */
function driveGetFile(session, payload) {
  const file = DriveApp.getFileById(payload.fileId);

  if (session.role !== 'admin') {
    const parents = file.getParents();
    const ownedByCaller = parents.hasNext() && parents.next().getName() === session.profileId;
    if (!ownedByCaller) throw new Error('Tidak memiliki akses untuk file ini.');
  }

  const blob = file.getBlob();
  return {
    name: file.getName(),
    mimeType: blob.getContentType(),
    base64: Utilities.base64Encode(blob.getBytes()),
  };
}
