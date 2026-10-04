const logAktivitas = require("../model/logAktivitasModel");

/**
 * Record system activity log cleanly and safely without interrupting primary request flow.
 * @param {Object} req Express request object (contains authenticated user info)
 * @param {Object} params Log details
 * @param {String} params.aksi Action performed ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.)
 * @param {String} params.entitas Entity target ('manifest', 'penumpang', 'kapal', 'user', 'agen', etc.)
 * @param {String} params.keterangan Detailed activity description
 */
const recordLog = async (req, { aksi, entitas, keterangan }) => {
  try {
    const user = req?.user || {};
    const id_user = user.id_user || user.id || null;
    const username = user.username || user.nama_user || 'system';
    const nama_user = user.nama_lengkap || user.nama_user || user.username || 'System';
    const role = user.role || 'user';

    await logAktivitas.create({
      id_user,
      username,
      nama_user,
      role,
      aksi: String(aksi || 'AKTIVITAS').toUpperCase(),
      entitas: String(entitas || 'SYSTEM').toLowerCase(),
      keterangan: keterangan || '',
    });
  } catch (error) {
    // Log error internally so it never breaks primary HTTP response
    console.error('⚠️ Log Aktivitas Recorder Error:', error?.message || error);
  }
};

module.exports = { recordLog };
