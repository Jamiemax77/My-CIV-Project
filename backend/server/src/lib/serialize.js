function profileToPublic(row) {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    idNumber: row.id_number,
    nim: row.nim || undefined,
    email: row.email,
    phone: row.phone || undefined,
    gender: row.gender || undefined,
    university: row.university || undefined,
    semester: row.semester ?? undefined,
    scholarshipType: row.scholarship_type || undefined,
    photoUrl: row.photo_path || undefined,
    mustChangePin: !!row.must_change_pin,
    major: row.major || undefined,
  };
}

/** `row` may carry joined `participant_full_name`/`participant_id_number` (admin list queries) or not (participant's own list). */
function reimbursementToPublic(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    type: row.type,
    category: row.category,
    amount: row.amount,
    description: row.description,
    proofFileId: row.proof_path || undefined,
    proofFileName: row.proof_name,
    status: row.status,
    createdAt: row.created_at,
    participantName: row.participant_full_name || undefined,
    participantIdNumber: row.participant_id_number || undefined,
  };
}

function reportToPublic(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    semester: row.semester,
    gpa: row.gpa,
    fileId: row.file_path || undefined,
    fileName: row.file_name,
    status: row.status,
    createdAt: row.created_at,
    participantName: row.participant_full_name || undefined,
    participantIdNumber: row.participant_id_number || undefined,
    participantSemester: row.participant_semester ?? undefined,
  };
}

function accountToPublic(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    kind: row.kind,
    provider: row.provider,
    number: row.number,
    holderName: row.holder_name,
    isPrimary: !!row.is_primary,
  };
}

/** `row` may carry a joined `disbursement_title` (participant's own list query). */
function transferProofToPublic(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    disbursementId: row.disbursement_id,
    disbursementTitle: row.disbursement_title || undefined,
    amount: row.amount,
    senderBank: row.sender_bank,
    destAccount: row.dest_account,
    transferredAt: row.transferred_at,
    referenceNo: row.reference_no,
    proofFileId: row.proof_path || undefined,
    proofFileName: row.proof_name,
    confirmedByParticipant: !!row.confirmed_by_participant,
  };
}

function fundSourceToPublic(row) {
  return {
    id: row.id,
    scholarshipType: row.scholarship_type,
    interventionId: row.intervention_id || undefined,
    fundName: row.fund_name || undefined,
    description: row.description || undefined,
    amount: Number(row.amount),
    createdAt: row.created_at,
  };
}

/** `row` may carry joined `participant_full_name`/`participant_id_number` (admin list queries) plus computed `checklist`/`activityCount`. */
function fullSemesterReportToPublic(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    semesterNumber: row.semester_number,
    year: row.year || undefined,
    sks: row.sks ?? undefined,
    ips: row.ips !== null && row.ips !== undefined ? Number(row.ips) : undefined,
    ipk: row.ipk !== null && row.ipk !== undefined ? Number(row.ipk) : undefined,
    coverLetter: row.cover_letter || undefined,
    totalAmount: row.total_amount !== null && row.total_amount !== undefined
      ? Number(row.total_amount)
      : undefined,
    fileName: row.file_name || undefined,
    status: row.status,
    createdAt: row.created_at,
    participantName: row.participant_full_name || undefined,
    participantIdNumber: row.participant_id_number || undefined,
    checklist: row.checklist || undefined,
    activityCount: row.activityCount ?? undefined,
    khsFileId: row.khsFileId || undefined,
    commitmentParticipantFileId: row.commitmentParticipantFileId || undefined,
    commitmentGuardianFileId: row.commitmentGuardianFileId || undefined,
  };
}

function khsUploadToPublic(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    semesterNumber: row.semester_number,
    fileId: row.file_id || undefined,
    uploadedAt: row.uploaded_at,
  };
}

function commitmentStatementToPublic(row) {
  return {
    participantId: row.participant_id,
    participantStmtFileId: row.participant_stmt_file_id || undefined,
    guardianStmtFileId: row.guardian_stmt_file_id || undefined,
  };
}

function monthlyReportToPublic(row) {
  return {
    id: row.id,
    participantId: row.participant_id,
    description: row.description || undefined,
    reportDate: row.report_date,
    fileId: row.file_id || undefined,
    createdAt: row.created_at,
  };
}

module.exports = {
  profileToPublic,
  reimbursementToPublic,
  reportToPublic,
  accountToPublic,
  transferProofToPublic,
  fundSourceToPublic,
  fullSemesterReportToPublic,
  khsUploadToPublic,
  commitmentStatementToPublic,
  monthlyReportToPublic,
};
