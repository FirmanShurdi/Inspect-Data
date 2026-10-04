const fs = require("fs");
const path = require("path");
const { manifest, kapal, nahkoda, agen, pelabuhan, spb, penumpang, penumpangAnak } = require("../model/association");
const { Op } = require("sequelize");
const { recordLog } = require("../helper/logHelper");

const formatManifestItem = (m) => {
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
    no_spb: plain.spb?.no_spb || plain.no_spb || "",
    no_spb_asal: plain.spb?.no_spb_asal || plain.no_spb_asal || "",
    total_penumpang: totalPassengers,
    count_pending: countPending,
    count_selesai: countSelesai,
    status_inspeksi,
  };
};

const getManifest = async (req, res) => {
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

    const rawDatas = await manifest.findAll({
      order: [["id_manifest", "DESC"]],
      where: whereClause,
      include: [
        { model: kapal, as: "kapal" },
        { model: nahkoda, as: "nahkoda" },
        { model: agen, as: "agen" },
        { model: spb, as: "spb" },
        { model: pelabuhan, as: "pelabuhan_asal" },
        { model: pelabuhan, as: "pelabuhan_sandar" },
        { model: pelabuhan, as: "pelabuhan_tolak" },
        { model: pelabuhan, as: "pelabuhan_tujuan" },
        { model: pelabuhan, as: "pelabuhan_singgah" },
        { model: penumpang, as: "penumpang_list" },
      ],
    });

    const datas = rawDatas.map(formatManifestItem);
    return res.status(200).json({ msg: "Berhasil mengambil data manifest", datas });
  } catch (error) {
    console.error("getManifest Error:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan pada server saat mengambil manifest" });
  }
};

const getManifestById = async (req, res) => {
  try {
    const { id } = req.params;
    const rawData = await manifest.findByPk(id, {
      include: [
        { model: kapal, as: "kapal" },
        { model: nahkoda, as: "nahkoda" },
        { model: agen, as: "agen" },
        { model: spb, as: "spb" },
        { model: pelabuhan, as: "pelabuhan_asal" },
        { model: pelabuhan, as: "pelabuhan_sandar" },
        { model: pelabuhan, as: "pelabuhan_tolak" },
        { model: pelabuhan, as: "pelabuhan_tujuan" },
        { model: pelabuhan, as: "pelabuhan_singgah" },
        { model: penumpang, as: "penumpang_list" },
      ],
    });
    if (!rawData) return res.status(404).json({ msg: "Data manifest tidak ditemukan" });

    const data = formatManifestItem(rawData);
    return res.status(200).json({ msg: "Berhasil mengambil detail manifest", data });
  } catch (error) {
    console.error("getManifestById Error:", error);
    return res.status(500).json({ msg: "Terjadi kesalahan saat mengambil detail manifest" });
  }
};

const storeManifest = async (req, res) => {
  try {
    const body = { ...req.body };
    const rawKapalId = body.id_kapal;
    const { no_spb, no_spb_asal } = body;

    // Normalisasi id_kapal menjadi tipe Integer murni
    const kapalIdNum =
      typeof rawKapalId === "object" && rawKapalId !== null
        ? Number(rawKapalId.id || rawKapalId.value)
        : Number(rawKapalId);

    if (!rawKapalId || isNaN(kapalIdNum) || kapalIdNum <= 0) {
      return res.status(400).json({ msg: "id_kapal wajib diisi dan harus berupa ID kapal yang valid" });
    }

    body.id_kapal = kapalIdNum;
    const todayStr = body.tanggal_clearance || new Date().toISOString().split("T")[0];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Cari manifest aktif kapal ini (yang memiliki tanggal hari ini atau dibuat hari ini)
    const existingManifest = await manifest.findOne({
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
      order: [["id_manifest", "DESC"]],
    });

    if (existingManifest) {
      console.log(`[STORE MANIFEST] Reusing existing active manifest ID ${existingManifest.id_manifest} for kapal ID ${kapalIdNum}`);
      return res.status(200).json({
        msg: "Menggunakan data manifest kapal aktif yang sudah ada",
        data: existingManifest,
        isExisting: true,
      });
    }

    // Handle SPB creation jika belum ada
    if (no_spb || no_spb_asal) {
      const spbRecord = await spb.create({
        no_spb: no_spb ? String(no_spb).trim() : null,
        no_spb_asal: no_spb_asal ? String(no_spb_asal).trim() : null,
      });
      body.id_spb = spbRecord.id_spb;
    }

    const newManifest = await manifest.create(body);
    console.log(`[STORE MANIFEST] Created NEW manifest ID ${newManifest.id_manifest} for kapal ID ${body.id_kapal}`);

    const kapalRecord = await kapal.findByPk(body.id_kapal);
    const namaKapal = kapalRecord?.nama_kapal || `ID: ${body.id_kapal}`;

    if (!req.body.is_auto_scan) {
      await recordLog(req, {
        aksi: "CREATE",
        entitas: "manifest",
        keterangan: `Menambah data manifest ${namaKapal}`,
      });
    }

    return res.status(200).json({ msg: "Berhasil menambahkan data manifest", data: newManifest, isExisting: false });
  } catch (error) {
    console.error("storeManifest Error:", error);
    return res.status(500).json({ msg: error.message || "Gagal menyimpan data manifest" });
  }
};

