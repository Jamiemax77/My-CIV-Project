/** Admin-facing action handlers. Every function here requires session.role === 'admin' (enforced by the router). */

function adminListParticipants() {
  const profiles = sheetToObjects(getSheet('profiles')).filter((p) => p.role === 'participant');
  const disbursements = sheetToObjects(getSheet('disbursements'));
  const reimbursements = sheetToObjects(getSheet('reimbursements'));
  const reports = sheetToObjects(getSheet('reports'));

  return profiles.map((profile) => {
    const ownDisbursements = disbursements.filter(
      (d) => d.participant_id === profile.id && d.status !== 'draft'
    );
    const total = ownDisbursements.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const used = reimbursements
      .filter((r) => r.participant_id === profile.id && r.status === 'approved')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const hasAnyReport = reports.some((r) => r.participant_id === profile.id);

    return {
      profile: profileToPublic(profile),
      remaining: total - used,
      status: hasAnyReport ? 'aktif' : 'belum_lapor',
    };
  });
}

function adminAddDisbursement(session, payload) {
  const sheet = getSheet('disbursements');
  const id = 'd-' + Utilities.getUuid().slice(0, 8);
  appendObject(sheet, {
    id,
    participant_id: payload.participantId,
    scholarship_id: payload.scholarshipId || '',
    title: payload.title,
    amount: payload.amount,
    period: payload.period || '',
    disbursed_at: payload.disbursedAt || new Date().toISOString().slice(0, 10),
    note: payload.note || '',
    status: payload.status || 'disbursed',
    created_at: new Date().toISOString(),
  });
  return { id };
}

function adminListReimbursements() {
  return sheetToObjects(getSheet('reimbursements')).map(reimbursementToPublic);
}

function adminReviewReimbursement(session, payload) {
  const sheet = getSheet('reimbursements');
  const row = findRowById(sheet, payload.id);
  updateObjectByRow(sheet, row.__row, {
    status: payload.status,
    reviewed_by: session.profileId,
    reviewed_at: new Date().toISOString(),
  });
  return { ok: true };
}

function adminListReports() {
  return sheetToObjects(getSheet('reports')).map(reportToPublic);
}

function adminReviewReport(session, payload) {
  const sheet = getSheet('reports');
  const row = findRowById(sheet, payload.id);
  updateObjectByRow(sheet, row.__row, {
    status: payload.status,
    reviewed_by: session.profileId,
    reviewed_at: new Date().toISOString(),
  });
  return { ok: true };
}

function adminAddTransferProof(session, payload) {
  const sheet = getSheet('transfer_proofs');
  const id = 'tp-' + Utilities.getUuid().slice(0, 8);
  appendObject(sheet, {
    id,
    participant_id: payload.participantId,
    disbursement_id: payload.disbursementId,
    amount: payload.amount,
    sender_bank: payload.senderBank,
    dest_account: payload.destAccount,
    transferred_at: payload.transferredAt || new Date().toISOString(),
    reference_no: payload.referenceNo,
    proof_drive_id: payload.proofFileId || '',
    proof_name: payload.proofFileName || '',
    confirmed_by_participant: false,
  });
  return { id };
}
