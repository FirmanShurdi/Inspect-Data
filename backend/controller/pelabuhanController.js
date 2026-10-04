const { pelabuhan, manifest } = require("../model/association");
const { Op } = require("sequelize");
const { recordLog } = require("../helper/logHelper");

const getPelabuhan = async (req, res) => {
  let search = (req.query.search || "").trim();
  try {
    const whereClause = search
      ? {
          nama_pelabuhan: { [Op.like]: `%${search}%` },
        }
      : {};

    const datas = await pelabuhan.findAll({
      order: [["id_pelabuhan", "DESC"]],
      where: whereClause,
    });
    return res.status(200).json({ msg: "Berhasil mengambil data", datas });
  } catch (error) {
    console.error("getPelabuhan Error:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const getPelabuhanById = async (req, res) => {
  try {
    let id = req.params.id;
    let data = await pelabuhan.findByPk(id);
    if (!data) return res.status(404).json({ msg: "Data tidak ditemukan" });

    return res.status(200).json({ msg: "Berhasil mengambil data", data });
  } catch (error) {
    console.error("getPelabuhanById Error:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const storePelabuhan = async (req, res) => {
  try {
    const { nama_pelabuhan } = req.body;
    if (!nama_pelabuhan || !nama_pelabuhan.trim()) {
      return res.status(400).json({ msg: "Nama pelabuhan wajib diisi" });
    }

    const newPelabuhan = await pelabuhan.create({ nama_pelabuhan: nama_pelabuhan.trim() });
    await recordLog(req, {
      aksi: "CREATE",
      entitas: "pelabuhan",
      keterangan: `Menambah data pelabuhan "${nama_pelabuhan.trim()}"`,
    });

    return res.status(200).json({ msg: "Berhasil menambahkan data pelabuhan", data: newPelabuhan });
  } catch (error) {
    console.error("storePelabuhan Error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ msg: "Nama pelabuhan sudah terdaftar" });
    }
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const updatePelabuhan = async (req, res) => {
  try {
    const id = req.params.id;
    const { nama_pelabuhan } = req.body;
    if (!nama_pelabuhan || !nama_pelabuhan.trim()) {
      return res.status(400).json({ msg: "Nama pelabuhan wajib diisi" });
    }

    const [updatedCount] = await pelabuhan.update(
      { nama_pelabuhan: nama_pelabuhan.trim() },
      { where: { id_pelabuhan: id } }
    );

    if (updatedCount === 0) return res.status(404).json({ msg: "Data tidak ditemukan" });

    await recordLog(req, {
      aksi: "UPDATE",
      entitas: "pelabuhan",
      keterangan: `Mengubah data pelabuhan (ID: ${id}) menjadi "${nama_pelabuhan.trim()}"`,
    });

    return res.status(200).json({ msg: "Berhasil memperbarui data pelabuhan" });
  } catch (error) {
    console.error("updatePelabuhan Error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ msg: "Nama pelabuhan sudah terdaftar" });
    }
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const deletePelabuhan = async (req, res) => {
  try {
    const id = req.params.id;
    const pelabuhanData = await pelabuhan.findByPk(id);

    if (!pelabuhanData) return res.status(404).json({ msg: "Data pelabuhan tidak ditemukan" });

    // Cek proteksi relasi dengan tabel manifest (asal, tujuan, sandar, tolak, singgah)
    const countManifest = await manifest.count({
      where: {
        [Op.or]: [
          { id_datang_dari: id },
          { id_tujuan_akhir: id },
          { id_sandar: id },
          { id_tolak: id },
          { id_tempat_singgah: id },
        ],
      },
    });

    if (countManifest > 0) {
      return res.status(400).json({
        msg: `Data pelabuhan '${pelabuhanData.nama_pelabuhan}' tidak dapat dihapus karena sedang digunakan dalam ${countManifest} data manifest pelayaran.`,
      });
    }

    await pelabuhan.destroy({ where: { id_pelabuhan: id } });
    await recordLog(req, {
      aksi: "DELETE",
      entitas: "pelabuhan",
      keterangan: `Menghapus data pelabuhan "${pelabuhanData.nama_pelabuhan}"`,
    });

    return res.status(200).json({ msg: "Berhasil menghapus data pelabuhan" });
  } catch (error) {
    console.error("deletePelabuhan Error:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

module.exports = { getPelabuhan, getPelabuhanById, storePelabuhan, updatePelabuhan, deletePelabuhan };
