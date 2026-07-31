const express = require('express');
const { pool } = require('../db');
const { makeId } = require('../lib/id');
const { hashPin, verifyPin } = require('../lib/password');
const { ApiError, asyncHandler } = require('../lib/errors');
const { notifyAdmins } = require('../lib/notify');
const {
  profileToPublic,
  reimbursementToPublic,
  reportToPublic,
  accountToPublic,
  transferProofToPublic,
  fullSemesterReportToPublic,
  budgetItemToPublic,
  khsUploadToPublic,
  commitmentStatementToPublic,
  monthlyReportToPublic,
} = require('../lib/serialize');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('participant'));

// Defense-in-depth: the app UI already forces a PIN change before showing any other
// screen (see RootNavigator's mustChangePin branch), but that's client-side only —
// this blocks every other participant route server-side too, so a client that skips
// the UI gate (or a modified/rogue client) can't ride the still-default 000000 PIN
// into the rest of the API. /pin itself must stay reachable so the change can happen.
router.use(
  asyncHandler(async (req, res, next) => {
    if (req.path === '/pin') return next();
    const [rows] = await pool.query('SELECT must_change_pin FROM profiles WHERE id = ? LIMIT 1', [
      req.session.profileId,
    ]);
    if (rows[0] && rows[0].must_change_pin) {
      throw new ApiError('Anda wajib mengganti PIN default sebelum melanjutkan.', 403);
    }
    next();
  })
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.patch(
  '/profile',
  asyncHandler(async (req, res) => {
    // Nomor ID (id_number) is deliberately not accepted here — it's admin-assigned and
    // doubles as the login identifier, so participants can edit everything else about
    // their own profile except that.
    const {
      fullName,
      email,
      phone,
      gender,
      semester,
      targetIpk,
      targetGraduationDate,
      ppaCompletionDate,
      photoFileId,
    } = req.body;
    if (!fullName || !fullName.trim()) throw new ApiError('Nama wajib diisi.');
    if (!email) throw new ApiError('Email wajib diisi.');
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) throw new ApiError('Email tidak valid.');
    if (gender !== undefined && gender !== null && gender !== '' && gender !== 'L' && gender !== 'P') {
      throw new ApiError('Jenis kelamin tidak valid.');
    }
    let semesterNum = null;
    if (semester !== undefined && semester !== null && semester !== '') {
      semesterNum = Number(semester);
      if (!Number.isInteger(semesterNum) || semesterNum < 1 || semesterNum > 14) {
        throw new ApiError('Semester tidak valid.');
      }
    }
    let targetIpkNum = null;
    if (targetIpk !== undefined && targetIpk !== null && targetIpk !== '') {
      targetIpkNum = Number(targetIpk);
      if (!(targetIpkNum > 0 && targetIpkNum <= 4)) {
        throw new ApiError('Target IPK harus di antara 0 dan 4.');
      }
    }

    try {
      await pool.query(
        `UPDATE profiles
         SET full_name = ?, email = ?, phone = ?, gender = ?, semester = ?, target_ipk = ?,
             target_graduation_date = ?, ppa_completion_date = ?, photo_path = COALESCE(?, photo_path)
         WHERE id = ?`,
        [
          fullName.trim(),
          normalizedEmail,
          phone || null,
          gender || null,
          semesterNum,
          targetIpkNum,
          targetGraduationDate || null,
          ppaCompletionDate || null,
          photoFileId || null,
          req.session.profileId,
        ]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw new ApiError('Email sudah digunakan akun lain.');
      throw err;
    }

    const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ? LIMIT 1', [
      req.session.profileId,
    ]);
    res.json({ ok: true, data: { profile: profileToPublic(rows[0]) } });
  })
);

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const participantId = req.session.profileId;

    const [disbursements] = await pool.query(
      "SELECT * FROM disbursements WHERE participant_id = ? AND status != 'draft'",
      [participantId]
    );
    const [reimbursements] = await pool.query(
      'SELECT amount, status FROM reimbursements WHERE participant_id = ?',
      [participantId]
    );
    const [transferProofs] = await pool.query(
      'SELECT id, disbursement_id FROM transfer_proofs WHERE participant_id = ?',
      [participantId]
    );

    const total = disbursements.reduce((sum, d) => sum + Number(d.amount), 0);
    const used = reimbursements
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    res.json({
      ok: true,
      data: {
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
      },
    });
  })
);

