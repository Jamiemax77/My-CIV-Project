const express = require('express');
const { pool } = require('../db');
const { makeId } = require('../lib/id');
const { hashPin } = require('../lib/password');
const { ApiError, asyncHandler } = require('../lib/errors');
const { notifyProfile } = require('../lib/notify');
const {
  profileToPublic,
  reimbursementToPublic,
  reportToPublic,
  accountToPublic,
  fundSourceToPublic,
  fullSemesterReportToPublic,
  budgetItemToPublic,
  monthlyReportToPublic,
  pinResetRequestToPublic,
  khsUploadToPublic,
} = require('../lib/serialize');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const SCHOLARSHIP_TYPES = ['CIV P153', 'CIV Edu', 'BDP Support PPA', 'Lainnya'];
const DEFAULT_PIN = '000000';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.patch(
  '/profile',
  asyncHandler(async (req, res) => {
    const { fullName, idNumber, email, phone, photoFileId } = req.body;
    if (!fullName || !idNumber || !email) {
      throw new ApiError('Nama, ID Staf, dan email wajib diisi.');
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) throw new ApiError('Email tidak valid.');

    try {
      await pool.query(
        `UPDATE profiles
         SET full_name = ?, id_number = ?, email = ?, phone = ?, photo_path = COALESCE(?, photo_path)
         WHERE id = ?`,
        [
          fullName.trim(),
          idNumber.trim(),
          normalizedEmail,
          phone || null,
          photoFileId || null,
          req.session.profileId,
        ]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw new ApiError('Email atau ID Staf sudah digunakan.');
      throw err;
    }

    const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ? LIMIT 1', [
      req.session.profileId,
    ]);
    res.json({ ok: true, data: { profile: profileToPublic(rows[0]) } });
  })
);

router.get(
  '/participants',
  asyncHandler(async (req, res) => {
    const [profiles] = await pool.query("SELECT * FROM profiles WHERE role = 'participant'");
    const [disbursements] = await pool.query("SELECT * FROM disbursements WHERE status != 'draft'");
    const [reimbursements] = await pool.query(
      "SELECT participant_id, amount FROM reimbursements WHERE status = 'approved'"
    );
    const [reports] = await pool.query('SELECT DISTINCT participant_id FROM reports');
    const reportedIds = new Set(reports.map((r) => r.participant_id));

    const data = profiles.map((profile) => {
      const total = disbursements
        .filter((d) => d.participant_id === profile.id)
        .reduce((sum, d) => sum + Number(d.amount), 0);
      const used = reimbursements
        .filter((r) => r.participant_id === profile.id)
        .reduce((sum, r) => sum + Number(r.amount), 0);
      return {
        profile: profileToPublic(profile),
        remaining: total - used,
        status: reportedIds.has(profile.id) ? 'aktif' : 'belum_lapor',
      };
    });

    res.json({ ok: true, data });
  })
);

