const { negara, provinsi } = require("../model/association");
const { Op } = require("sequelize");
const { recordLog } = require("../helper/logHelper");

const getNegara = async (req, res) => {
  let search = (req.query.search || "").trim();
  try {
    const whereClause = search ? { nama_negara: { [Op.like]: `%${search}%` } } : {};
    const datas = await negara.findAll({ order: [["id_negara", "DESC"]], where: whereClause });
    return res.status(200).json({ msg: "Berhasil mengambil data negara", datas });
  } catch (error) {
    console.error("GET NEGARA ERROR:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const storeNegara = async (req, res) => {
  try {
    const { nama_negara, kode_negara } = req.body;
    if (!nama_negara || !nama_negara.trim()) return res.status(400).json({ msg: "Nama negara wajib diisi" });

    const newNegara = await negara.create({
      nama_negara: nama_negara.trim(),
      kode_negara: kode_negara ? kode_negara.trim() : null,
    });
    await recordLog(req, {
      aksi: "CREATE",
      entitas: "daerah",
      keterangan: `Menambah data negara "${nama_negara.trim()}"`,
    });
    return res.status(200).json({ msg: "Berhasil menambahkan data negara", data: newNegara });
  } catch (error) {
    console.error("STORE NEGARA ERROR:", error);
    if (error.name === "SequelizeUniqueConstraintError") return res.status(400).json({ msg: "Nama atau kode negara sudah terdaftar" });
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const updateNegara = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_negara, kode_negara } = req.body;
    if (!nama_negara || !nama_negara.trim()) return res.status(400).json({ msg: "Nama negara wajib diisi" });

    const [updatedCount] = await negara.update(
      { nama_negara: nama_negara.trim(), kode_negara: kode_negara ? kode_negara.trim() : null },
      { where: { id_negara: id } }
    );
    if (updatedCount === 0) return res.status(404).json({ msg: "Data tidak ditemukan" });

    await recordLog(req, {
      aksi: "UPDATE",
      entitas: "daerah",
      keterangan: `Mengubah data negara (ID: ${id}) menjadi "${nama_negara.trim()}"`,
    });

    return res.status(200).json({ msg: "Berhasil memperbarui data negara" });
  } catch (error) {
    console.error("UPDATE NEGARA ERROR:", error);
    if (error.name === "SequelizeUniqueConstraintError") return res.status(400).json({ msg: "Nama atau kode negara sudah terdaftar" });
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const deleteNegara = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await negara.findByPk(id);
    if (!target) return res.status(404).json({ msg: "Data negara tidak ditemukan" });

    const countProv = await provinsi.count({ where: { id_negara: id } });
    if (countProv > 0) return res.status(400).json({ msg: `Negara '${target.nama_negara}' tidak dapat dihapus karena digunakan pada ${countProv} provinsi.` });

    await target.destroy();
    await recordLog(req, {
      aksi: "DELETE",
      entitas: "daerah",
      keterangan: `Menghapus data negara "${target.nama_negara}"`,
    });

    return res.status(200).json({ msg: "Berhasil menghapus data negara" });
  } catch (error) {
    console.error("DELETE NEGARA ERROR:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

module.exports = { getNegara, storeNegara, updateNegara, deleteNegara };
