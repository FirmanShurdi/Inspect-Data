const fs = require("fs");
const path = require("path");
const { clearance, kapal, nahkoda, pelabuhan, penumpang, penumpangAnak } = require("../model/association");
const { Op } = require("sequelize");
const { recordLog } = require("../helper/logHelper");

const formatClearanceItem = (m) => {
  const plain = m.get ? m.get({ plain: true }) : m;
  const pList = plain.penumpang_list || plain.penumpang || [];
  const totalPassengers = pList.length;
  const countPending = pList.filter((p) => p.status_verifikasi === "pending").length;
  const countSelesai = pList.filter((p) => p.status_verifikasi === "selesai").length;

  let status_inspeksi = "-";
  if (totalPassengers > 0) {
    status_inspeksi = countPending > 0 ? "pending" : "selesai";
  }

  return {
    ...plain,
    id_manifest: plain.id_clearance, // backwards compatibility alias if needed
    total_penumpang: totalPassengers,
    count_pending: countPending,
    count_selesai: countSelesai,
    status_inspeksi,
  };
};

const getClearance = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const whereClause = search
      ? {
          [Op.or]: [
            { no_urut: { [Op.like]: `%${search}%` } },
            { status_pelayaran: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const rawDatas = await clearance.findAll({
      order: [["id_clearance", "DESC"]],
      where: whereClause,
      include: [
        { model: kapal, as: "kapal" },
        { model: nahkoda, as: "nahkoda" },
        { model: pelabuhan, as: "pelabuhan_asal" },
        { model: pelabuhan, as: "pelabuhan_sandar" },
        { model: pelabuhan, as: "pelabuhan_tolak" },
        { model: pelabuhan, as: "pelabuhan_tujuan" },
        { model: penumpang, as: "penumpang_list" },
      ],
    });

    const datas = rawDatas.map(formatClearanceItem);
    return res.status(200).json({ msg: "Berhasil mengambil data clearance", datas });
  } catch (error) {
    console.error("getClearance Error:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server saat mengambil clearance" });
  }
};

const getClearanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const rawData = await clearance.findByPk(id, {
      include: [
        { model: kapal, as: "kapal" },
        { model: nahkoda, as: "nahkoda" },
        { model: pelabuhan, as: "pelabuhan_asal" },
        { model: pelabuhan, as: "pelabuhan_sandar" },
        { model: pelabuhan, as: "pelabuhan_tolak" },
        {
          model: penumpang,
          as: "penumpang_list",
          include: [{ model: penumpangAnak, as: "anak_list" }],
        },
        {
          model: penumpangAnak,
          as: "penumpang_anak_list",
        },
      ],
    });
    if (!rawData) return res.status(404).json({ msg: "Data clearance tidak ditemukan" });

    const data = formatClearanceItem(rawData);
    return res.status(200).json({ msg: "Berhasil mengambil detail clearance", data });
  } catch (error) {
    console.error("getClearanceById Error:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan saat mengambil detail clearance" });
  }
};

const sanitizeClearanceBody = (body) => {
  const clean = { ...body };

  const intFields = [
    "id_nahkoda",
    "jumlah_crew",
    "id_kedudukan_kapal",
    "id_datang_dari",
    "id_sandar",
    "id_tolak",
    "id_tujuan_akhir",
  ];

  intFields.forEach((field) => {
    if (clean[field] === "" || clean[field] === undefined || clean[field] === null) {
      clean[field] = null;
    } else {
      const num = Number(clean[field]);
      clean[field] = isNaN(num) ? null : num;
    }
  });

  if (clean.cooldown_jam === "" || clean.cooldown_jam === undefined || clean.cooldown_jam === null) {
    clean.cooldown_jam = 20;
  } else {
    const cdNum = Number(clean.cooldown_jam);
    clean.cooldown_jam = isNaN(cdNum) || cdNum < 0 ? 20 : cdNum;
  }

  const dateFields = ["tanggal_clearance", "tanggal_datang", "tanggal_berangkat"];
  dateFields.forEach((field) => {
    if (!clean[field] || clean[field] === "") {
      clean[field] = null;
    }
  });

  const strFields = ["no_urut", "pukul_agen_clearance", "pukul_kapal_berangkat"];
  strFields.forEach((field) => {
    if (clean[field] === undefined || clean[field] === "") {
      clean[field] = null;
    }
  });

  return clean;
};

