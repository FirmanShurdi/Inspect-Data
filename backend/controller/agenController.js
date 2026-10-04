const { agen, manifest } = require("../model/association");
const { Op } = require("sequelize");
const { recordLog } = require("../helper/logHelper");

const getAgen = async (req, res) => {
  let search = (req.query.search || "").trim();
  try {
    const whereClause = search
      ? {
          nama_agen: { [Op.like]: `%${search}%` },
        }
      : {};

    const datas = await agen.findAll({
      order: [["id_agen", "DESC"]],
      where: whereClause,
    });
    return res.status(200).json({ msg: "Berhasil mengambil data", datas });
  } catch (error) {
    console.error("getAgen Error:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const getAgenById = async (req, res) => {
  try {
    let id = req.params.id;
    let data = await agen.findByPk(id);
    if (!data) return res.status(444 || 404).json({ msg: "Data tidak ditemukan" });

    return res.status(200).json({ msg: "Berhasil mengambil data", data });
  } catch (error) {
    console.error("getAgenById Error:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const storeAgen = async (req, res) => {
  try {
    const { nama_agen } = req.body;
    if (!nama_agen || !nama_agen.trim()) {
      return res.status(400).json({ msg: "Nama agen wajib diisi" });
    }

    const newAgen = await agen.create({ nama_agen: nama_agen.trim() });
    await recordLog(req, {
      aksi: "CREATE",
      entitas: "agen",
      keterangan: `Menambah data agen "${nama_agen.trim()}"`,
    });

    return res.status(200).json({ msg: "Berhasil menambahkan data agen", data: newAgen });
  } catch (error) {
    console.error("storeAgen Error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ msg: "Nama agen sudah terdaftar" });
    }
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const updateAgen = async (req, res) => {
  try {
    const id = req.params.id;
    const { nama_agen } = req.body;
    if (!nama_agen || !nama_agen.trim()) {
      return res.status(400).json({ msg: "Nama agen wajib diisi" });
    }

    const [updatedCount] = await agen.update(
      { nama_agen: nama_agen.trim() },
      { where: { id_agen: id } }
    );

    if (updatedCount === 0) return res.status(404).json({ msg: "Data tidak ditemukan" });

    await recordLog(req, {
      aksi: "UPDATE",
      entitas: "agen",
      keterangan: `Mengubah data agen (ID: ${id}) menjadi "${nama_agen.trim()}"`,
    });

    return res.status(200).json({ msg: "Berhasil memperbarui data agen" });
  } catch (error) {
    console.error("updateAgen Error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ msg: "Nama agen sudah terdaftar" });
    }
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const deleteAgen = async (req, res) => {
  try {
    const id = req.params.id;
    const agenData = await agen.findByPk(id);

    if (!agenData) return res.status(404).json({ msg: "Data agen tidak ditemukan" });

    // Cek proteksi relasi dengan tabel manifest (perjalanan)
    const countManifest = await manifest.count({ where: { id_agen: id } });
    if (countManifest > 0) {
      return res.status(400).json({
        msg: `Data agen '${agenData.nama_agen}' tidak dapat dihapus karena sedang digunakan dalam ${countManifest} data manifest pelayaran.`,
      });
    }

    await agen.destroy({ where: { id_agen: id } });
    await recordLog(req, {
      aksi: "DELETE",
      entitas: "agen",
      keterangan: `Menghapus data agen "${agenData.nama_agen}"`,
    });

    return res.status(200).json({ msg: "Berhasil menghapus data agen" });
  } catch (error) {
    console.error("deleteAgen Error:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

module.exports = { getAgen, getAgenById, storeAgen, updateAgen, deleteAgen };
