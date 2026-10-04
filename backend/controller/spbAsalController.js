const { spbAsal } = require("../model/association");
const { Op } = require("sequelize");
const { recordLog } = require("../helper/logHelper");

const getSpbAsal = async (req, res) => {
  let search = (req.query.search || "").trim();
  try {
    const whereClause = search
      ? {
          [Op.or]: [
            { kode_spb: { [Op.like]: `%${search}%` } },
            { asal: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const datas = await spbAsal.findAll({
      order: [["id_spb_asal", "DESC"]],
      where: whereClause,
    });
    return res.status(200).json({ msg: "Berhasil mengambil data SPB Asal", datas });
  } catch (error) {
    console.error("GET SPB ASAL ERROR:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const getSpbAsalById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await spbAsal.findByPk(id);
    if (!data) return res.status(404).json({ msg: "Data SPB Asal tidak ditemukan" });

    return res.status(200).json({ msg: "Berhasil mengambil data SPB Asal", data });
  } catch (error) {
    console.error("GET SPB ASAL BY ID ERROR:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server" });
  }
};

const storeSpbAsal = async (req, res) => {
  try {
    const { kode_spb, asal } = req.body;
    if (!kode_spb || !kode_spb.trim()) {
      return res.status(400).json({ msg: "Kode SPB wajib diisi." });
    }
    if (!asal || !asal.trim()) {
      return res.status(400).json({ msg: "Asal pelabuhan wajib diisi." });
    }

    const existing = await spbAsal.findOne({
      where: {
        kode_spb: kode_spb.trim(),
        asal: asal.trim(),
      },
    });

    if (existing) {
      return res.status(400).json({ msg: `Kode SPB '${kode_spb.trim()}' dengan asal '${asal.trim()}' sudah ada.` });
    }

    const newData = await spbAsal.create({
      kode_spb: kode_spb.trim(),
      asal: asal.trim(),
    });

    await recordLog(req, {
      aksi: "CREATE",
      entitas: "pelabuhan",
      keterangan: `Menambah data SPB Asal "${kode_spb.trim()}" (${asal.trim()})`,
    });

    return res.status(200).json({ msg: "SPB Asal berhasil ditambahkan", data: newData });
  } catch (error) {
    console.error("STORE SPB ASAL ERROR:", error);
    return res.status(500).json({ msg: "Gagal menambahkan SPB Asal" });
  }
};

const updateSpbAsal = async (req, res) => {
  try {
    const { id } = req.params;
    const { kode_spb, asal } = req.body;

    const target = await spbAsal.findByPk(id);
    if (!target) return res.status(404).json({ msg: "Data SPB Asal tidak ditemukan." });

    const newKode = kode_spb !== undefined ? kode_spb.trim() : target.kode_spb;
    const newAsal = asal !== undefined ? asal.trim() : target.asal;

    if (!newKode) return res.status(400).json({ msg: "Kode SPB tidak boleh kosong." });
    if (!newAsal) return res.status(400).json({ msg: "Asal pelabuhan tidak boleh kosong." });

    if (newKode !== target.kode_spb || newAsal !== target.asal) {
      const existing = await spbAsal.findOne({
        where: {
          kode_spb: newKode,
          asal: newAsal,
          id_spb_asal: { [Op.ne]: id },
        },
      });
      if (existing) {
        return res.status(400).json({ msg: `Data SPB Asal '${newKode}' (${newAsal}) sudah terdaftar.` });
      }
    }

    await target.update({
      kode_spb: newKode,
      asal: newAsal,
    });

    await recordLog(req, {
      aksi: "UPDATE",
      entitas: "pelabuhan",
      keterangan: `Mengubah data SPB Asal (ID: ${id}) menjadi "${newKode}" (${newAsal})`,
    });

    return res.status(200).json({ msg: "SPB Asal berhasil diperbarui", data: target });
  } catch (error) {
    console.error("UPDATE SPB ASAL ERROR:", error);
    return res.status(500).json({ msg: "Gagal memperbarui SPB Asal" });
  }
};

const deleteSpbAsal = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await spbAsal.findByPk(id);
    if (!target) return res.status(404).json({ msg: "Data SPB Asal tidak ditemukan." });

    const oldKode = target.kode_spb;
    const oldAsal = target.asal;
    await target.destroy();

    await recordLog(req, {
      aksi: "DELETE",
      entitas: "pelabuhan",
      keterangan: `Menghapus data SPB Asal "${oldKode}" (${oldAsal})`,
    });

    return res.status(200).json({ msg: "SPB Asal berhasil dihapus" });
  } catch (error) {
    console.error("DELETE SPB ASAL ERROR:", error);
    return res.status(500).json({ msg: "Gagal menghapus SPB Asal" });
  }
};

module.exports = { getSpbAsal, getSpbAsalById, storeSpbAsal, updateSpbAsal, deleteSpbAsal };