const updateManifest = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await manifest.findByPk(id, {
      include: [{ model: kapal, as: "kapal" }],
    });
    if (!target) return res.status(404).json({ msg: "Data manifest tidak ditemukan" });

    const body = { ...req.body };
    const { no_spb, no_spb_asal } = body;

    if (no_spb !== undefined || no_spb_asal !== undefined) {
      if (target.id_spb) {
        await spb.update(
          {
            no_spb: no_spb ? String(no_spb).trim() : undefined,
            no_spb_asal: no_spb_asal ? String(no_spb_asal).trim() : undefined,
          },
          { where: { id_spb: target.id_spb } }
        );
      } else {
        const newSpb = await spb.create({
          no_spb: no_spb ? String(no_spb).trim() : null,
          no_spb_asal: no_spb_asal ? String(no_spb_asal).trim() : null,
        });
        body.id_spb = newSpb.id_spb;
      }
    }

    await manifest.update(body, { where: { id_manifest: id } });

    const namaKapal = target.kapal?.nama_kapal || (target.id_kapal ? `ID: ${target.id_kapal}` : `ID: ${id}`);

    await recordLog(req, {
      aksi: "UPDATE",
      entitas: "manifest",
      keterangan: `Mengubah data manifest ${namaKapal}`,
    });

    return res.status(200).json({ msg: "Berhasil memperbarui data manifest" });
  } catch (error) {
    console.error("updateManifest Error:", error);
    return res.status(500).json({ msg: error.message || "Gagal memperbarui data manifest" });
  }
};

const deleteManifest = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await manifest.findByPk(id, {
      include: [{ model: kapal, as: "kapal" }],
    });
    if (!target) return res.status(404).json({ msg: "Data manifest tidak ditemukan" });

    const namaKapal = target.kapal?.nama_kapal || (target.id_kapal ? `ID: ${target.id_kapal}` : `ID: ${id}`);

    // 1. Ambil seluruh data penumpang (dewasa & anak) yang terikat ke manifest ini
    const listPenumpang = await penumpang.findAll({ where: { id_manifest: id } });
    const listAnak = await penumpangAnak.findAll({ where: { id_manifest: id } });

    // 2. Hapus file fisik foto KTP penumpang dewasa dari folder backend/public/images/inspeksi/ jika ada
    for (const p of listPenumpang) {
      if (p.foto_ktp) {
        const relativePath = p.foto_ktp.startsWith('/') ? p.foto_ktp.slice(1) : p.foto_ktp;
        const fullPath = path.join(__dirname, '..', 'public', relativePath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
            console.log(`[DELETE MANIFEST] Deleted adult passenger photo: ${fullPath}`);
          } catch (fileErr) {
            console.error(`[DELETE MANIFEST] Failed to delete photo ${fullPath}:`, fileErr);
          }
        }
      }
    }

    // 3. Hapus file fisik foto penumpang anak dari folder backend/public/images/inspeksi/ jika ada
    for (const a of listAnak) {
      if (a.foto) {
        const relativePath = a.foto.startsWith('/') ? a.foto.slice(1) : a.foto;
        const fullPath = path.join(__dirname, '..', 'public', relativePath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
            console.log(`[DELETE MANIFEST] Deleted child passenger photo: ${fullPath}`);
          } catch (fileErr) {
            console.error(`[DELETE MANIFEST] Failed to delete child photo ${fullPath}:`, fileErr);
          }
        }
      }
    }

    // 4. Hapus seluruh data anak & penumpang di database
    await penumpangAnak.destroy({ where: { id_manifest: id } });
    await penumpang.destroy({ where: { id_manifest: id } });

    // 5. Hapus data SPB jika terikat
    if (target.id_spb) {
      await spb.destroy({ where: { id_spb: target.id_spb } });
    }

    // 6. Hapus data manifest
    await manifest.destroy({ where: { id_manifest: id } });

    await recordLog(req, {
      aksi: "DELETE",
      entitas: "manifest",
      keterangan: `Menghapus data manifest ${namaKapal} serta data penumpang`,
    });

    return res.status(200).json({ msg: "Berhasil menghapus data manifest beserta seluruh data penumpang & foto terkait" });
  } catch (error) {
    console.error("deleteManifest Error:", error);
    return res.status(500).json({ msg: "Gagal menghapus data manifest" });
  }
};

const getTodayActiveKapalIds = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const activeManifests = await manifest.findAll({
      attributes: ["id_kapal"],
      where: {
        [Op.or]: [
          {
            createdAt: {
              [Op.gte]: todayStart,
              [Op.lte]: todayEnd,
            },
          },
          {
            tanggal_clearance: todayStr,
          },
        ],
      },
      raw: true,
    });

    const activeKapalIds = [...new Set(activeManifests.map((m) => String(m.id_kapal)).filter(Boolean))];
    return res.status(200).json({ msg: "Berhasil mengambil kapal aktif hari ini", activeKapalIds });
  } catch (error) {
    console.error("getTodayActiveKapalIds Error:", error);
    return res.status(200).json({ activeKapalIds: [] });
  }
};

module.exports = {
  getManifest,
  getManifestById,
  getTodayActiveKapalIds,
  storeManifest,
  updateManifest,
  deleteManifest,
};
