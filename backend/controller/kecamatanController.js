const { kecamatan, kabupaten } = require("../model/association");
const { Op } = require("sequelize");
const { recordLog } = require("../helper/logHelper");

const getKecamatan = async (req, res) => {
  let search = (req.query.search || "").trim();
  try {
    const whereClause = search ? { nama_kecamatan: { [Op.like]: `%${search}%` } } : {};
    const datas = await kecamatan.findAll({
      order: [["id_kecamatan", "DESC"]],
      where: whereClause,
      include: [{ model: kabupaten, as: "kabupaten", attributes: ["id_kabupaten", "nama_kabupaten"] }],
    });
    return res.status(200).json({ msg: "Berhasil mengambil data kecamatan", datas });
  } catch (error) {
    console.error("GET KECAMATAN ERROR:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const storeKecamatan = async (req, res) => {
  try {
    const { nama_kecamatan, id_kabupaten } = req.body;
    if (!nama_kecamatan || !nama_kecamatan.trim()) return res.status(400).json({ msg: "Nama kecamatan wajib diisi" });

    const newKec = await kecamatan.create({
      nama_kecamatan: nama_kecamatan.trim(),
      id_kabupaten: id_kabupaten || null,
    });
    await recordLog(req, {
      aksi: "CREATE",
      entitas: "daerah",
      keterangan: `Menambah data kecamatan "${nama_kecamatan.trim()}"`,
    });
    return res.status(200).json({ msg: "Berhasil menambahkan data kecamatan", data: newKec });
  } catch (error) {
    console.error("STORE KECAMATAN ERROR:", error);
    if (error.name === "SequelizeUniqueConstraintError") return res.status(400).json({ msg: "Nama kecamatan sudah terdaftar" });
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const updateKecamatan = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_kecamatan, id_kabupaten } = req.body;
    if (!nama_kecamatan || !nama_kecamatan.trim()) return res.status(400).json({ msg: "Nama kecamatan wajib diisi" });

    const [updatedCount] = await kecamatan.update(
      { nama_kecamatan: nama_kecamatan.trim(), id_kabupaten: id_kabupaten || null },
      { where: { id_kecamatan: id } }
    );
    if (updatedCount === 0) return res.status(404).json({ msg: "Data tidak ditemukan" });

    await recordLog(req, {
      aksi: "UPDATE",
      entitas: "daerah",
      keterangan: `Mengubah data kecamatan (ID: ${id}) menjadi "${nama_kecamatan.trim()}"`,
    });

    return res.status(200).json({ msg: "Berhasil memperbarui data kecamatan" });
  } catch (error) {
    console.error("UPDATE KECAMATAN ERROR:", error);
    if (error.name === "SequelizeUniqueConstraintError") return res.status(400).json({ msg: "Nama kecamatan sudah terdaftar" });
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const deleteKecamatan = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await kecamatan.findByPk(id);
    if (!target) return res.status(404).json({ msg: "Data kecamatan tidak ditemukan" });

    await target.destroy();
    await recordLog(req, {
      aksi: "DELETE",
      entitas: "daerah",
      keterangan: `Menghapus data kecamatan "${target.nama_kecamatan}"`,
    });

    return res.status(200).json({ msg: "Berhasil menghapus data kecamatan" });
  } catch (error) {
    console.error("DELETE KECAMATAN ERROR:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

module.exports = { getKecamatan, storeKecamatan, updateKecamatan, deleteKecamatan };