router.patch(
  '/pin',
  asyncHandler(async (req, res) => {
    const { currentPin, newPin } = req.body;
    if (!currentPin || !newPin) throw new ApiError('PIN saat ini dan PIN baru wajib diisi.');
    if (!/^\d{6}$/.test(newPin)) throw new ApiError('PIN baru harus 6 digit angka.');
    if (newPin === '000000') throw new ApiError('PIN baru tidak boleh 000000.');

    const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ? LIMIT 1', [
      req.session.profileId,
    ]);
    const profile = rows[0];
    if (!profile) throw new ApiError('Profil tidak ditemukan.', 404);

    const valid = await verifyPin(currentPin, profile.pin_hash);
    if (!valid) throw new ApiError('PIN saat ini salah.', 401);

    const pinHash = await hashPin(newPin);
    await pool.query(
      'UPDATE profiles SET pin_hash = ?, must_change_pin = FALSE WHERE id = ?',
      [pinHash, req.session.profileId]
    );
    res.json({ ok: true, data: { ok: true } });
  })
);

router.patch(
  '/nim',
  asyncHandler(async (req, res) => {
    const { nim } = req.body;
    if (!nim || !nim.trim()) throw new ApiError('NIM wajib diisi.');
    await pool.query('UPDATE profiles SET nim = ? WHERE id = ?', [
      nim.trim(),
      req.session.profileId,
    ]);
    res.json({ ok: true, data: { ok: true } });
  })
);

router.patch(
  '/academic',
  asyncHandler(async (req, res) => {
    const { major, university } = req.body;
    if (!major || !major.trim()) throw new ApiError('Jurusan wajib diisi.');
    if (!university || !university.trim()) throw new ApiError('Universitas wajib diisi.');

    await pool.query('UPDATE profiles SET major = ?, university = ? WHERE id = ?', [
      major.trim(),
      university.trim(),
      req.session.profileId,
    ]);

    const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ? LIMIT 1', [
      req.session.profileId,
    ]);
    res.json({ ok: true, data: { profile: profileToPublic(rows[0]) } });
  })
);

router.get(
  '/reimbursements',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT * FROM reimbursements WHERE participant_id = ? ORDER BY created_at DESC',
      [req.session.profileId]
    );
    res.json({ ok: true, data: rows.map(reimbursementToPublic) });
  })
);

router.post(
  '/reimbursements',
  asyncHandler(async (req, res) => {
    const {
      type,
      category,
      amount,
      description,
      nomorPengajuan,
      proofFileId,
      proofFileName,
      usageProofFileId,
      usageProofFileName,
    } = req.body;
    if (
      !type ||
      !category ||
      !(amount > 0) ||
      !description ||
      !proofFileId ||
      !usageProofFileId
    ) {
      throw new ApiError('Data pengajuan tidak lengkap.');
    }
    const id = makeId('r');
    await pool.query(
      `INSERT INTO reimbursements
        (id, nomor_pengajuan, participant_id, type, category, amount, description,
         proof_path, proof_name, usage_proof_path, usage_proof_name, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        id,
        nomorPengajuan || null,
        req.session.profileId,
        type,
        category,
        amount,
        description,
        proofFileId,
        proofFileName || null,
        usageProofFileId,
        usageProofFileName || null,
      ]
    );

    const [profileRows] = await pool.query('SELECT full_name FROM profiles WHERE id = ? LIMIT 1', [
      req.session.profileId,
    ]);
    await notifyAdmins({
      type: 'reimbursement_submitted',
      title: 'Pengajuan pengembalian dana baru',
      body: `${profileRows[0].full_name} mengajukan pengembalian dana yang perlu ditinjau.`,
      data: { reimbursementId: id, participantId: req.session.profileId },
    });

    res.status(201).json({ ok: true, data: { id } });
  })
);

router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT * FROM reports WHERE participant_id = ? ORDER BY created_at DESC',
      [req.session.profileId]
    );
    res.json({ ok: true, data: rows.map(reportToPublic) });
  })
);

router.post(
  '/reports',
  asyncHandler(async (req, res) => {
    const { semester, gpa, fileId, fileName } = req.body;
    if (!semester || !(gpa > 0 && gpa <= 4)) throw new ApiError('Data laporan tidak lengkap.');
    const id = makeId('rep');
    await pool.query(
      `INSERT INTO reports (id, participant_id, semester, gpa, file_path, file_name, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [id, req.session.profileId, semester, gpa, fileId || null, fileName || null]
    );

    const [profileRows] = await pool.query('SELECT full_name FROM profiles WHERE id = ? LIMIT 1', [
      req.session.profileId,
    ]);
    await notifyAdmins({
      type: 'report_submitted',
      title: 'Laporan nilai baru',
      body: `${profileRows[0].full_name} mengirim laporan nilai yang perlu ditinjau.`,
      data: { reportId: id, participantId: req.session.profileId },
    });

    res.status(201).json({ ok: true, data: { id } });
  })
);

router.get(
  '/full-semester-reports',
  asyncHandler(async (req, res) => {
    const participantId = req.session.profileId;
    const [reports] = await pool.query(
      'SELECT * FROM full_semester_reports WHERE participant_id = ? ORDER BY semester_number ASC',
      [participantId]
    );
    const [commitmentRows] = await pool.query(
      'SELECT * FROM commitment_statements WHERE participant_id = ? LIMIT 1',
      [participantId]
    );
    const [khsRows] = await pool.query(
      'SELECT semester_number FROM khs_uploads WHERE participant_id = ?',
      [participantId]
    );
    const khsSemesters = new Set(khsRows.map((k) => k.semester_number));
    const commitment = commitmentRows[0];
    const commitmentDone = !!(
      commitment &&
      commitment.participant_stmt_file_id &&
      commitment.guardian_stmt_file_id
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
      const activityCount = activityCounts[r.id] || 0;
      return fullSemesterReportToPublic({
        ...r,
        activityCount,
        checklist: {
          commitment: commitmentDone,
          khs: khsSemesters.has(r.semester_number),
          activities: activityCount >= 5,
          budget: (budgetItemCounts[r.id] || 0) > 0,
        },
      });
    });

    res.json({ ok: true, data });
  })
);