const storeClearance = async (req, res) => {
  try {
    const rawKapalId = req.body.id_kapal;

    const kapalIdNum =
      typeof rawKapalId === "object" && rawKapalId !== null
        ? Number(rawKapalId.id || rawKapalId.value)
        : Number(rawKapalId);

    if (!rawKapalId || isNaN(kapalIdNum) || kapalIdNum <= 0) {
      return res.status(400).json({ msg: "id_kapal wajib diisi dan harus berupa ID kapal yang valid" });
    }

    const body = sanitizeClearanceBody(req.body);
    body.id_kapal = kapalIdNum;

    const todayStr = body.tanggal_clearance || new Date().toISOString().split("T")[0];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingClearance = await clearance.findOne({
      where: {
        id_kapal: kapalIdNum,
        [Op.or]: [
          { tanggal_clearance: todayStr },
          {
            createdAt: {
              [Op.gte]: todayStart,
              [Op.lte]: todayEnd,
            },
          },
        ],
      },
      order: [["id_clearance", "DESC"]],
    });

    if (existingClearance) {
      if (req.body.is_auto_scan) {
        console.log(`[STORE CLEARANCE] Reusing existing active clearance ID ${existingClearance.id_clearance} for auto scan`);
        return res.status(200).json({
          msg: "Menggunakan data clearance kapal aktif yang sudah ada",
          data: existingClearance,
          isExisting: true,
        });
      }

      await clearance.update(body, { where: { id_clearance: existingClearance.id_clearance } });
      const updatedClearance = await clearance.findByPk(existingClearance.id_clearance);

      const kapalRecord = await kapal.findByPk(body.id_kapal);
      const namaKapal = kapalRecord?.nama_kapal || `ID: ${body.id_kapal}`;
      await recordLog(req, {
        aksi: "UPDATE",
        entitas: "clearance",
        keterangan: `Memperbarui data clearance ${namaKapal} (ID: ${existingClearance.id_clearance})`,
      });

      return res.status(200).json({
        msg: "Berhasil memperbarui data clearance kapal aktif",
        data: updatedClearance,
        isExisting: true,
      });
    }

    const newClearance = await clearance.create(body);
    console.log(`[STORE CLEARANCE] Created NEW clearance ID ${newClearance.id_clearance} for kapal ID ${body.id_kapal}`);

    const kapalRecord = await kapal.findByPk(body.id_kapal);
    const namaKapal = kapalRecord?.nama_kapal || `ID: ${body.id_kapal}`;

    if (!req.body.is_auto_scan) {
      await recordLog(req, {
        aksi: "CREATE",
        entitas: "clearance",
        keterangan: `Menambah data clearance ${namaKapal}`,
      });
    }

    return res.status(200).json({ msg: "Berhasil menambahkan data clearance", data: newClearance, isExisting: false });
  } catch (error) {
    console.error("storeClearance Error:", error);
    return res.status(500).json({ msg: error.message || "Gagal menyimpan data clearance" });
  }
};

const updateClearance = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await clearance.findByPk(id, {
      include: [{ model: kapal, as: "kapal" }],
    });
    if (!target) return res.status(404).json({ msg: "Data clearance tidak ditemukan" });

    const body = sanitizeClearanceBody(req.body);

    await clearance.update(body, { where: { id_clearance: id } });

    const namaKapal = target.kapal?.nama_kapal || (target.id_kapal ? `ID: ${target.id_kapal}` : `ID: ${id}`);

    await recordLog(req, {
      aksi: "UPDATE",
      entitas: "clearance",
      keterangan: `Mengubah data clearance ${namaKapal}`,
    });

    return res.status(200).json({ msg: "Berhasil memperbarui data clearance" });
  } catch (error) {
    console.error("updateClearance Error:", error);
    return res.status(500).json({ msg: error.message || "Gagal memperbarui data clearance" });
  }
};