router.post(
  '/participants',
  asyncHandler(async (req, res) => {
    const {
      fullName,
      idNumber,
      nim,
      email,
      phone,
      gender,
      university,
      major,
      semester,
      scholarshipType,
    } = req.body;
    if (!fullName || !idNumber || !email) {
      throw new ApiError('Nama, Nomor ID, dan email wajib diisi.');
    }
    if (scholarshipType && !SCHOLARSHIP_TYPES.includes(scholarshipType)) {
      throw new ApiError('Jenis bantuan tidak valid.');
    }

    const id = makeId('p');
    const pinHash = await hashPin(DEFAULT_PIN);

    try {
      await pool.query(
        `INSERT INTO profiles
          (id, role, full_name, id_number, nim, email, phone, gender, university, major, semester, scholarship_type, pin_hash, must_change_pin)
         VALUES (?, 'participant', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          id,
          fullName,
          idNumber,
          nim || null,
          email,
          phone || null,
          gender || null,
          university || null,
          major || null,
          semester || null,
          scholarshipType || null,
          pinHash,
        ]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ApiError('Email atau Nomor ID sudah terdaftar.');
      }
      throw err;
    }

    res.status(201).json({ ok: true, data: { id } });
  })
);

router.patch(
  '/participants/:id/scholarship-type',
  asyncHandler(async (req, res) => {
    const { scholarshipType } = req.body;
    if (!SCHOLARSHIP_TYPES.includes(scholarshipType)) {
      throw new ApiError('Jenis bantuan tidak valid.');
    }
    const [result] = await pool.query(
      "UPDATE profiles SET scholarship_type = ? WHERE id = ? AND role = 'participant'",
      [scholarshipType, req.params.id]
    );
    if (result.affectedRows === 0) throw new ApiError('Partisipan tidak ditemukan.', 404);

    await notifyProfile(req.params.id, {
      type: 'scholarship_type_updated',
      title: 'Jenis bantuan beasiswa diperbarui',
      body: `Jenis bantuan Anda diatur admin menjadi "${scholarshipType}".`,
      data: { scholarshipType },
    });

    res.json({ ok: true, data: { ok: true } });
  })
);

router.get(
  '/participants/:id/pin-reset-requests',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT * FROM pin_reset_requests WHERE participant_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ ok: true, data: rows.map(pinResetRequestToPublic) });
  })
);

// The "Reset PIN ke Default" button on ParticipantDetailScreen only activates once a
// 'pending' row exists here — admin reviews the 3 submitted selfies, then approves
// (which resets the PIN, same as the old unconditional endpoint used to) or rejects.
router.post(
  '/pin-reset-requests/:id/review',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (status !== 'approved' && status !== 'rejected') throw new ApiError('Status tidak valid.');

    const [rows] = await pool.query(
      "SELECT * FROM pin_reset_requests WHERE id = ? AND status = 'pending' LIMIT 1",
      [req.params.id]
    );
    const request = rows[0];
    if (!request) throw new ApiError('Permintaan tidak ditemukan atau sudah diproses.', 404);

    if (status === 'approved') {
      const pinHash = await hashPin(DEFAULT_PIN);
      await pool.query(
        "UPDATE profiles SET pin_hash = ?, must_change_pin = TRUE, failed_attempts = 0, locked_until = NULL WHERE id = ?",
        [pinHash, request.participant_id]
      );
    }

    await pool.query(
      'UPDATE pin_reset_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [status, req.session.profileId, req.params.id]
    );

    await notifyProfile(
      request.participant_id,
      status === 'approved'
        ? {
            type: 'pin_reset_reviewed',
            title: 'PIN Anda telah direset',
            body: 'PIN Anda direset ke PIN default. Login lalu buat PIN baru.',
            data: { requestId: req.params.id, status },
          }
        : {
            type: 'pin_reset_reviewed',
            title: 'Permintaan reset PIN ditolak',
            body: 'Admin menolak permintaan reset PIN Anda. Hubungi admin untuk info lebih lanjut.',
            data: { requestId: req.params.id, status },
          },
      { push: true }
    );

    res.json({ ok: true, data: { ok: true } });
  })
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const [[{ totalDisbursed }]] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS totalDisbursed FROM disbursements WHERE status != 'draft'"
    );
    const [[{ totalParticipants }]] = await pool.query(
      "SELECT COUNT(*) AS totalParticipants FROM profiles WHERE role = 'participant'"
    );
    const [[{ activeParticipants }]] = await pool.query(
      `SELECT COUNT(DISTINCT participant_id) AS activeParticipants
       FROM reports r
       JOIN profiles p ON p.id = r.participant_id
       WHERE p.role = 'participant'`
    );
    res.json({
      ok: true,
      data: {
        totalDisbursed: Number(totalDisbursed),
        totalParticipants: Number(totalParticipants),
        activeParticipants: Number(activeParticipants),
      },
    });
  })
);

router.get(
  '/fund-sources',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM fund_sources ORDER BY created_at DESC');
    res.json({ ok: true, data: rows.map(fundSourceToPublic) });
  })
);

router.post(
  '/fund-sources',
  asyncHandler(async (req, res) => {
    const { scholarshipType, interventionId, fundName, description, amount } = req.body;
    if (!scholarshipType || !SCHOLARSHIP_TYPES.includes(scholarshipType)) {
      throw new ApiError('Jenis dana tidak valid.');
    }
    if (!(amount > 0)) throw new ApiError('Jumlah dana harus lebih dari 0.');

    const id = makeId('fs');
    await pool.query(
      `INSERT INTO fund_sources
        (id, scholarship_type, intervention_id, fund_name, description, amount, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        scholarshipType,
        interventionId || null,
        fundName || null,
        description || null,
        amount,
        req.session.profileId,
      ]
    );
    res.status(201).json({ ok: true, data: { id } });
  })
);

router.get(
  '/fund-summary',
  asyncHandler(async (req, res) => {
    const [sources] = await pool.query('SELECT * FROM fund_sources ORDER BY created_at DESC');
    const [profiles] = await pool.query("SELECT * FROM profiles WHERE role = 'participant'");
    const [disbursements] = await pool.query("SELECT * FROM disbursements WHERE status != 'draft'");
    // Only transfers tied to a real scholarship disbursement count toward "received" —
    // "Transaksi Lainnya" transfers (disbursement_id IS NULL) are miscellaneous non-scholarship
    // payments (e.g. activity transport/consumption) and must not inflate these fund totals.
    const [transfers] = await pool.query(
      'SELECT participant_id, amount FROM transfer_proofs WHERE disbursement_id IS NOT NULL'
    );

    const participants = profiles.map((profile) => {
      const total = disbursements
        .filter((d) => d.participant_id === profile.id)
        .reduce((sum, d) => sum + Number(d.amount), 0);
      const received = transfers
        .filter((t) => t.participant_id === profile.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return {
        participantId: profile.id,
        fullName: profile.full_name,
        idNumber: profile.id_number,
        total,
        received,
        remaining: total - received,
      };
    });

    const totalSources = sources.reduce((sum, s) => sum + Number(s.amount), 0);
    const totalReceived = participants.reduce((sum, p) => sum + p.received, 0);

    res.json({
      ok: true,
      data: {
        sources: sources.map(fundSourceToPublic),
        participants,
        totals: {
          sources: totalSources,
          received: totalReceived,
          remaining: totalSources - totalReceived,
        },
      },
    });
  })
);

router.get(
  '/participants/:id/disbursements',
  asyncHandler(async (req, res) => {
    // Default: disbursement history (draft excluded). `?needsProof=1`: candidates for the
    // "attach bukti transfer" step — anything not yet sent and without a linked proof,
    // drafts included since sending a proof for one also finalizes it.
    const needsProof = req.query.needsProof === '1';
    const sql = needsProof
      ? `SELECT d.*, tp.id AS transfer_proof_id FROM disbursements d
         LEFT JOIN transfer_proofs tp ON tp.disbursement_id = d.id
         WHERE d.participant_id = ? AND d.status != 'sent' AND tp.id IS NULL
         ORDER BY d.created_at DESC`
      : `SELECT d.*, tp.id AS transfer_proof_id FROM disbursements d
         LEFT JOIN transfer_proofs tp ON tp.disbursement_id = d.id
         WHERE d.participant_id = ? AND d.status != 'draft'
         ORDER BY d.created_at DESC`;
    const [rows] = await pool.query(sql, [req.params.id]);
    res.json({
      ok: true,
      data: rows.map((d) => ({
        id: d.id,
        title: d.title,
        program: d.program || undefined,
        period: d.period || undefined,
        amount: Number(d.amount),
        disbursedAt: d.disbursed_at,
        note: d.note || undefined,
        status: d.status,
        hasProof: !!d.transfer_proof_id,
      })),
    });
  })
);

router.get(
  '/participants/:id/accounts',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM accounts WHERE participant_id = ?', [
      req.params.id,
    ]);
    res.json({ ok: true, data: rows.map(accountToPublic) });
  })
);