router.post(
  '/full-semester-reports',
  asyncHandler(async (req, res) => {
    // total_amount is deliberately not accepted here anymore — it's derived from the
    // "Rincian Penggunaan Dana" budget items (see the /budget-items routes below) minus
    // kontribusi_ortu, recomputed whenever a line item or the kontribusi changes.
    const { semesterNumber, year, sks, ips, ipk, coverLetter } = req.body;
    const semNum = Number(semesterNumber);
    if (!semNum || semNum < 1) throw new ApiError('Nomor semester tidak valid.');
    if (!coverLetter || !coverLetter.trim()) throw new ApiError('Kata pengantar wajib diisi.');
    if (coverLetter.length > 200) throw new ApiError('Kata pengantar maksimal 200 karakter.');
    if (!(sks > 0)) throw new ApiError('SKS wajib diisi.');
    if (!(ips > 0 && ips <= 4)) throw new ApiError('IPS harus di antara 0 dan 4.');
    if (!(ipk > 0 && ipk <= 4)) throw new ApiError('IPK harus di antara 0 dan 4.');

    const participantId = req.session.profileId;
    const [profileRows] = await pool.query('SELECT full_name FROM profiles WHERE id = ? LIMIT 1', [
      participantId,
    ]);
    const fullName = profileRows[0] ? profileRows[0].full_name : '';
    const fileName = `LS-${semNum}-${fullName}`;

    const [existingRows] = await pool.query(
      'SELECT * FROM full_semester_reports WHERE participant_id = ? AND semester_number = ? LIMIT 1',
      [participantId, semNum]
    );
    const existing = existingRows[0];
    if (existing && existing.status !== 'revision' && existing.status !== 'draft') {
      throw new ApiError('Laporan semester ini sudah dikirim dan tidak dapat diubah.');
    }

    if (existing) {
      await pool.query(
        `UPDATE full_semester_reports
         SET year = ?, sks = ?, ips = ?, ipk = ?, cover_letter = ?, file_name = ?,
             status = 'draft', reviewed_by = NULL, reviewed_at = NULL
         WHERE id = ?`,
        [year || null, sks, ips, ipk, coverLetter.trim(), fileName, existing.id]
      );
      res.json({ ok: true, data: { id: existing.id } });
    } else {
      const id = makeId('fsr');
      await pool.query(
        `INSERT INTO full_semester_reports
          (id, participant_id, semester_number, year, sks, ips, ipk, cover_letter, total_amount, file_name, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'draft')`,
        [id, participantId, semNum, year || null, sks, ips, ipk, coverLetter.trim(), fileName]
      );
      res.status(201).json({ ok: true, data: { id } });
    }
  })
);