const deleteClearance = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await clearance.findByPk(id, {
      include: [{ model: kapal, as: "kapal" }],
    });
    if (!target) return res.status(404).json({ msg: "Data clearance tidak ditemukan" });

    const namaKapal = target.kapal?.nama_kapal || (target.id_kapal ? `ID: ${target.id_kapal}` : `ID: ${id}`);

    const listPenumpang = await penumpang.findAll({ where: { id_clearance: id } });
    const listAnak = await penumpangAnak.findAll({ where: { id_clearance: id } });

    for (const p of listPenumpang) {
      if (p.foto_ktp) {
        const relativePath = p.foto_ktp.startsWith('/') ? p.foto_ktp.slice(1) : p.foto_ktp;
        const fullPath = path.join(__dirname, '..', 'public', relativePath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (fileErr) {
            console.error(`[DELETE CLEARANCE] Failed to delete photo ${fullPath}:`, fileErr);
          }
        }
      }
    }

    for (const a of listAnak) {
      if (a.foto) {
        const relativePath = a.foto.startsWith('/') ? a.foto.slice(1) : a.foto;
        const fullPath = path.join(__dirname, '..', 'public', relativePath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (fileErr) {
            console.error(`[DELETE CLEARANCE] Failed to delete child photo ${fullPath}:`, fileErr);
          }
        }
      }
    }

    await penumpangAnak.destroy({ where: { id_clearance: id } });
    await penumpang.destroy({ where: { id_clearance: id } });
    await clearance.destroy({ where: { id_clearance: id } });

    await recordLog(req, {
      aksi: "DELETE",
      entitas: "clearance",
      keterangan: `Menghapus data clearance ${namaKapal} serta data penumpang`,
    });

    return res.status(200).json({ msg: "Berhasil menghapus data clearance beserta seluruh data penumpang & foto terkait" });
  } catch (error) {
    console.error("deleteClearance Error:", error);
    return res.status(500).json({ msg: "Gagal menghapus data clearance" });
  }
};

const getTodayActiveKapalIds = async (req, res) => {
  try {
    const activeClearances = await clearance.findAll({
      attributes: ["id_clearance", "id_kapal", "tanggal_clearance"],
      order: [["id_clearance", "DESC"]],
      raw: true,
    });

    const activeKapalIds = [];
    const kapalClearanceMap = {};
    const seenKapal = new Set();

    for (const c of activeClearances) {
      if (!c.id_kapal) continue;
      const kIdStr = String(c.id_kapal);
      if (!seenKapal.has(kIdStr)) {
        seenKapal.add(kIdStr);
        activeKapalIds.push(kIdStr);
        kapalClearanceMap[kIdStr] = c.id_clearance;
      }
    }

    return res.status(200).json({
      msg: "Berhasil mengambil kapal aktif",
      activeKapalIds,
      kapalClearanceMap,
    });
  } catch (error) {
    console.error("getTodayActiveKapalIds Error:", error);
    return res.status(200).json({ activeKapalIds: [], kapalClearanceMap: {} });
  }
};

const getClearanceByKapal = async (req, res) => {
  try {
    const { id_kapal } = req.params;
    const target = await clearance.findOne({
      where: { id_kapal },
      order: [["id_clearance", "DESC"]],
      include: [
        { model: kapal, as: "kapal" },
        { model: nahkoda, as: "nahkoda" },
        { model: pelabuhan, as: "pelabuhan_asal" },
        { model: pelabuhan, as: "pelabuhan_sandar" },
        { model: pelabuhan, as: "pelabuhan_tolak" },
        { model: pelabuhan, as: "pelabuhan_tujuan" },
        { model: penumpang, as: "penumpang_list" },
      ],
    });
    if (!target) return res.status(404).json({ msg: "Data clearance kapal tidak ditemukan" });

    const data = formatClearanceItem(target);
    return res.status(200).json({ msg: "Berhasil mengambil clearance kapal", data });
  } catch (error) {
    console.error("getClearanceByKapal Error:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan saat mengambil clearance kapal" });
  }
};

module.exports = {
  getClearance,
  getClearanceById,
  getClearanceByKapal,
  getTodayActiveKapalIds,
  storeClearance,
  updateClearance,
  deleteClearance,
  // Backwards compatibility aliases
  getManifest: getClearance,
  getManifestById: getClearanceById,
  getManifestByKapal: getClearanceByKapal,
  storeManifest: storeClearance,
  updateManifest: updateClearance,
  deleteManifest: deleteClearance,
};