router.get(
  '/participants/:id/monthly-reports',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT * FROM monthly_reports WHERE participant_id = ? ORDER BY report_date DESC, created_at DESC',
      [req.params.id]
    );
    res.json({ ok: true, data: rows.map(monthlyReportToPublic) });
  })
);

// Full history (all semesters) for one participant — used by the admin's combined "Laporan
// Semester Lengkap" PDF for the IPS/IPK table + chart, distinct from GET /full-semester-reports
// which is the flat cross-participant list for the Verifikasi screen.
router.get(
  '/participants/:id/full-semester-reports',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT * FROM full_semester_reports WHERE participant_id = ? AND status != 'draft' ORDER BY semester_number ASC",
      [req.params.id]
    );
    res.json({ ok: true, data: rows.map(fullSemesterReportToPublic) });
  })
);

// All KHS/KRS uploads (every semester) for one participant — used by the same combined PDF.
router.get(
  '/participants/:id/khs',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT * FROM khs_uploads WHERE participant_id = ? ORDER BY semester_number ASC',
      [req.params.id]
    );
    res.json({ ok: true, data: rows.map(khsUploadToPublic) });
  })
);

router.post(
  '/disbursements',
  asyncHandler(async (req, res) => {
    const { participantId, title, program, amount, period, disbursedAt, note, status } = req.body;
    if (!participantId || !title || !(amount > 0)) throw new ApiError('Data pencairan tidak lengkap.');
    const id = makeId('d');
    await pool.query(
      `INSERT INTO disbursements (id, participant_id, title, program, amount, period, disbursed_at, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        participantId,
        title,
        program || null,
        amount,
        period || null,
        disbursedAt || new Date(),
        note || null,
        status || 'disbursed',
      ]
    );

    if ((status || 'disbursed') !== 'draft') {
      await notifyProfile(participantId, {
        type: 'disbursement_created',
        title: 'Dana beasiswa dicairkan',
        body: `Pencairan "${title}" sebesar ${Number(amount).toLocaleString('id-ID')} telah dicatat.`,
        data: { disbursementId: id },
      });
    }

    res.status(201).json({ ok: true, data: { id } });
  })
);

router.get(
  '/reimbursements',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT r.*, p.full_name AS participant_full_name, p.id_number AS participant_id_number
       FROM reimbursements r
       JOIN profiles p ON p.id = r.participant_id
       ORDER BY r.created_at DESC`
    );
    res.json({ ok: true, data: rows.map(reimbursementToPublic) });
  })
);