async function recomputeFullSemesterReportTotal(reportId) {
  const [[{ sumJumlah }]] = await pool.query(
    'SELECT COALESCE(SUM(jumlah), 0) AS sumJumlah FROM full_semester_report_budget_items WHERE report_id = ?',
    [reportId]
  );
  const [reportRows] = await pool.query(
    'SELECT kontribusi_ortu FROM full_semester_reports WHERE id = ? LIMIT 1',
    [reportId]
  );
  const kontribusi = reportRows[0] ? Number(reportRows[0].kontribusi_ortu) : 0;
  const total = Math.max(0, Number(sumJumlah) - kontribusi);
  await pool.query('UPDATE full_semester_reports SET total_amount = ? WHERE id = ?', [total, reportId]);
  return total;
}

async function requireEditableOwnReport(reportId, participantId) {
  const [rows] = await pool.query('SELECT * FROM full_semester_reports WHERE id = ? LIMIT 1', [
    reportId,
  ]);
  const report = rows[0];
  if (!report || report.participant_id !== participantId) {
    throw new ApiError('Laporan semester tidak ditemukan.', 404);
  }
  if (report.status !== 'draft' && report.status !== 'revision') {
    throw new ApiError('Laporan semester ini sudah dikirim dan tidak dapat diubah.');
  }
  return report;
}

router.get(
  '/full-semester-reports/:id/budget-items',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM full_semester_reports WHERE id = ? LIMIT 1', [
      req.params.id,
    ]);
    if (!rows[0] || rows[0].participant_id !== req.session.profileId) {
      throw new ApiError('Laporan semester tidak ditemukan.', 404);
    }
    const [items] = await pool.query(
      'SELECT * FROM full_semester_report_budget_items WHERE report_id = ? ORDER BY sort_order ASC, created_at ASC',
      [req.params.id]
    );
    res.json({ ok: true, data: items.map(budgetItemToPublic) });
  })
);

