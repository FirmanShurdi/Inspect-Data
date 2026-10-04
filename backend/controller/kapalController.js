const { kapal, jenis, asal_kapal } = require("../model/association");
const { Op } = require("sequelize");
const { recordLog } = require("../helper/logHelper");

// --- KAPAL CRUD ---
const getKapal = async (req, res) => {
  let search = (req.query.search || "").trim();
  const isSimple = req.query.simple === "true";
  try {
    const whereClause = search
      ? {
          [Op.or]: [
            { nama_kapal: { [Op.like]: `%${search}%` } },
            { tanda_selar: { [Op.like]: `%${search}%` } },
            { call_sign: { [Op.like]: `%${search}%` } },
            { nomor_imo: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    if (isSimple) {
      const datas = await kapal.findAll({
        attributes: ["id_kapal", "nama_kapal"],
        order: [["nama_kapal", "ASC"]],
        where: whereClause,
      });
      return res.status(200).json({ msg: "Berhasil mengambil data", datas });
    }

    const datas = await kapal.findAll({
      order: [["id_kapal", "DESC"]],
      where: whereClause,
      include: [
        { model: jenis, as: "jenis", attributes: ["id_jenis", "nama_jenis"] },
        { model: asal_kapal, as: "asal", attributes: ["id_asal_kapal", "nama_asal_kapal"] },
      ],
    });
    return res.status(200).json({ msg: "Berhasil mengambil data", datas });
  } catch (error) {
    console.error("getKapal Error:", error);
    return res.status(500).json({ msg: "terjadi kesalahan pada fungsi getKapal" });
  }
};

const getKapalById = async (req, res) => {
  try {
    let id = req.params.id;
    let data = await kapal.findByPk(id, {
      include: [
        { model: jenis, as: "jenis", attributes: ["id_jenis", "nama_jenis"] },
        { model: asal_kapal, as: "asal", attributes: ["id_asal_kapal", "nama_asal_kapal"] },
      ],
    });
    if (!data) return res.status(500).json({ msg: "data tidak ditemukan" });
    return res.status(200).json({ msg: "Berhasil mengambil data", data });
  } catch (error) {
    console.error("getKapalById Error:", error);
    return res.status(500).json({ msg: "terjadi kesalahan pada fungsi" });
  }
};

const storeKapal = async (req, res) => {
  try {
    const { nama_kapal, tanda_selar, nomor_selar, gt, nt, call_sign, nomor_imo, id_jenis, id_asal_kapal } = req.body;
    if (!nama_kapal || !nama_kapal.trim()) {
      return res.status(400).json({ msg: "Nama kapal wajib diisi" });
    }

    const newKapal = await kapal.create({
      nama_kapal: nama_kapal.trim(),
      tanda_selar: tanda_selar ? tanda_selar.trim() : null,
      nomor_selar: nomor_selar ? Number(nomor_selar) : null,
      gt: gt ? Number(gt) : 0,
      nt: nt ? Number(nt) : 0,
      call_sign: call_sign ? call_sign.trim().toUpperCase() : null,
      nomor_imo: nomor_imo ? nomor_imo.trim() : null,
      id_jenis: id_jenis ? Number(id_jenis) : null,
      id_asal_kapal: id_asal_kapal ? Number(id_asal_kapal) : null,
    });

    await recordLog(req, {
      aksi: "CREATE",
      entitas: "kapal",
      keterangan: `Menambah data kapal "${nama_kapal.trim()}"`,
    });

    return res.status(200).json({ msg: "Berhasil menambahkan data kapal", data: newKapal });
  } catch (error) {
    console.error("storeKapal Error:", error);
    return res.status(500).json({ msg: error.message || "terjadi kesalahan pada fungsi storeKapal" });
  }
};

const updateKapal = async (req, res) => {
  try {
    let targetKapal = await kapal.findByPk(req.params.id);
    if (!targetKapal) return res.status(404).json({ msg: "Data kapal tidak ditemukan" });

    const { nama_kapal, tanda_selar, nomor_selar, gt, nt, call_sign, nomor_imo, id_jenis, id_asal_kapal } = req.body;

    await kapal.update(
      {
        nama_kapal: nama_kapal ? nama_kapal.trim() : targetKapal.nama_kapal,
        tanda_selar: tanda_selar !== undefined ? tanda_selar : targetKapal.tanda_selar,
        nomor_selar: nomor_selar !== undefined ? (nomor_selar ? Number(nomor_selar) : null) : targetKapal.nomor_selar,
        gt: gt !== undefined ? Number(gt) : targetKapal.gt,
        nt: nt !== undefined ? Number(nt) : targetKapal.nt,
        call_sign: call_sign !== undefined ? (call_sign ? call_sign.trim().toUpperCase() : null) : targetKapal.call_sign,
        nomor_imo: nomor_imo !== undefined ? nomor_imo : targetKapal.nomor_imo,
        id_jenis: id_jenis !== undefined ? (id_jenis ? Number(id_jenis) : null) : targetKapal.id_jenis,
        id_asal_kapal: id_asal_kapal !== undefined ? (id_asal_kapal ? Number(id_asal_kapal) : null) : targetKapal.id_asal_kapal,
      },
      { where: { id_kapal: req.params.id } }
    );

    await recordLog(req, {
      aksi: "UPDATE",
      entitas: "kapal",
      keterangan: `Mengubah data kapal "${targetKapal.nama_kapal}"`,
    });

    return res.status(200).json({ msg: "Berhasil memperbarui data kapal" });
  } catch (error) {
    console.error("updateKapal Error:", error);
    return res.status(500).json({ msg: error.message || "terjadi kesalahan pada fungsi updateKapal" });
  }
};

const deleteKapal = async (req, res) => {
  try {
    let targetKapal = await kapal.findByPk(req.params.id);
    if (!targetKapal) return res.status(404).json({ msg: "data tidak ditemukan" });

    await kapal.destroy({ where: { id_kapal: req.params.id } });

    await recordLog(req, {
      aksi: "DELETE",
      entitas: "kapal",
      keterangan: `Menghapus data kapal "${targetKapal.nama_kapal}"`,
    });

    return res.status(200).json({ msg: "Berhasil menghapus data kapal" });
  } catch (error) {
    console.error("deleteKapal Error:", error);
    return res.status(500).json({ msg: "terjadi kesalahan pada fungsi deleteKapal" });
  }
};

// --- JENIS KAPAL CRUD ---
const getJenis = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const whereClause = search ? { nama_jenis: { [Op.like]: `%${search}%` } } : {};
    const datas = await jenis.findAll({ order: [["id_jenis", "ASC"]], where: whereClause });
    return res.status(200).json({ msg: "Berhasil mengambil data jenis kapal", datas });
  } catch (error) {
    return res.status(500).json({ msg: "Gagal mengambil data jenis kapal" });
  }
};

const storeJenis = async (req, res) => {
  try {
    const { nama_jenis } = req.body;
    if (!nama_jenis || !nama_jenis.trim()) return res.status(400).json({ msg: "Nama jenis kapal wajib diisi" });
    const data = await jenis.create({ nama_jenis: nama_jenis.trim() });
    return res.status(200).json({ msg: "Berhasil menambahkan jenis kapal", data });
  } catch (error) {
    return res.status(500).json({ msg: error.message || "Gagal menambahkan jenis kapal" });
  }
};

const updateJenis = async (req, res) => {
  try {
    const { nama_jenis } = req.body;
    await jenis.update({ nama_jenis: nama_jenis.trim() }, { where: { id_jenis: req.params.id } });
    return res.status(200).json({ msg: "Berhasil memperbarui jenis kapal" });
  } catch (error) {
    return res.status(500).json({ msg: "Gagal memperbarui jenis kapal" });
  }
};

const deleteJenis = async (req, res) => {
  try {
    await jenis.destroy({ where: { id_jenis: req.params.id } });
    return res.status(200).json({ msg: "Berhasil menghapus jenis kapal" });
  } catch (error) {
    return res.status(500).json({ msg: "Gagal menghapus jenis kapal" });
  }
};

// --- ASAL / KEDUDUKAN KAPAL CRUD ---
const getAsal = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const whereClause = search ? { nama_asal_kapal: { [Op.like]: `%${search}%` } } : {};
    const datas = await asal_kapal.findAll({ order: [["id_asal_kapal", "ASC"]], where: whereClause });
    return res.status(200).json({ msg: "Berhasil mengambil data kedudukan kapal", datas });
  } catch (error) {
    return res.status(500).json({ msg: "Gagal mengambil data kedudukan kapal" });
  }
};