router.post(
  '/reimbursements/:id/review',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (status !== 'approved' && status !== 'rejected') throw new ApiError('Status tidak valid.');
    const [rows] = await pool.query('SELECT * FROM reimbursements WHERE id = ? LIMIT 1', [
      req.params.id,
    ]);
    const reimbursement = rows[0];
    if (!reimbursement) throw new ApiError('Data tidak ditemukan.', 404);

    await pool.query(
      'UPDATE reimbursements SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [status, req.session.profileId, req.params.id]
    );

    await notifyProfile(reimbursement.participant_id, {
      type: 'reimbursement_reviewed',
      title: status === 'approved' ? 'Pengembalian dana disetujui' : 'Pengembalian dana ditolak',
      body:
        status === 'approved'
          ? 'Pengajuan pengembalian dana Anda disetujui admin.'
          : 'Pengajuan pengembalian dana Anda ditolak admin.',
      data: { reimbursementId: req.params.id, status },
    });

    res.json({ ok: true, data: { ok: true } });
  })
);

router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT r.*, p.full_name AS participant_full_name, p.id_number AS participant_id_number,
              p.semester AS participant_semester
       FROM reports r
       JOIN profiles p ON p.id = r.participant_id
       ORDER BY r.created_at DESC`
    );
    res.json({ ok: true, data: rows.map(reportToPublic) });
  })
);

router.post(
  '/reports/:id/review',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (status !== 'verified' && status !== 'revision') throw new ApiError('Status tidak valid.');
    const [rows] = await pool.query('SELECT * FROM reports WHERE id = ? LIMIT 1', [req.params.id]);
    const report = rows[0];
    if (!report) throw new ApiError('Data tidak ditemukan.', 404);

    await pool.query(
      'UPDATE reports SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [status, req.session.profileId, req.params.id]
    );

    await notifyProfile(report.participant_id, {
      type: 'report_reviewed',
      title: status === 'verified' ? 'Laporan nilai diverifikasi' : 'Laporan nilai perlu revisi',
      body:
        status === 'verified'
          ? 'Laporan nilai Anda telah diverifikasi admin.'
          : 'Laporan nilai Anda perlu direvisi. Cek catatan admin.',
      data: { reportId: req.params.id, status },
    });

    res.json({ ok: true, data: { ok: true } });
  })
);

router.get(
  '/full-semester-reports',
  asyncHandler(async (req, res) => {
    const [reports] = await pool.query(
      `SELECT r.*, p.full_name AS participant_full_name, p.id_number AS participant_id_number
       FROM full_semester_reports r
       JOIN profiles p ON p.id = r.participant_id
       WHERE r.status != 'draft'
       ORDER BY r.created_at DESC`
    );
    const [commitments] = await pool.query('SELECT * FROM commitment_statements');
    const commitmentByParticipant = new Map(commitments.map((c) => [c.participant_id, c]));
    const [khsRows] = await pool.query(
      'SELECT participant_id, semester_number, file_id FROM khs_uploads'
    );
    const khsFileByKey = new Map(
      khsRows.map((k) => [`${k.participant_id}:${k.semester_number}`, k.file_id])
    );

    const reportIds = reports.map((r) => r.id);
    const activityCounts = {};
    const budgetItemCounts = {};
    if (reportIds.length > 0) {
      const [counts] = await pool.query(
        'SELECT report_id, COUNT(*) AS cnt FROM report_activity_links WHERE report_id IN (?) GROUP BY report_id',
        [reportIds]
      );
      counts.forEach((c) => {
        activityCounts[c.report_id] = c.cnt;
      });
      const [budgetCounts] = await pool.query(
        'SELECT report_id, COUNT(*) AS cnt FROM full_semester_report_budget_items WHERE report_id IN (?) GROUP BY report_id',
        [reportIds]
      );
      budgetCounts.forEach((c) => {
        budgetItemCounts[c.report_id] = c.cnt;
      });
    }

    const data = reports.map((r) => {
      const commitment = commitmentByParticipant.get(r.participant_id);
      const commitmentDone = !!(
        commitment &&
        commitment.participant_stmt_file_id &&
        commitment.guardian_stmt_file_id
      );
      const activityCount = activityCounts[r.id] || 0;
      const khsFileId = khsFileByKey.get(`${r.participant_id}:${r.semester_number}`);
      return fullSemesterReportToPublic({
        ...r,
        activityCount,
        khsFileId,
        commitmentParticipantFileId: commitment ? commitment.participant_stmt_file_id : undefined,
        commitmentGuardianFileId: commitment ? commitment.guardian_stmt_file_id : undefined,
        checklist: {
          commitment: commitmentDone,
          khs: !!khsFileId,
          activities: activityCount >= 5,
          budget: (budgetItemCounts[r.id] || 0) > 0,
        },
      });
    });

    res.json({ ok: true, data });
  })
);

router.get(
  '/full-semester-reports/:id/activities',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT mr.*
       FROM report_activity_links ral
       JOIN monthly_reports mr ON mr.id = ral.monthly_report_id
       WHERE ral.report_id = ?
       ORDER BY mr.report_date DESC`,
      [req.params.id]
    );
    res.json({ ok: true, data: rows.map(monthlyReportToPublic) });
  })
);