router.post(
  '/full-semester-reports/:id/budget-items',
  asyncHandler(async (req, res) => {
    await requireEditableOwnReport(req.params.id, req.session.profileId);
    const { keterangan, unit, satuan } = req.body;
    if (!keterangan || !keterangan.trim()) throw new ApiError('Keterangan wajib diisi.');
    const unitNum = Number(unit);
    const satuanNum = Number(satuan);
    if (!(unitNum > 0)) throw new ApiError('Unit harus lebih dari 0.');
    if (!(satuanNum > 0)) throw new ApiError('Satuan harus lebih dari 0.');
    const jumlah = unitNum * satuanNum;

    const [[{ maxOrder }]] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM full_semester_report_budget_items WHERE report_id = ?',
      [req.params.id]
    );

    const id = makeId('bud');
    await pool.query(
      `INSERT INTO full_semester_report_budget_items
        (id, report_id, keterangan, unit, satuan, jumlah, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, keterangan.trim(), unitNum, satuanNum, jumlah, maxOrder + 1]
    );
    const totalAmount = await recomputeFullSemesterReportTotal(req.params.id);
    res.status(201).json({ ok: true, data: { id, totalAmount } });
  })
);

router.delete(
  '/full-semester-reports/:id/budget-items/:itemId',
  asyncHandler(async (req, res) => {
    await requireEditableOwnReport(req.params.id, req.session.profileId);
    await pool.query(
      'DELETE FROM full_semester_report_budget_items WHERE id = ? AND report_id = ?',
      [req.params.itemId, req.params.id]
    );
    const totalAmount = await recomputeFullSemesterReportTotal(req.params.id);
    res.json({ ok: true, data: { totalAmount } });
  })
);

router.patch(
  '/full-semester-reports/:id/kontribusi',
  asyncHandler(async (req, res) => {
    await requireEditableOwnReport(req.params.id, req.session.profileId);
    const { kontribusiOrtu } = req.body;
    const kontribusiNum = Number(kontribusiOrtu);
    if (!(kontribusiNum >= 0)) throw new ApiError('Kontribusi tidak valid.');
    await pool.query('UPDATE full_semester_reports SET kontribusi_ortu = ? WHERE id = ?', [
      kontribusiNum,
      req.params.id,
    ]);
    const totalAmount = await recomputeFullSemesterReportTotal(req.params.id);
    res.json({ ok: true, data: { totalAmount } });
  })
);

router.post(
  '/full-semester-reports/:id/submit',
  asyncHandler(async (req, res) => {
    const participantId = req.session.profileId;
    const [rows] = await pool.query('SELECT * FROM full_semester_reports WHERE id = ? LIMIT 1', [
      req.params.id,
    ]);
    const report = rows[0];
    if (!report || report.participant_id !== participantId) {
      throw new ApiError('Laporan semester tidak ditemukan.', 404);
    }
    if (report.status !== 'draft' && report.status !== 'revision') {
      throw new ApiError('Laporan semester ini sudah dikirim.');
    }

    const [commitmentRows] = await pool.query(
      'SELECT * FROM commitment_statements WHERE participant_id = ? LIMIT 1',
      [participantId]
    );
    const commitment = commitmentRows[0];
    const commitmentDone = !!(
      commitment &&
      commitment.participant_stmt_file_id &&
      commitment.guardian_stmt_file_id
    );
    if (!commitmentDone) {
      throw new ApiError('Lengkapi pernyataan komitmen partisipan dan orang tua/wali terlebih dahulu.');
    }

    const [khsRows] = await pool.query(
      'SELECT id FROM khs_uploads WHERE participant_id = ? AND semester_number = ? LIMIT 1',
      [participantId, report.semester_number]
    );
    if (khsRows.length === 0) {
      throw new ApiError('Unggah KHS untuk semester ini terlebih dahulu.');
    }

    const [linkRows] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM report_activity_links WHERE report_id = ?',
      [report.id]
    );
    if (Number(linkRows[0].cnt) < 5) {
      throw new ApiError('Pilih minimal 5 Laporan Bulanan sebagai dokumentasi kegiatan.');
    }

    const [budgetRows] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM full_semester_report_budget_items WHERE report_id = ?',
      [report.id]
    );
    if (Number(budgetRows[0].cnt) === 0) {
      throw new ApiError('Isi Rincian Penggunaan Dana terlebih dahulu.');
    }

    await pool.query(
      "UPDATE full_semester_reports SET status = 'pending', reviewed_by = NULL, reviewed_at = NULL WHERE id = ?",
      [report.id]
    );

    const [profileRows] = await pool.query('SELECT full_name FROM profiles WHERE id = ? LIMIT 1', [
      participantId,
    ]);
    await notifyAdmins({
      type: 'full_semester_report_submitted',
      title: 'Laporan Semester Lengkap baru',
      body: `${profileRows[0].full_name} mengirim Laporan Semester Lengkap yang perlu ditinjau.`,
      data: { reportId: report.id, participantId },
    });

    res.json({ ok: true, data: { ok: true } });
  })
);

// Lets a participant re-open their own already-verified report to fix a mistake
// ("Perbaiki" on the ReportScreen history) — reuses the 'revision' status so the rest
// of the edit/resubmit pipeline (requireEditableOwnReport, /submit) treats it exactly
// like an admin-requested revision. Re-verification by admin happens the same way too.
router.post(
  '/full-semester-reports/:id/reopen',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM full_semester_reports WHERE id = ? LIMIT 1', [
      req.params.id,
    ]);
    const report = rows[0];
    if (!report || report.participant_id !== req.session.profileId) {
      throw new ApiError('Laporan semester tidak ditemukan.', 404);
    }
    if (report.status !== 'verified') {
      throw new ApiError('Hanya laporan yang sudah terverifikasi yang bisa dibuka kembali.');
    }
    await pool.query(
      "UPDATE full_semester_reports SET status = 'revision', reviewed_by = NULL, reviewed_at = NULL WHERE id = ?",
      [report.id]
    );
    res.json({ ok: true, data: { ok: true } });
  })
);

router.patch(
  '/full-semester-reports/:id/pdf',
  asyncHandler(async (req, res) => {
    const { fileId } = req.body;
    if (!fileId) throw new ApiError('fileId wajib diisi.');
    const [rows] = await pool.query('SELECT * FROM full_semester_reports WHERE id = ? LIMIT 1', [
      req.params.id,
    ]);
    const report = rows[0];
    if (!report || report.participant_id !== req.session.profileId) {
      throw new ApiError('Laporan semester tidak ditemukan.', 404);
    }
    await pool.query('UPDATE full_semester_reports SET pdf_file_id = ? WHERE id = ?', [
      fileId,
      report.id,
    ]);
    res.json({ ok: true, data: { ok: true } });
  })
);

router.get(
  '/khs',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM khs_uploads WHERE participant_id = ?', [
      req.session.profileId,
    ]);
    res.json({ ok: true, data: rows.map(khsUploadToPublic) });
  })
);

router.post(
  '/khs',
  asyncHandler(async (req, res) => {
    // fileId (KHS) and krsFileId (KRS) are independent — either or both may be present, since
    // "Unggah KHS" and "Unggah KRS" are now two separate buttons that each POST on their own.
    const { semesterNumber, fileId, krsFileId } = req.body;
    const semNum = Number(semesterNumber);
    if (!semNum || semNum < 1 || semNum > 8) throw new ApiError('Semester tidak valid.');
    if (!fileId && !krsFileId) throw new ApiError('Berkas KHS atau KRS wajib diunggah.');

    const [existingRows] = await pool.query(
      'SELECT id FROM khs_uploads WHERE participant_id = ? AND semester_number = ? LIMIT 1',
      [req.session.profileId, semNum]
    );
    const existing = existingRows[0];
    if (existing) {
      if (fileId) {
        await pool.query('UPDATE khs_uploads SET file_id = ?, uploaded_at = NOW() WHERE id = ?', [
          fileId,
          existing.id,
        ]);
      }
      if (krsFileId) {
        await pool.query('UPDATE khs_uploads SET krs_file_id = ?, uploaded_at = NOW() WHERE id = ?', [
          krsFileId,
          existing.id,
        ]);
      }
      res.json({ ok: true, data: { id: existing.id } });
    } else {
      const id = makeId('khs');
      await pool.query(
        'INSERT INTO khs_uploads (id, participant_id, semester_number, file_id, krs_file_id) VALUES (?, ?, ?, ?, ?)',
        [id, req.session.profileId, semNum, fileId || null, krsFileId || null]
      );
      res.status(201).json({ ok: true, data: { id } });
    }
  })
);

router.delete(
  '/khs/:semesterNumber/:docType',
  asyncHandler(async (req, res) => {
    const semNum = Number(req.params.semesterNumber);
    const { docType } = req.params;
    if (!semNum || semNum < 1 || semNum > 8) throw new ApiError('Semester tidak valid.');
    if (docType !== 'khs' && docType !== 'krs') throw new ApiError('Jenis berkas tidak valid.');

    const column = docType === 'khs' ? 'file_id' : 'krs_file_id';
    await pool.query(
      `UPDATE khs_uploads SET ${column} = NULL WHERE participant_id = ? AND semester_number = ?`,
      [req.session.profileId, semNum]
    );
    res.json({ ok: true, data: { ok: true } });
  })
);

router.get(
  '/commitment-statements',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT * FROM commitment_statements WHERE participant_id = ? LIMIT 1',
      [req.session.profileId]
    );
    res.json({
      ok: true,
      data: rows[0]
        ? commitmentStatementToPublic(rows[0])
        : { participantId: req.session.profileId },
    });
  })
);

router.post(
  '/commitment-statements',
  asyncHandler(async (req, res) => {
    const { type, fileId } = req.body;
    if (type !== 'participant' && type !== 'guardian') {
      throw new ApiError('Jenis pernyataan tidak valid.');
    }
    if (!fileId) throw new ApiError('Berkas pernyataan wajib diunggah.');

    const column = type === 'participant' ? 'participant_stmt_file_id' : 'guardian_stmt_file_id';
    const [rows] = await pool.query(
      'SELECT * FROM commitment_statements WHERE participant_id = ? LIMIT 1',
      [req.session.profileId]
    );
    const existing = rows[0];

    if (existing && existing[column]) {
      throw new ApiError('Pernyataan ini sudah diunggah sebelumnya dan tidak dapat diganti.');
    }

    if (existing) {
      await pool.query(`UPDATE commitment_statements SET ${column} = ? WHERE id = ?`, [
        fileId,
        existing.id,
      ]);
    } else {
      const id = makeId('cs');
      await pool.query(
        `INSERT INTO commitment_statements (id, participant_id, ${column}) VALUES (?, ?, ?)`,
        [id, req.session.profileId, fileId]
      );
    }
    res.json({ ok: true, data: { ok: true } });
  })
);

router.delete(
  '/commitment-statements/:type',
  asyncHandler(async (req, res) => {
    const { type } = req.params;
    if (type !== 'participant' && type !== 'guardian') {
      throw new ApiError('Jenis pernyataan tidak valid.');
    }
    const column = type === 'participant' ? 'participant_stmt_file_id' : 'guardian_stmt_file_id';
    await pool.query(`UPDATE commitment_statements SET ${column} = NULL WHERE participant_id = ?`, [
      req.session.profileId,
    ]);
    res.json({ ok: true, data: { ok: true } });
  })
);

router.get(
  '/monthly-reports',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT * FROM monthly_reports WHERE participant_id = ? ORDER BY report_date DESC, created_at DESC',
      [req.session.profileId]
    );
    res.json({ ok: true, data: rows.map(monthlyReportToPublic) });
  })
);

const MONTHLY_REPORT_CATEGORIES = ['kampus', 'ppa_cluster', 'mentoring'];

router.post(
  '/monthly-reports',
  asyncHandler(async (req, res) => {
    const { description, category, reportDate, fileId } = req.body;
    if (!description || !description.trim()) throw new ApiError('Deskripsi aktivitas wajib diisi.');
    if (!MONTHLY_REPORT_CATEGORIES.includes(category)) throw new ApiError('Kategori kegiatan tidak valid.');
    if (!reportDate) throw new ApiError('Tanggal wajib diisi.');
    if (!fileId) throw new ApiError('Berkas/foto wajib diunggah.');

    const id = makeId('mr');
    await pool.query(
      `INSERT INTO monthly_reports (id, participant_id, description, category, report_date, file_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.session.profileId, description.trim(), category, reportDate, fileId]
    );
    res.status(201).json({ ok: true, data: { id } });
  })
);

