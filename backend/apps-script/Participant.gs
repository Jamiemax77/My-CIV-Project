/** Participant-facing action handlers. Every function here trusts `session.profileId` only. */

function participantGetDashboard(session) {
  const disbursements = sheetToObjects(getSheet('disbursements')).filter(
    (d) => d.participant_id === session.profileId && d.status !== 'draft'
  );
  const reimbursements = sheetToObjects(getSheet('reimbursements')).filter(
    (r) => r.participant_id === session.profileId
  );
  const transferProofs = sheetToObjects(getSheet('transfer_proofs')).filter(
    (t) => t.participant_id === session.profileId
  );

  const total = disbursements.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const used = reimbursements
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return {
    total,
    used,
    remaining: total - used,
    approvedCount: reimbursements.filter((r) => r.status === 'approved').length,
    pendingCount: reimbursements.filter((r) => r.status === 'pending').length,
    disbursements: disbursements.map((d) => {
      const proof = transferProofs.find((t) => t.disbursement_id === d.id);
      return {
        id: d.id,
        title: d.title,
        amount: Number(d.amount),
        disbursedAt: d.disbursed_at,
        transferProofId: proof ? proof.id : null,
      };
    }),
  };
}

function reimbursementToPublic(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    type: row.type,
    category: row.category,
    amount: Number(row.amount),
    description: row.description,
    proofFileName: row.proof_name,
    status: row.status,
    createdAt: row.created_at,
  };
}

function participantListReimbursements(session) {
  return sheetToObjects(getSheet('reimbursements'))
    .filter((r) => r.participant_id === session.profileId)
    .map(reimbursementToPublic);
}

function participantAddReimbursement(session, payload) {
  const sheet = getSheet('reimbursements');
  const id = 'r-' + Utilities.getUuid().slice(0, 8);
  appendObject(sheet, {
    id,
    participant_id: session.profileId,
    type: payload.type,
    category: payload.category,
    amount: payload.amount,
    description: payload.description,
    proof_drive_id: payload.proofFileId || '',
    proof_name: payload.proofFileName || '',
    status: 'pending',
    created_at: new Date().toISOString(),
  });
  return { id };
}

function reportToPublic(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    semester: row.semester,
    gpa: Number(row.gpa),
    fileName: row.file_name,
    status: row.status,
    createdAt: row.created_at,
  };
}

function participantListReports(session) {
  return sheetToObjects(getSheet('reports'))
    .filter((r) => r.participant_id === session.profileId)
    .map(reportToPublic);
}

function participantAddReport(session, payload) {
  const sheet = getSheet('reports');
  const id = 'rep-' + Utilities.getUuid().slice(0, 8);
  appendObject(sheet, {
    id,
    participant_id: session.profileId,
    semester: payload.semester,
    gpa: payload.gpa,
    file_drive_id: payload.fileId || '',
    file_name: payload.fileName || '',
    status: 'pending',
    created_at: new Date().toISOString(),
  });
  return { id };
}

function accountToPublic(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    kind: row.kind,
    provider: row.provider,
    number: row.number,
    holderName: row.holder_name,
    isPrimary: row.is_primary === true || row.is_primary === 'TRUE',
  };
}

function participantListAccounts(session) {
  return sheetToObjects(getSheet('accounts'))
    .filter((a) => a.participant_id === session.profileId)
    .map(accountToPublic);
}

function participantAddAccount(session, payload) {
  const sheet = getSheet('accounts');
  const existing = sheetToObjects(sheet).filter((a) => a.participant_id === session.profileId);
  const id = 'acc-' + Utilities.getUuid().slice(0, 8);
  appendObject(sheet, {
    id,
    participant_id: session.profileId,
    kind: payload.kind,
    provider: payload.provider,
    number: payload.number,
    holder_name: payload.holderName,
    is_primary: existing.length === 0,
  });
  return { id };
}

function transferProofToPublic(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    disbursementId: row.disbursement_id,
    amount: Number(row.amount),
    senderBank: row.sender_bank,
    destAccount: row.dest_account,
    transferredAt: row.transferred_at,
    referenceNo: row.reference_no,
    proofFileName: row.proof_name,
    confirmedByParticipant: row.confirmed_by_participant === true || row.confirmed_by_participant === 'TRUE',
  };
}

function participantListTransferProofs(session) {
  return sheetToObjects(getSheet('transfer_proofs'))
    .filter((t) => t.participant_id === session.profileId)
    .map(transferProofToPublic);
}

function participantConfirmTransferProof(session, payload) {
  const sheet = getSheet('transfer_proofs');
  const row = findRowById(sheet, payload.id);
  if (row.participant_id !== session.profileId) {
    throw new Error('Tidak memiliki akses untuk data ini.');
  }
  updateObjectByRow(sheet, row.__row, { confirmed_by_participant: true });
  return { ok: true };
}
