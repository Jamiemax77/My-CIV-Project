const express = require('express');
const { pool } = require('../db');
const { makeId } = require('../lib/id');
const { hashPin } = require('../lib/password');
const { ApiError, asyncHandler } = require('../lib/errors');
const {
  profileToPublic,
  reimbursementToPublic,
  reportToPublic,
  accountToPublic,
  fundSourceToPublic,
  fullSemesterReportToPublic,
  monthlyReportToPublic,
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
    res.json({ ok: true, data: { ok: true } });
  })
);

router.patch(
  '/participants/:id/reset-pin',
  asyncHandler(async (req, res) => {
    const pinHash = await hashPin(DEFAULT_PIN);
    const [result] = await pool.query(
      "UPDATE profiles SET pin_hash = ?, must_change_pin = TRUE, failed_attempts = 0, locked_until = NULL WHERE id = ? AND role = 'participant'",
      [pinHash, req.params.id]
    );
    if (result.affectedRows === 0) throw new ApiError('Partisipan tidak ditemukan.', 404);
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
    const [transfers] = await pool.query('SELECT participant_id, amount FROM transfer_proofs');

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
    const [rows] = await pool.query(
      "SELECT * FROM disbursements WHERE participant_id = ? AND status != 'draft' ORDER BY created_at DESC",
      [req.params.id]
    );
    res.json({
      ok: true,
      data: rows.map((d) => ({
        id: d.id,
        title: d.title,
        amount: Number(d.amount),
        disbursedAt: d.disbursed_at,
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

router.post(
  '/disbursements',
  asyncHandler(async (req, res) => {
    const { participantId, title, amount, period, disbursedAt, note, status } = req.body;
    if (!participantId || !title || !(amount > 0)) throw new ApiError('Data pencairan tidak lengkap.');
    const id = makeId('d');
    await pool.query(
      `INSERT INTO disbursements (id, participant_id, title, amount, period, disbursed_at, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, participantId, title, amount, period || null, disbursedAt || new Date(), note || null, status || 'disbursed']
    );
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
    const [result] = await pool.query(
      'UPDATE reimbursements SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [status, req.session.profileId, req.params.id]
    );
    if (result.affectedRows === 0) throw new ApiError('Data tidak ditemukan.', 404);
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
    const [result] = await pool.query(
      'UPDATE reports SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [status, req.session.profileId, req.params.id]
    );
    if (result.affectedRows === 0) throw new ApiError('Data tidak ditemukan.', 404);
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
    if (reportIds.length > 0) {
      const [counts] = await pool.query(
        'SELECT report_id, COUNT(*) AS cnt FROM report_activity_links WHERE report_id IN (?) GROUP BY report_id',
        [reportIds]
      );
      counts.forEach((c) => {
        activityCounts[c.report_id] = c.cnt;
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

router.post(
  '/full-semester-reports/:id/review',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (status !== 'verified' && status !== 'revision') throw new ApiError('Status tidak valid.');
    const [result] = await pool.query(
      'UPDATE full_semester_reports SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [status, req.session.profileId, req.params.id]
    );
    if (result.affectedRows === 0) throw new ApiError('Data tidak ditemukan.', 404);
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
      senderBank,
      destAccount,
      transferredAt,
      referenceNo,
      proofFileId,
      proofFileName,
    } = req.body;
    if (!participantId || !disbursementId || !(amount > 0) || !senderBank || !destAccount || !referenceNo) {
      throw new ApiError('Data bukti transfer tidak lengkap.');
    }
    const id = makeId('tp');
    await pool.query(
      `INSERT INTO transfer_proofs
        (id, participant_id, disbursement_id, amount, sender_bank, dest_account, transferred_at, reference_no, proof_path, proof_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        participantId,
        disbursementId,
        amount,
        senderBank,
        destAccount,
        transferredAt || new Date(),
        referenceNo,
        proofFileId || null,
        proofFileName || null,
      ]
    );
    res.status(201).json({ ok: true, data: { id } });
  })
);

module.exports = router;