router.patch(
  '/monthly-reports/:id',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM monthly_reports WHERE id = ? LIMIT 1', [
      req.params.id,
    ]);
    const existing = rows[0];
    if (!existing || existing.participant_id !== req.session.profileId) {
      throw new ApiError('Laporan bulanan tidak ditemukan.', 404);
    }

    const { description, category, reportDate, fileId } = req.body;
    if (!description || !description.trim()) throw new ApiError('Deskripsi aktivitas wajib diisi.');
    if (!MONTHLY_REPORT_CATEGORIES.includes(category)) throw new ApiError('Kategori kegiatan tidak valid.');
    if (!reportDate) throw new ApiError('Tanggal wajib diisi.');
    if (!fileId) throw new ApiError('Berkas/foto wajib diunggah.');

    await pool.query(
      'UPDATE monthly_reports SET description = ?, category = ?, report_date = ?, file_id = ? WHERE id = ?',
      [description.trim(), category, reportDate, fileId, req.params.id]
    );
    res.json({ ok: true, data: { ok: true } });
  })
);

router.delete(
  '/monthly-reports/:id',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM monthly_reports WHERE id = ? LIMIT 1', [
      req.params.id,
    ]);
    const report = rows[0];
    if (!report || report.participant_id !== req.session.profileId) {
      throw new ApiError('Laporan bulanan tidak ditemukan.', 404);
    }
    await pool.query('DELETE FROM monthly_reports WHERE id = ?', [req.params.id]);
    res.json({ ok: true, data: { ok: true } });
  })
);

