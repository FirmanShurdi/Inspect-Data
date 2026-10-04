const { Op } = require("sequelize");
const logAktivitas = require("../model/logAktivitasModel");

/**
 * Get all activity logs with optional filtering & search
 */
const getLogAktivitas = async (req, res) => {
  try {
    const { search, aksi, entitas } = req.query;
    const whereClause = {};

    if (aksi && aksi !== 'ALL') {
      whereClause.aksi = { [Op.like]: `%${aksi}%` };
    }

    if (entitas && entitas !== 'ALL') {
      whereClause.entitas = { [Op.like]: `%${entitas}%` };
    }

    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { nama_user: { [Op.like]: `%${search}%` } },
        { role: { [Op.like]: `%${search}%` } },
        { aksi: { [Op.like]: `%${search}%` } },
        { entitas: { [Op.like]: `%${search}%` } },
        { keterangan: { [Op.like]: `%${search}%` } },
      ];
    }

    const logs = await logAktivitas.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      total: logs.length,
      datas: logs,
    });
  } catch (error) {
    console.error("Fetch Log Aktivitas Error:", error);
    return res.status(500).json({
      success: false,
      msg: "Gagal mengambil data log aktivitas.",
      error: error.message,
    });
  }
};

module.exports = {
  getLogAktivitas,
};