const storeAsal = async (req, res) => {
  try {
    const { nama_asal_kapal } = req.body;
    if (!nama_asal_kapal || !nama_asal_kapal.trim()) return res.status(400).json({ msg: "Nama kedudukan kapal wajib diisi" });
    const data = await asal_kapal.create({ nama_asal_kapal: nama_asal_kapal.trim() });
    return res.status(200).json({ msg: "Berhasil menambahkan kedudukan kapal", data });
  } catch (error) {
    return res.status(500).json({ msg: error.message || "Gagal menambahkan kedudukan kapal" });
  }
};

const updateAsal = async (req, res) => {
  try {
    const { nama_asal_kapal } = req.body;
    await asal_kapal.update({ nama_asal_kapal: nama_asal_kapal.trim() }, { where: { id_asal_kapal: req.params.id } });
    return res.status(200).json({ msg: "Berhasil memperbarui kedudukan kapal" });
  } catch (error) {
    return res.status(500).json({ msg: "Gagal memperbarui kedudukan kapal" });
  }
};

const deleteAsal = async (req, res) => {
  try {
    await asal_kapal.destroy({ where: { id_asal_kapal: req.params.id } });
    return res.status(200).json({ msg: "Berhasil menghapus kedudukan kapal" });
  } catch (error) {
    return res.status(500).json({ msg: "Gagal menghapus kedudukan kapal" });
  }
};

module.exports = {
  getKapal,
  getKapalById,
  storeKapal,
  updateKapal,
  deleteKapal,
  getJenis,
  storeJenis,
  updateJenis,
  deleteJenis,
  getAsal,
  storeAsal,
  updateAsal,
  deleteAsal,
};