router.get(
  '/full-semester-reports/:id/activity-links',
  asyncHandler(async (req, res) => {
    const [reportRows] = await pool.query('SELECT * FROM full_semester_reports WHERE id = ? LIMIT 1', [
      req.params.id,
    ]);
    const report = reportRows[0];
    if (!report || report.participant_id !== req.session.profileId) {
      throw new ApiError('Laporan tidak ditemukan.', 404);
    }
    const [rows] = await pool.query(
      'SELECT monthly_report_id FROM report_activity_links WHERE report_id = ?',
      [req.params.id]
    );
    res.json({ ok: true, data: rows.map((r) => r.monthly_report_id) });
  })
);

router.post(
  '/full-semester-reports/:id/activity-links',
  asyncHandler(async (req, res) => {
    const { monthlyReportId } = req.body;
    if (!monthlyReportId) throw new ApiError('Laporan bulanan wajib dipilih.');

    const [reportRows] = await pool.query('SELECT * FROM full_semester_reports WHERE id = ? LIMIT 1', [
      req.params.id,
    ]);
    const report = reportRows[0];
    if (!report || report.participant_id !== req.session.profileId) {
      throw new ApiError('Laporan tidak ditemukan.', 404);
    }
    if (report.status === 'verified') {
      throw new ApiError('Laporan sudah diverifikasi, tidak dapat mengubah kegiatan.');
    }

    const [monthlyRows] = await pool.query('SELECT * FROM monthly_reports WHERE id = ? LIMIT 1', [
      monthlyReportId,
    ]);
    const monthly = monthlyRows[0];
    if (!monthly || monthly.participant_id !== req.session.profileId) {
      throw new ApiError('Laporan bulanan tidak ditemukan.', 404);
    }

    try {
      const id = makeId('ral');
      await pool.query(
        'INSERT INTO report_activity_links (id, report_id, monthly_report_id) VALUES (?, ?, ?)',
        [id, req.params.id, monthlyReportId]
      );
      res.status(201).json({ ok: true, data: { id } });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        res.status(200).json({ ok: true, data: { ok: true } });
        return;
      }
      throw err;
    }
  })
);