// Itemized "Rincian Penggunaan Dana" behind a report's total_amount — used both by the admin
// detail screen (review) and the "Cetak Laporan" combined PDF.
router.get(
  '/full-semester-reports/:id/budget-items',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT * FROM full_semester_report_budget_items WHERE report_id = ? ORDER BY sort_order ASC, created_at ASC',
      [req.params.id]
    );
    res.json({ ok: true, data: rows.map(budgetItemToPublic) });
  })
);

router.post(
  '/full-semester-reports/:id/review',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (status !== 'verified' && status !== 'revision') throw new ApiError('Status tidak valid.');
    const [rows] = await pool.query('SELECT * FROM full_semester_reports WHERE id = ? LIMIT 1', [
      req.params.id,
    ]);
    const report = rows[0];
    if (!report) throw new ApiError('Data tidak ditemukan.', 404);

    await pool.query(
      'UPDATE full_semester_reports SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [status, req.session.profileId, req.params.id]
    );

    await notifyProfile(report.participant_id, {
      type: 'full_semester_report_reviewed',
      title:
        status === 'verified' ? 'Laporan Semester Lengkap diverifikasi' : 'Laporan Semester Lengkap perlu revisi',
      body:
        status === 'verified'
          ? 'Laporan Semester Lengkap Anda telah diverifikasi admin.'
          : 'Laporan Semester Lengkap Anda perlu direvisi. Cek catatan admin.',
      data: { reportId: req.params.id, status },
    });

    res.json({ ok: true, data: { ok: true } });
  })
);

