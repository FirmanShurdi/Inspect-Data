const { provinsi, negara, kabupaten } = require("../model/association");
const { Op } = require("sequelize");
const { recordLog } = require("../helper/logHelper");

const getProvinsi = async (req, res) => {
  let search = (req.query.search || "").trim();
  try {
    const whereClause = search ? { nama_provinsi: { [Op.like]: `%${search}%` } } : {};
    const datas = await provinsi.findAll({
      order: [["id_provinsi", "DESC"]],
      where: whereClause,
      include: [{ model: negara, as: "negara", attributes: ["id_negara", "nama_negara"] }],
    });
    return res.status(200).json({ msg: "Berhasil mengambil data provinsi", datas });
  } catch (error) {
    console.error("GET PROVINSI ERROR:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const storeProvinsi = async (req, res) => {
  try {
    const { nama_provinsi, id_negara } = req.body;
    if (!nama_provinsi || !nama_provinsi.trim()) return res.status(400).json({ msg: "Nama provinsi wajib diisi" });

    const newProv = await provinsi.create({
      nama_provinsi: nama_provinsi.trim(),
      id_negara: id_negara || null,
    });
    await recordLog(req, {
      aksi: "CREATE",
      entitas: "daerah",
      keterangan: `Menambah data provinsi "${nama_provinsi.trim()}"`,
    });
    return res.status(200).json({ msg: "Berhasil menambahkan data provinsi", data: newProv });
  } catch (error) {
    console.error("STORE PROVINSI ERROR:", error);
    if (error.name === "SequelizeUniqueConstraintError") return res.status(400).json({ msg: "Nama provinsi sudah terdaftar" });
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const updateProvinsi = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_provinsi, id_negara } = req.body;
    if (!nama_provinsi || !nama_provinsi.trim()) return res.status(400).json({ msg: "Nama provinsi wajib diisi" });

    const [updatedCount] = await provinsi.update(
      { nama_provinsi: nama_provinsi.trim(), id_negara: id_negara || null },
      { where: { id_provinsi: id } }
    );
    if (updatedCount === 0) return res.status(404).json({ msg: "Data tidak ditemukan" });

    await recordLog(req, {
      aksi: "UPDATE",
      entitas: "daerah",
      keterangan: `Mengubah data provinsi (ID: ${id}) menjadi "${nama_provinsi.trim()}"`,
    });

    return res.status(200).json({ msg: "Berhasil memperbarui data provinsi" });
  } catch (error) {
    console.error("UPDATE PROVINSI ERROR:", error);
    if (error.name === "SequelizeUniqueConstraintError") return res.status(400).json({ msg: "Nama provinsi sudah terdaftar" });
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const deleteProvinsi = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await provinsi.findByPk(id);
    if (!target) return res.status(404).json({ msg: "Data provinsi tidak ditemukan" });

    const countKab = await kabupaten.count({ where: { id_provinsi: id } });
    if (countKab > 0) return res.status(400).json({ msg: `Provinsi '${target.nama_provinsi}' tidak dapat dihapus karena digunakan pada ${countKab} kabupaten/kota.` });

    await target.destroy();
    await recordLog(req, {
      aksi: "DELETE",
      entitas: "daerah",
      keterangan: `Menghapus data provinsi "${target.nama_provinsi}"`,
    });

    return res.status(200).json({ msg: "Berhasil menghapus data provinsi" });
  } catch (error) {
    console.error("DELETE PROVINSI ERROR:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

module.exports = { getProvinsi, storeProvinsi, updateProvinsi, deleteProvinsi };
