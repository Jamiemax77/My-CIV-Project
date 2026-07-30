import { secureStorage } from './secureStorage'

/** UI-level "Jenis Pengajuan" — richer than the backend's 2-value `type` enum
 * ('reimburse' | 'return'); 'lainnya' maps to type:'reimburse' at submit time (same
 * mapping the pre-wizard screen already used for its "Transaksi Lainnya" chip). */
export type JenisPengajuanKode = 'reimburse' | 'return' | 'lainnya' | 'kasbon'

const KODE_JENIS: Record<JenisPengajuanKode, string> = {
  reimburse: 'RMB',
  return: 'PGS',
  lainnya: 'TRX',
  kasbon: 'KSB'
}

const SEQUENCE_KEY_PREFIX = 'civ_nomor_pengajuan_seq_'

function todayYYYYMMDD (): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Generates a Nomor Pengajuan as <KODE_JENIS>-<YYYYMMDD>-<urutan 4 digit>, e.g.
 * RMB-20260728-0007. Uniqueness is guaranteed per-device via a persisted daily sequence
 * (secureStorage — same pattern authStore/archiveStore already use for local state), keyed
 * by kode+tanggal, so two submissions of the same jenis on the same day never collide on
 * this device.
 *
 * TODO(backend integration): this number is generated optimistically, client-side, before
 * the pengajuan actually exists server-side — it can't guarantee uniqueness *across*
 * devices/participants on its own. It's sent as `nomorPengajuan` in the
 * POST /participant/reimbursements body and persisted as-is (see migration 008). If the
 * business ever needs a cross-device-safe sequence, have the backend generate its own
 * authoritative number instead and use the value from that response in place of this one.
 */
export async function generateNomorPengajuan (
  jenis: JenisPengajuanKode
): Promise<string> {
  const kode = KODE_JENIS[jenis]
  const tanggal = todayYYYYMMDD()
  const key = `${SEQUENCE_KEY_PREFIX}${kode}_${tanggal}`
  const raw = await secureStorage.getItemAsync(key)
  const next = (raw ? parseInt(raw, 10) : 0) + 1
  await secureStorage.setItemAsync(key, String(next))
  const urutan = String(next).padStart(4, '0')
  return `${kode}-${tanggal}-${urutan}`
}