router.post(
  '/transfer-proofs',
  asyncHandler(async (req, res) => {
    const {
      participantId,
      disbursementId,
      amount,
      method,
      senderBank,
      destAccount,
      transferredAt,
      referenceNo,
      note,
      proofFileId,
      proofFileName,
    } = req.body;
    if (!participantId || !(amount > 0) || !senderBank || !destAccount || !referenceNo) {
      throw new ApiError('Data bukti transfer tidak lengkap.');
    }
    if (method && method !== 'transfer' && method !== 'tunai') {
      throw new ApiError('Metode pembayaran tidak valid.');
    }
    // Either tied to a real scholarship disbursement, or — for miscellaneous payments
    // (transport/consumption for a training activity, Youth Cluster, etc.) that must NOT be
    // counted as scholarship funds disbursed — a plain note describing what it's for.
    if (!disbursementId && !(note && note.trim())) {
      throw new ApiError('Pilih pencairan, atau isi keterangan untuk transaksi lainnya.');
    }
    const id = makeId('tp');
    await pool.query(
      `INSERT INTO transfer_proofs
        (id, participant_id, disbursement_id, amount, method, sender_bank, dest_account, transferred_at, reference_no, note, proof_path, proof_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        participantId,
        disbursementId || null,
        amount,
        method || 'transfer',
        senderBank,
        destAccount,
        transferredAt || new Date(),
        referenceNo,
        note ? note.trim() : null,
        proofFileId || null,
        proofFileName || null,
      ]
    );

    if (disbursementId) {
      await pool.query("UPDATE disbursements SET status = 'sent' WHERE id = ?", [disbursementId]);
    }

    await notifyProfile(participantId, {
      type: 'transfer_proof_created',
      title: 'Bukti transfer diterima',
      body: `Transfer sebesar ${Number(amount).toLocaleString('id-ID')} telah dicatat admin.`,
      data: { transferProofId: id },
    });

    res.status(201).json({ ok: true, data: { id } });
  })
);

module.exports = router;