router.delete(
  '/full-semester-reports/:reportId/activity-links/:monthlyReportId',
  asyncHandler(async (req, res) => {
    const [reportRows] = await pool.query('SELECT * FROM full_semester_reports WHERE id = ? LIMIT 1', [
      req.params.reportId,
    ]);
    const report = reportRows[0];
    if (!report || report.participant_id !== req.session.profileId) {
      throw new ApiError('Laporan tidak ditemukan.', 404);
    }
    if (report.status === 'verified') {
      throw new ApiError('Laporan sudah diverifikasi, tidak dapat mengubah kegiatan.');
    }
    await pool.query(
      'DELETE FROM report_activity_links WHERE report_id = ? AND monthly_report_id = ?',
      [req.params.reportId, req.params.monthlyReportId]
    );
    res.json({ ok: true, data: { ok: true } });
  })
);

router.get(
  '/accounts',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM accounts WHERE participant_id = ?', [
      req.session.profileId,
    ]);
    res.json({ ok: true, data: rows.map(accountToPublic) });
  })
);

router.post(
  '/accounts',
  asyncHandler(async (req, res) => {
    const { kind, provider, number, holderName } = req.body;
    if (!kind || !provider || !number || !holderName) throw new ApiError('Data rekening tidak lengkap.');

    const id = makeId('acc');
    await pool.query(
      `INSERT INTO accounts (id, participant_id, kind, provider, number, holder_name, is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.session.profileId, kind, provider, number, holderName, kind === 'bank']
    );
    res.status(201).json({ ok: true, data: { id } });
  })
);

router.patch(
  '/accounts/:id',
  asyncHandler(async (req, res) => {
    const { provider, number, holderName } = req.body;
    if (!provider || !number || !holderName) throw new ApiError('Data rekening tidak lengkap.');

    const [rows] = await pool.query('SELECT * FROM accounts WHERE id = ? LIMIT 1', [req.params.id]);
    const account = rows[0];
    if (!account) throw new ApiError('Data tidak ditemukan.', 404);
    if (account.participant_id !== req.session.profileId) {
      throw new ApiError('Tidak memiliki akses untuk data ini.', 403);
    }

    await pool.query(
      'UPDATE accounts SET provider = ?, number = ?, holder_name = ? WHERE id = ?',
      [provider, number, holderName, req.params.id]
    );
    res.json({ ok: true, data: { ok: true } });
  })
);

router.delete(
  '/accounts/:id',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM accounts WHERE id = ? LIMIT 1', [req.params.id]);
    const account = rows[0];
    if (!account) throw new ApiError('Data tidak ditemukan.', 404);
    if (account.participant_id !== req.session.profileId) {
      throw new ApiError('Tidak memiliki akses untuk data ini.', 403);
    }
    await pool.query('DELETE FROM accounts WHERE id = ?', [req.params.id]);
    res.json({ ok: true, data: { ok: true } });
  })
);

router.get(
  '/transfer-proofs',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT tp.*, d.title AS disbursement_title
       FROM transfer_proofs tp
       LEFT JOIN disbursements d ON d.id = tp.disbursement_id
       WHERE tp.participant_id = ?`,
      [req.session.profileId]
    );
    res.json({ ok: true, data: rows.map(transferProofToPublic) });
  })
);

router.post(
  '/transfer-proofs/:id/confirm',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM transfer_proofs WHERE id = ? LIMIT 1', [req.params.id]);
    const proof = rows[0];
    if (!proof) throw new ApiError('Data tidak ditemukan.', 404);
    if (proof.participant_id !== req.session.profileId) {
      throw new ApiError('Tidak memiliki akses untuk data ini.', 403);
    }
    await pool.query('UPDATE transfer_proofs SET confirmed_by_participant = TRUE WHERE id = ?', [req.params.id]);
    res.json({ ok: true, data: { ok: true } });
  })
);

module.exports = router;
