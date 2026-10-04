const { kabupaten, provinsi, kecamatan } = require("../model/association");
const { Op } = require("sequelize");
const { recordLog } = require("../helper/logHelper");

const getKabupaten = async (req, res) => {
  let search = (req.query.search || "").trim();
  try {
    const whereClause = search ? { nama_kabupaten: { [Op.like]: `%${search}%` } } : {};
    const datas = await kabupaten.findAll({
      order: [["id_kabupaten", "DESC"]],
      where: whereClause,
      include: [{ model: provinsi, as: "provinsi", attributes: ["id_provinsi", "nama_provinsi"] }],
    });
    return res.status(200).json({ msg: "Berhasil mengambil data kabupaten/kota", datas });
  } catch (error) {
    console.error("GET KABUPATEN ERROR:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const storeKabupaten = async (req, res) => {
  try {
    const { nama_kabupaten, id_provinsi } = req.body;
    if (!nama_kabupaten || !nama_kabupaten.trim()) return res.status(400).json({ msg: "Nama kabupaten/kota wajib diisi" });

    const newKab = await kabupaten.create({
      nama_kabupaten: nama_kabupaten.trim(),
      id_provinsi: id_provinsi || null,
    });
    await recordLog(req, {
      aksi: "CREATE",
      entitas: "daerah",
      keterangan: `Menambah data kabupaten/kota "${nama_kabupaten.trim()}"`,
    });
    return res.status(200).json({ msg: "Berhasil menambahkan data kabupaten/kota", data: newKab });
  } catch (error) {
    console.error("STORE KABUPATEN ERROR:", error);
    if (error.name === "SequelizeUniqueConstraintError") return res.status(400).json({ msg: "Nama kabupaten/kota sudah terdaftar" });
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const updateKabupaten = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_kabupaten, id_provinsi } = req.body;
    if (!nama_kabupaten || !nama_kabupaten.trim()) return res.status(400).json({ msg: "Nama kabupaten/kota wajib diisi" });

    const [updatedCount] = await kabupaten.update(
      { nama_kabupaten: nama_kabupaten.trim(), id_provinsi: id_provinsi || null },
      { where: { id_kabupaten: id } }
    );
    if (updatedCount === 0) return res.status(404).json({ msg: "Data tidak ditemukan" });

    await recordLog(req, {
      aksi: "UPDATE",
      entitas: "daerah",
      keterangan: `Mengubah data kabupaten/kota (ID: ${id}) menjadi "${nama_kabupaten.trim()}"`,
    });

    return res.status(200).json({ msg: "Berhasil memperbarui data kabupaten/kota" });
  } catch (error) {
    console.error("UPDATE KABUPATEN ERROR:", error);
    if (error.name === "SequelizeUniqueConstraintError") return res.status(400).json({ msg: "Nama kabupaten/kota sudah terdaftar" });
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const deleteKabupaten = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await kabupaten.findByPk(id);
    if (!target) return res.status(404).json({ msg: "Data kabupaten/kota tidak ditemukan" });

    const countKec = await kecamatan.count({ where: { id_kabupaten: id } });
    if (countKec > 0) return res.status(400).json({ msg: `Kabupaten '${target.nama_kabupaten}' tidak dapat dihapus karena digunakan pada ${countKec} kecamatan.` });

    await target.destroy();
    await recordLog(req, {
      aksi: "DELETE",
      entitas: "daerah",
      keterangan: `Menghapus data kabupaten/kota "${target.nama_kabupaten}"`,
    });

    return res.status(200).json({ msg: "Berhasil menghapus data kabupaten/kota" });
  } catch (error) {
    console.error("DELETE KABUPATEN ERROR:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

module.exports = { getKabupaten, storeKabupaten, updateKabupaten, deleteKabupaten };
