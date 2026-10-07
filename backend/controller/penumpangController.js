const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const { penumpang, penumpangAnak, manifest, kapal } = require("../model/association");
const { recordLog } = require("../helper/logHelper");

// Helper to safely normalize SQL date strings (converts DD-MM-YYYY to YYYY-MM-DD or cleans bad years)
const normalizeSqlDate = (val) => {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  // Case 1: Standard YYYY-MM-DD (e.g. 2023-08-17)
  const yyyymmdd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (yyyymmdd) {
    const y = parseInt(yyyymmdd[1], 10);
    const m = String(parseInt(yyyymmdd[2], 10)).padStart(2, "0");
    const d = String(parseInt(yyyymmdd[3], 10)).padStart(2, "0");
    if (y >= 1900 && y <= 2100 && parseInt(m) >= 1 && parseInt(m) <= 12 && parseInt(d) >= 1 && parseInt(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  // Case 2: Indonesian DD-MM-YYYY (e.g. 17-08-2023 or 17/08/2023)
  const ddmmyyyy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ddmmyyyy) {
    const d = String(parseInt(ddmmyyyy[1], 10)).padStart(2, "0");
    const m = String(parseInt(ddmmyyyy[2], 10)).padStart(2, "0");
    const y = parseInt(ddmmyyyy[3], 10);
    if (y >= 1900 && y <= 2100 && parseInt(m) >= 1 && parseInt(m) <= 12 && parseInt(d) >= 1 && parseInt(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  return null;
};

// Helper to safely normalize gender strings without truncation errors
const normalizeJenisKelamin = (val) => {
  if (!val) return null;
  const str = String(val).trim().toUpperCase();
  if (str.includes("LAK") || str === "L" || str === "MALE") return "L";
  if (str.includes("PEREM") || str === "P" || str === "FEMALE") return "P";
  return str.slice(0, 20);
};

// Helper to normalize child gender to 'LAKI-LAKI' or 'PEREMPUAN'
const normalizeChildGender = (val) => {
  if (!val) return "LAKI-LAKI";
  const str = String(val).trim().toUpperCase();
  if (str.includes("PEREM") || str === "P" || str === "FEMALE") return "PEREMPUAN";
  return "LAKI-LAKI";
};

// Helper: Save Base64 image to /images/inspeksi/ with DD-MM-YY-timestamp-random.jpg format
const saveBase64Image = (fotoInput) => {
  if (!fotoInput || typeof fotoInput !== "string") return null;
  if (!fotoInput.startsWith("data:image/")) return fotoInput;

  try {
    const dir = path.join(__dirname, "..", "public", "images", "inspeksi");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const datePrefix = `${dd}-${mm}-${yy}`;
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    const fileName = `${datePrefix}-${timestamp}-${random}.jpg`;
    const fullFilePath = path.join(dir, fileName);

    const base64Data = fotoInput.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(fullFilePath, Buffer.from(base64Data, "base64"));
    return `/images/inspeksi/${fileName}`;
  } catch (err) {
    console.error("Error saveBase64Image:", err);
    return null;
  }
};

// Helper: Safely delete physical image file from disk (/public/images/inspeksi/)
const deleteImageFile = (filePath) => {
  if (!filePath || typeof filePath !== "string") return;
  const cleanPath = filePath.replace(/^[\/\\]+/, "");
  if (!cleanPath.startsWith("images/inspeksi/")) return;

  try {
    const fullPath = path.join(__dirname, "..", "public", cleanPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`[DELETE PHOTO] Successfully unlinked physical image: ${fullPath}`);
    }
  } catch (err) {
    console.error(`[DELETE PHOTO] Failed to unlink image ${filePath}:`, err);
  }
};

// Upload KTP image to public/images/inspeksi/ formatted DD-MM-YY and immediately insert penumpang DB record
const uploadScanPenumpang = async (req, res) => {
  try {
    let { id_manifest, foto_base64, nik, nama_penumpang, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat } = req.body;

    if (!id_manifest) {
      return res.status(400).json({ status: false, message: "id_manifest wajib diisi" });
    }

    // Verifikasi ketersediaan manifest di database
    let targetManifest = await manifest.findByPk(id_manifest);
    if (!targetManifest) {
      console.warn(`[UPLOAD SCAN] Manifest ID ${id_manifest} tidak ditemukan di DB. Mencari manifest aktif hari ini...`);
      const todayStr = new Date().toISOString().split("T")[0];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      targetManifest = await manifest.findOne({
        where: {
          [Op.or]: [
            { tanggal_clearance: todayStr },
            { createdAt: { [Op.gte]: todayStart, [Op.lte]: todayEnd } }
          ]
        },
        order: [["id_manifest", "DESC"]]
      });

      if (targetManifest) {
        id_manifest = targetManifest.id_manifest;
      } else {
        return res.status(404).json({
          status: false,
          message: "Manifest tidak ditemukan di database. Harap pilih kapal kembali."
        });
      }
    }

    // Pengecekan Keamanan Ganda (Anti-Duplikasi Kapal & Masa Tenggang 12 Jam)
    let duplicateWarningMsg = null;
    let isDuplicate = false;
    let isSameManifest = false;
    let is12Hours = false;

    const cleanNik = nik ? String(nik).trim() : null;
    if (cleanNik && cleanNik !== "") {
      // 1. Cek Duplikasi pada Manifest Kapal yang Sama
      const existInManifest = await penumpang.findOne({
        where: { id_manifest, nik: cleanNik }
      });
      if (existInManifest) {
        isDuplicate = true;
        isSameManifest = true;
        duplicateWarningMsg = `❌ KTP dengan NIK ${cleanNik} sudah terdaftar pada manifest kapal ini!`;
      } else {
        // 2. Cek Masa Tenggang 12 Jam Global di Seluruh Kapal
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const exist12Hours = await penumpang.findOne({
          where: {
            nik: cleanNik,
            createdAt: { [Op.gte]: twelveHoursAgo }
          },
          include: [{
            model: manifest,
            as: "manifest",
            include: [{ model: kapal, as: "kapal" }]
          }],
          order: [["id_penumpang", "DESC"]]
        });

        if (exist12Hours) {
          const kapalNama = exist12Hours.manifest?.kapal?.nama_kapal || "Kapal Lain";
          const diffMinutes = Math.round((Date.now() - new Date(exist12Hours.createdAt).getTime()) / (1000 * 60));
          const hoursAgo = Math.floor(diffMinutes / 60);
          const minsAgo = diffMinutes % 60;
          const timeStr = hoursAgo > 0 ? `${hoursAgo} jam ${minsAgo} menit` : `${minsAgo} menit`;
          isDuplicate = true;
          is12Hours = true;
          duplicateWarningMsg = `🔴 PERINGATAN KTP DUPLIKAT: NIK ${cleanNik} sudah terdaftar ${timeStr} lalu pada Kapal ${kapalNama}! (Masa Tenggang 12 Jam)`;
        }
      }
    }

    let foto_ktp_path = null;

    if (foto_base64) {
      const dir = path.join(__dirname, "..", "public", "images", "inspeksi");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Date format: DD-MM-YY (e.g. 30-09-26)
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      const datePrefix = `${dd}-${mm}-${yy}`;
      const timestamp = Date.now();
      const random = Math.floor(1000 + Math.random() * 9000);
      const fileName = `${datePrefix}-${timestamp}-${random}.jpg`;
      const fullFilePath = path.join(dir, fileName);

      // Extract base64 image data
      const base64Data = foto_base64.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(fullFilePath, Buffer.from(base64Data, "base64"));

      foto_ktp_path = `/images/inspeksi/${fileName}`;
    }

    // Immediately insert into penumpang table in database with status 'pending'
    const newRecord = await penumpang.create({
      id_manifest,
      nik: cleanNik,
      nama_penumpang: nama_penumpang ? String(nama_penumpang).trim() : null,
      tempat_lahir: tempat_lahir ? String(tempat_lahir).trim() : null,
      tanggal_lahir: tanggal_lahir || null,
      jenis_kelamin: normalizeJenisKelamin(jenis_kelamin),
      alamat: alamat ? String(alamat).trim() : null,
      foto_ktp: foto_ktp_path,
      tipe_penumpang: "naik",
      status_verifikasi: "pending",
      status: duplicateWarningMsg,
    });

    try {
      const manifestTarget = await manifest.findByPk(id_manifest, {
        include: [{ model: kapal, as: "kapal" }],
      });
      const namaKapal = manifestTarget?.kapal?.nama_kapal || "Kapal";
      const passengerCount = await penumpang.count({ where: { id_manifest } });
      const isFirstPassenger = passengerCount === 1;
      const isNamed = nama_penumpang && String(nama_penumpang).trim() !== "";
      const pName = isNamed ? String(nama_penumpang).trim() : "Hasil Scan KTP";

      await recordLog(req, {
        aksi: "CREATE",
        entitas: isFirstPassenger ? "manifest" : "penumpang",
        keterangan: isFirstPassenger
          ? `Menambah data manifest ${namaKapal} serta penumpang "${pName}"`
          : `Menambah data penumpang "${pName}" pada manifest ${namaKapal}`,
      });
    } catch (logErr) {
      console.error("Error recordLog in uploadScanPenumpang:", logErr);
    }

    return res.status(isDuplicate ? 409 : 201).json({
      status: true,
      isDuplicate,
      isSameManifest,
      is12Hours,
      message: duplicateWarningMsg || "Berhasil menyimpan foto scan & data penumpang ke database",
      data: newRecord,
    });
  } catch (error) {
    console.error("Error uploadScanPenumpang:", error);
    return res.status(500).json({
      status: false,
      message: "Gagal menyimpan upload scan penumpang: " + error.message,
    });
  }
};

// Get all passengers by id_manifest with summary count & associated child list
const getPenumpangByManifest = async (req, res) => {
  try {
    const { id_manifest } = req.params;
    
    // 1. Fetch adult / parent passengers from penumpang table
    const list = await penumpang.findAll({
      where: { id_manifest },
      order: [["id_penumpang", "ASC"]],
      include: [
        {
          model: penumpangAnak,
          as: "anak_list",
          required: false,
        },
      ],
    });

    // Auto-migrate any children wrongly saved in penumpang table to penumpang_anak
    const cleanedAdults = [];
    for (const item of list) {
      const p = item.toJSON();
      const birthYear = p.tanggal_lahir ? new Date(p.tanggal_lahir).getFullYear() : null;
      const isChildByAge = birthYear && !isNaN(birthYear) && (new Date().getFullYear() - birthYear) < 12;
      const isChildEntry = p.kategori_penumpang === "Anak" || (isChildByAge && !p.nik);

      if (isChildEntry) {
        await penumpangAnak.create({
          id_manifest: p.id_manifest,
          id_penumpang: null,
          nama_anak: p.nama_penumpang || "Anak",
          tanggal_lahir: p.tanggal_lahir,
          jenis_kelamin: normalizeChildGender(p.jenis_kelamin),
        });
        await penumpang.destroy({ where: { id_penumpang: p.id_penumpang } });
      } else {
        cleanedAdults.push(p);
      }
    }

    // 2. Fetch standalone children from penumpang_anak table where id_penumpang IS NULL
    const standaloneChildren = await penumpangAnak.findAll({
      where: {
        id_manifest,
        id_penumpang: null,
      },
      order: [["id_anak", "ASC"]],
    });

    // Format standalone children to match passenger object structure
    const formattedChildren = standaloneChildren.map((c) => ({
      id_penumpang: `anak_${c.id_anak}`,
      id_anak: c.id_anak,
      id_manifest: c.id_manifest,
      nik: "",
      nama_penumpang: c.nama_anak,
      nama: c.nama_anak,
      tempat_lahir: "",
      tanggal_lahir: c.tanggal_lahir,
      jenis_kelamin: c.jenis_kelamin || "LAKI-LAKI",
      alamat: c.alamat || "",
      foto: c.foto || null,
      foto_ktp: c.foto || null,
      tipe_penumpang: "naik",
      status_verifikasi: "selesai",
      kategori_penumpang: "Anak",
      is_anak_only: true,
      anak_list: [],
    }));

    const combinedList = [...cleanedAdults, ...formattedChildren];

    const total = combinedList.length;
    const countPending = combinedList.filter((p) => p.status_verifikasi === "pending").length;
    const countSelesai = combinedList.filter((p) => p.status_verifikasi === "selesai").length;

    return res.status(200).json({
      status: true,
      message: "Berhasil mengambil data penumpang",
      summary: {
        total,
        pending: countPending,
        selesai: countSelesai,
      },
      data: combinedList,
    });
  } catch (error) {
    console.error("Error getPenumpangByManifest:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan server: " + error.message,
    });
  }
};

// Get single passenger detail with associated child list
const getPenumpangById = async (req, res) => {
  try {
    const { id } = req.params;

    if (String(id).startsWith("anak_")) {
      const id_anak = String(id).replace("anak_", "");
      const childData = await penumpangAnak.findByPk(id_anak);
      if (childData) {
        return res.status(200).json({
          status: true,
          data: {
            id_penumpang: `anak_${childData.id_anak}`,
            id_anak: childData.id_anak,
            id_manifest: childData.id_manifest,
            nik: "",
            nama_penumpang: childData.nama_anak,
            nama: childData.nama_anak,
            tempat_lahir: "",
            tanggal_lahir: childData.tanggal_lahir,
            jenis_kelamin: childData.jenis_kelamin || "LAKI-LAKI",
            alamat: childData.alamat || "",
            foto: childData.foto || null,
            foto_ktp: childData.foto || null,
            tipe_penumpang: "naik",
            status_verifikasi: "selesai",
            kategori_penumpang: "Anak",
            is_anak_only: true,
            anak_list: [],
          },
        });
      }
    }

    const data = await penumpang.findByPk(id, {
      include: [
        {
          model: penumpangAnak,
          as: "anak_list",
          required: false,
        },
      ],
    });

    if (!data) {
      return res.status(404).json({
        status: false,
        message: "Data penumpang tidak ditemukan",
      });
    }

    return res.status(200).json({
      status: true,
      data,
    });
  } catch (error) {
    console.error("Error getPenumpangById:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan server: " + error.message,
    });
  }
};

// Create new passenger record (from AI Scan or Manual Entry)
const createPenumpang = async (req, res) => {
  try {
    const {
      id_manifest,
      nik,
      nama_penumpang,
      tempat_lahir,
      tanggal_lahir,
      jenis_kelamin,
      alamat,
      foto_ktp,
      tipe_penumpang,
      status_verifikasi,
      kategori_penumpang,
      is_anak_only,
      bawa_anak,
      anakList,
      nama_anak,
      tanggal_lahir_anak,
      jenis_kelamin_anak,
    } = req.body;

    if (!id_manifest) {
      return res.status(400).json({
        status: false,
        message: "id_manifest wajib diisi",
      });
    }

    const birthYear = tanggal_lahir ? new Date(normalizeSqlDate(tanggal_lahir) || tanggal_lahir).getFullYear() : null;
    const isChildByAge = birthYear && !isNaN(birthYear) && (new Date().getFullYear() - birthYear) < 12;

    const isStandaloneChild = Boolean(
      is_anak_only ||
      kategori_penumpang === "Anak" ||
      (isChildByAge && (!nik || String(nik).trim() === ""))
    );

    if (isStandaloneChild) {
      const childPhotoPath = saveBase64Image(foto_ktp || req.body.foto_base64 || req.body.foto);

      // Store directly in penumpang_anak table with id_penumpang = NULL
      const newChild = await penumpangAnak.create({
        id_manifest,
        id_penumpang: null,
        nama_anak: nama_penumpang ? String(nama_penumpang).trim() : (nama_anak ? String(nama_anak).trim() : "Anak"),
        tanggal_lahir: normalizeSqlDate(tanggal_lahir || tanggal_lahir_anak),
        jenis_kelamin: normalizeChildGender(jenis_kelamin || jenis_kelamin_anak),
        alamat: alamat ? String(alamat).trim() : null,
        foto: childPhotoPath,
      });

      try {
        const manifestTarget = await manifest.findByPk(id_manifest, {
          include: [{ model: kapal, as: "kapal" }],
        });
        const namaKapal = manifestTarget?.kapal?.nama_kapal || "Kapal";
        const cName = newChild.nama_anak ? ` "${newChild.nama_anak}"` : "";
        await recordLog(req, {
          aksi: "CREATE",
          entitas: "penumpang",
          keterangan: `Menambah data penumpang anak${cName} pada manifest kapal ${namaKapal}`,
        });
      } catch (logErr) {
        console.error("Error recordLog in createStandaloneChild:", logErr);
      }

      const childResponse = {
        id_penumpang: `anak_${newChild.id_anak}`,
        id_anak: newChild.id_anak,
        id_manifest: newChild.id_manifest,
        nik: "",
        nama_penumpang: newChild.nama_anak,
        nama: newChild.nama_anak,
        tempat_lahir: "",
        tanggal_lahir: newChild.tanggal_lahir,
        jenis_kelamin: newChild.jenis_kelamin,
        alamat: newChild.alamat || "",
        foto: newChild.foto || null,
        foto_ktp: newChild.foto || null,
        tipe_penumpang: "naik",
        status_verifikasi: "selesai",
        kategori_penumpang: "Anak",
        is_anak_only: true,
        anak_list: [],
      };

      return res.status(201).json({
        status: true,
        message: "Berhasil menambahkan data penumpang anak",
        data: childResponse,
      });
    }

    // Pengecekan NIK Duplikat Kapal & 12 Jam untuk Penumpang Dewasa
    let duplicateWarningMsg = null;
    let isDuplicate = false;
    let isSameManifest = false;
    let is12Hours = false;

    const cleanAdultNik = nik ? String(nik).trim() : null;
    if (cleanAdultNik && cleanAdultNik !== "") {
      const existInManifest = await penumpang.findOne({
        where: { id_manifest, nik: cleanAdultNik }
      });
      if (existInManifest) {
        isDuplicate = true;
        isSameManifest = true;
        duplicateWarningMsg = `❌ KTP dengan NIK ${cleanAdultNik} sudah terdaftar pada manifest kapal ini!`;
      } else {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const exist12Hours = await penumpang.findOne({
          where: {
            nik: cleanAdultNik,
            createdAt: { [Op.gte]: twelveHoursAgo }
          },
          include: [{
            model: manifest,
            as: "manifest",
            include: [{ model: kapal, as: "kapal" }]
          }],
          order: [["id_penumpang", "DESC"]]
        });

        if (exist12Hours) {
          const kapalNama = exist12Hours.manifest?.kapal?.nama_kapal || "Kapal Lain";
          const diffMinutes = Math.round((Date.now() - new Date(exist12Hours.createdAt).getTime()) / (1000 * 60));
          const hoursAgo = Math.floor(diffMinutes / 60);
          const minsAgo = diffMinutes % 60;
          const timeStr = hoursAgo > 0 ? `${hoursAgo} jam ${minsAgo} menit` : `${minsAgo} menit`;
          isDuplicate = true;
          is12Hours = true;
          duplicateWarningMsg = `🔴 PERINGATAN KTP DUPLIKAT: NIK ${cleanAdultNik} sudah terdaftar ${timeStr} lalu pada Kapal ${kapalNama}! (Masa Tenggang 12 Jam)`;
        }
      }
    }

    const newPenumpang = await penumpang.create({
      id_manifest,
      nik: cleanAdultNik,
      nama_penumpang: nama_penumpang ? String(nama_penumpang).trim() : null,
      tempat_lahir: tempat_lahir ? String(tempat_lahir).trim() : null,
      tanggal_lahir: normalizeSqlDate(tanggal_lahir) || tanggal_lahir || null,
      jenis_kelamin: normalizeJenisKelamin(jenis_kelamin),
      alamat: alamat ? String(alamat).trim() : null,
      foto_ktp: foto_ktp || null,
      tipe_penumpang: tipe_penumpang || "naik",
      status_verifikasi: status_verifikasi || "pending",
      kategori_penumpang: kategori_penumpang || "Dewasa",
      status: duplicateWarningMsg,
    });

    // If adult passenger brings child, record in penumpang_anak table with id_penumpang
    const isBawaAnak = bawa_anak || Boolean(nama_anak) || (Array.isArray(anakList) && anakList.length > 0);
    if (isBawaAnak) {
      if (Array.isArray(anakList) && anakList.length > 0) {
        const childRecords = anakList
          .filter((item) => item && item.namaAnak && String(item.namaAnak).trim() !== "")
          .map((item) => ({
            id_manifest: newPenumpang.id_manifest,
            id_penumpang: newPenumpang.id_penumpang,
            nama_anak: String(item.namaAnak).trim(),
            tanggal_lahir: normalizeSqlDate(item.tanggalLahirAnak),
            jenis_kelamin: normalizeChildGender(item.jenisKelaminAnak),
          }));

        if (childRecords.length > 0) {
          await penumpangAnak.bulkCreate(childRecords);
        }
      } else if (nama_anak && String(nama_anak).trim() !== "") {
        await penumpangAnak.create({
          id_manifest: newPenumpang.id_manifest,
          id_penumpang: newPenumpang.id_penumpang,
          nama_anak: String(nama_anak).trim(),
          tanggal_lahir: normalizeSqlDate(tanggal_lahir_anak),
          jenis_kelamin: normalizeChildGender(jenis_kelamin_anak),
        });
      }
    }

    // Return complete passenger data with associated child_list
    const createdWithAnak = await penumpang.findByPk(newPenumpang.id_penumpang, {
      include: [{ model: penumpangAnak, as: "anak_list", required: false }],
    });

    try {
      const manifestTarget = await manifest.findByPk(id_manifest, {
        include: [{ model: kapal, as: "kapal" }],
      });
      const namaKapal = manifestTarget?.kapal?.nama_kapal || "Kapal";
      const passengerCount = await penumpang.count({ where: { id_manifest } });
      const isFirstPassenger = passengerCount === 1;
      const pName = newPenumpang.nama_penumpang || "Penumpang";

      await recordLog(req, {
        aksi: "CREATE",
        entitas: isFirstPassenger ? "manifest" : "penumpang",
        keterangan: isFirstPassenger
          ? `Menambah data manifest ${namaKapal} serta penumpang "${pName}"`
          : `Menambah data penumpang "${pName}" pada manifest ${namaKapal}`,
      });
    } catch (logErr) {
      console.error("Error recordLog in createPenumpang:", logErr);
    }

    return res.status(isDuplicate ? 409 : 201).json({
      status: true,
      isDuplicate,
      isSameManifest,
      is12Hours,
      message: duplicateWarningMsg || "Berhasil menambahkan data penumpang",
      data: createdWithAnak || newPenumpang,
    });
  } catch (error) {
    console.error("Error createPenumpang:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan server: " + error.message,
    });
  }
};

// Update passenger data & status_verifikasi ('pending' -> 'selesai') + Sync penumpang_anak records
const updatePenumpang = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if updating a standalone child passenger
    if (String(id).startsWith("anak_") || req.body.is_anak_only || req.body.id_anak) {
      const id_anak = req.body.id_anak || String(id).replace("anak_", "");
      const childTarget = await penumpangAnak.findByPk(id_anak);
      if (childTarget) {
        const rawNewPhoto = req.body.foto_ktp || req.body.foto_base64 || req.body.foto;
        let childPhotoPath = childTarget.foto;

        if (rawNewPhoto && rawNewPhoto.startsWith("data:image/")) {
          const savedPath = saveBase64Image(rawNewPhoto);
          if (savedPath) {
            if (childTarget.foto && savedPath !== childTarget.foto) {
              deleteImageFile(childTarget.foto);
            }
            childPhotoPath = savedPath;
          }
        }

        await childTarget.update({
          nama_anak: req.body.nama_penumpang ? String(req.body.nama_penumpang).trim() : childTarget.nama_anak,
          tanggal_lahir: normalizeSqlDate(req.body.tanggal_lahir) || childTarget.tanggal_lahir,
          jenis_kelamin: normalizeChildGender(req.body.jenis_kelamin) || childTarget.jenis_kelamin,
          alamat: req.body.alamat !== undefined ? (req.body.alamat ? String(req.body.alamat).trim() : null) : childTarget.alamat,
          foto: childPhotoPath,
        });

        const updatedChild = {
          id_penumpang: `anak_${childTarget.id_anak}`,
          id_anak: childTarget.id_anak,
          id_manifest: childTarget.id_manifest,
          nik: "",
          nama_penumpang: childTarget.nama_anak,
          nama: childTarget.nama_anak,
          tempat_lahir: "",
          tanggal_lahir: childTarget.tanggal_lahir,
          jenis_kelamin: childTarget.jenis_kelamin,
          alamat: childTarget.alamat || "",
          foto: childTarget.foto || null,
          foto_ktp: childTarget.foto || null,
          tipe_penumpang: "naik",
          status_verifikasi: "selesai",
          kategori_penumpang: "Anak",
          is_anak_only: true,
          anak_list: [],
        };

        try {
          const mTarget = await manifest.findByPk(childTarget.id_manifest, {
            include: [{ model: kapal, as: "kapal" }],
          });
          const namaKapal = mTarget?.kapal?.nama_kapal || "Kapal";
          await recordLog(req, {
            aksi: "VERIFIKASI",
            entitas: "penumpang",
            keterangan: `Memverifikasi penumpang "${childTarget.nama_anak}" pada manifest ${namaKapal}`,
          });
        } catch (logErr) {
          console.error("Error recordLog in child updatePenumpang:", logErr);
        }

        return res.status(200).json({
          status: true,
          message: "Berhasil mengupdate data penumpang anak",
          data: updatedChild,
        });
      }
    }

    const target = await penumpang.findByPk(id);

    if (!target) {
      return res.status(404).json({
        status: false,
        message: "Data penumpang tidak ditemukan",
      });
    }

    const {
      nik,
      nama_penumpang,
      tempat_lahir,
      tanggal_lahir,
      jenis_kelamin,
      alamat,
      foto_ktp,
      tipe_penumpang,
      status_verifikasi,
      kategori_penumpang,
      is_anak_only,
      bawa_anak,
      bawaAnak,
      anakList,
      nama_anak,
      tanggal_lahir_anak,
      jenis_kelamin_anak,
    } = req.body;

    const checkDate = tanggal_lahir || target.tanggal_lahir;
    const bYear = checkDate ? new Date(normalizeSqlDate(checkDate) || checkDate).getFullYear() : null;
    const isChildByAge = bYear && !isNaN(bYear) && (new Date().getFullYear() - bYear) < 12;

    const isStandaloneChild = Boolean(
      is_anak_only ||
      kategori_penumpang === "Anak" ||
      (isChildByAge && (!nik || String(nik).trim() === ""))
    );

    if (isStandaloneChild) {
      const childPhotoPath = saveBase64Image(foto_ktp || req.body.foto_base64 || req.body.foto || target.foto_ktp);

      const newChild = await penumpangAnak.create({
        id_manifest: target.id_manifest,
        id_penumpang: null,
        nama_anak: nama_penumpang ? String(nama_penumpang).trim() : (target.nama_penumpang || "Anak"),
        tanggal_lahir: normalizeSqlDate(tanggal_lahir || target.tanggal_lahir),
        jenis_kelamin: normalizeChildGender(jenis_kelamin || target.jenis_kelamin),
        alamat: alamat ? String(alamat).trim() : (target.alamat ? String(target.alamat).trim() : null),
        foto: childPhotoPath,
      });

      await target.destroy();

      try {
        const mTarget = await manifest.findByPk(target.id_manifest, {
          include: [{ model: kapal, as: "kapal" }],
        });
        const namaKapal = mTarget?.kapal?.nama_kapal || "Kapal";
        await recordLog(req, {
          aksi: "VERIFIKASI",
          entitas: "penumpang",
          keterangan: `Memverifikasi penumpang "${newChild.nama_anak}" pada manifest ${namaKapal}`,
        });
      } catch (logErr) {
        console.error("Error recordLog in isStandaloneChild updatePenumpang:", logErr);
      }

      return res.status(200).json({
        status: true,
        message: "Berhasil memindahkan dan menyimpan data sebagai penumpang anak",
        data: {
          id_penumpang: `anak_${newChild.id_anak}`,
          id_anak: newChild.id_anak,
          id_manifest: newChild.id_manifest,
          nik: "",
          nama_penumpang: newChild.nama_anak,
          nama: newChild.nama_anak,
          tempat_lahir: "",
          tanggal_lahir: newChild.tanggal_lahir,
          jenis_kelamin: newChild.jenis_kelamin,
          alamat: newChild.alamat || "",
          foto: newChild.foto || null,
          foto_ktp: newChild.foto || null,
          tipe_penumpang: "naik",
          status_verifikasi: "selesai",
          kategori_penumpang: "Anak",
          is_anak_only: true,
          anak_list: [],
        },
      });
    }

    // Pengecekan NIK Duplikat pada Update Data Penumpang
    let updateWarningMsg = null;
    let isDuplicate = false;
    let isSameManifest = false;
    let is12Hours = false;

    const updateNik = nik !== undefined ? (nik ? String(nik).trim() : null) : target.nik;
    if (updateNik && updateNik !== "") {
      const existInManifest = await penumpang.findOne({
        where: {
          id_manifest: target.id_manifest,
          nik: updateNik,
          id_penumpang: { [Op.ne]: target.id_penumpang }
        }
      });
      if (existInManifest) {
        isDuplicate = true;
        isSameManifest = true;
        updateWarningMsg = `❌ KTP dengan NIK ${updateNik} sudah terdaftar pada manifest kapal ini!`;
      } else {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const exist12Hours = await penumpang.findOne({
          where: {
            nik: updateNik,
            id_penumpang: { [Op.ne]: target.id_penumpang },
            createdAt: { [Op.gte]: twelveHoursAgo }
          },
          include: [{
            model: manifest,
            as: "manifest",
            include: [{ model: kapal, as: "kapal" }]
          }],
          order: [["id_penumpang", "DESC"]]
        });

        if (exist12Hours) {
          const kapalNama = exist12Hours.manifest?.kapal?.nama_kapal || "Kapal Lain";
          const diffMinutes = Math.round((Date.now() - new Date(exist12Hours.createdAt).getTime()) / (1000 * 60));
          const hoursAgo = Math.floor(diffMinutes / 60);
          const minsAgo = diffMinutes % 60;
          const timeStr = hoursAgo > 0 ? `${hoursAgo} jam ${minsAgo} menit` : `${minsAgo} menit`;
          isDuplicate = true;
          is12Hours = true;
          updateWarningMsg = `🔴 PERINGATAN KTP DUPLIKAT: NIK ${updateNik} sudah terdaftar ${timeStr} lalu pada Kapal ${kapalNama}! (Masa Tenggang 12 Jam)`;
        }
      }
    }

    // Update parent passenger fields
    await target.update({
      nik: nik !== undefined ? (nik ? String(nik).trim() : null) : target.nik,
      nama_penumpang: nama_penumpang !== undefined ? (nama_penumpang ? String(nama_penumpang).trim() : null) : target.nama_penumpang,
      tempat_lahir: tempat_lahir !== undefined ? (tempat_lahir ? String(tempat_lahir).trim() : null) : target.tempat_lahir,
      tanggal_lahir: tanggal_lahir !== undefined ? (tanggal_lahir || null) : target.tanggal_lahir,
      jenis_kelamin: jenis_kelamin !== undefined ? normalizeJenisKelamin(jenis_kelamin) : target.jenis_kelamin,
      alamat: alamat !== undefined ? (alamat ? String(alamat).trim() : null) : target.alamat,
      foto_ktp: (foto_ktp || req.body.foto || req.body.foto_base64) ? (foto_ktp || req.body.foto || req.body.foto_base64) : target.foto_ktp,
      tipe_penumpang: tipe_penumpang !== undefined ? tipe_penumpang : target.tipe_penumpang,
      status_verifikasi: status_verifikasi !== undefined ? status_verifikasi : target.status_verifikasi,
      status: updateWarningMsg !== null ? updateWarningMsg : target.status,
    });

    // Sync associated child records in penumpang_anak table for adult passenger
    const isBawaAnak = bawa_anak || bawaAnak || (Array.isArray(anakList) && anakList.length > 0) || Boolean(nama_anak);

    if (isBawaAnak) {
      // Hapus data anak lama untuk id_penumpang ini demi menghindari duplikasi
      await penumpangAnak.destroy({ where: { id_penumpang: target.id_penumpang } });

      if (Array.isArray(anakList) && anakList.length > 0) {
        // Bulk insert dari array anakList
        const childRecords = anakList
          .filter((item) => item && item.namaAnak && String(item.namaAnak).trim() !== "")
          .map((item) => ({
            id_manifest: target.id_manifest,
            id_penumpang: target.id_penumpang,
            nama_anak: String(item.namaAnak).trim(),
            tanggal_lahir: normalizeSqlDate(item.tanggalLahirAnak || item.tanggal_lahir),
            jenis_kelamin: normalizeChildGender(item.jenisKelaminAnak || item.jenis_kelamin),
          }));

        if (childRecords.length > 0) {
          await penumpangAnak.bulkCreate(childRecords);
        }
      } else if (nama_anak && String(nama_anak).trim() !== "") {
        // Single child record fallback
        await penumpangAnak.create({
          id_manifest: target.id_manifest,
          id_penumpang: target.id_penumpang,
          nama_anak: String(nama_anak).trim(),
          tanggal_lahir: normalizeSqlDate(tanggal_lahir_anak),
          jenis_kelamin: normalizeChildGender(jenis_kelamin_anak),
        });
      }
    } else if (bawa_anak === false || bawaAnak === false) {
      // Jika diset tidak membawa anak, hapus data anak terkait
      await penumpangAnak.destroy({ where: { id_penumpang: target.id_penumpang } });
    }

    // Ambil ulang data lengkap penumpang beserta anak_list untuk dikirimkan kembali ke client
    const updatedWithAnak = await penumpang.findByPk(target.id_penumpang, {
      include: [{ model: penumpangAnak, as: "anak_list", required: false }],
    });

    const isVerifiedNow = status_verifikasi === "selesai";

    try {
      if (isVerifiedNow) {
        const pWithDetails = await penumpang.findByPk(target.id_penumpang, {
          include: [
            { model: manifest, as: "manifest", include: [{ model: kapal, as: "kapal" }] },
            { model: penumpangAnak, as: "anak_list", required: false },
          ],
        });

        const namaKapal = pWithDetails?.manifest?.kapal?.nama_kapal || "Kapal";
        const pName = pWithDetails?.nama_penumpang || target.nama_penumpang || "Penumpang";

        const dbChildren = pWithDetails?.anak_list || [];
        const childNames = dbChildren.map((c) => c.nama_anak).filter(Boolean);

        if (childNames.length === 0 && Array.isArray(anakList) && anakList.length > 0) {
          anakList.forEach((item) => {
            if (item && (item.namaAnak || item.nama_anak)) {
              childNames.push(String(item.namaAnak || item.nama_anak).trim());
            }
          });
        }
        if (childNames.length === 0 && nama_anak) {
          childNames.push(String(nama_anak).trim());
        }

        let logMessage = "";
        if (childNames.length > 0) {
          logMessage = `Memverifikasi penumpang "${pName}" dengan anaknya "${childNames.join(" & ")}" pada manifest ${namaKapal}`;
        } else {
          logMessage = `Memverifikasi penumpang "${pName}" pada manifest ${namaKapal}`;
        }

        await recordLog(req, {
          aksi: "VERIFIKASI",
          entitas: "penumpang",
          keterangan: logMessage,
        });
      } else {
        const isAiBackground = req.body.is_ai_extract || false;
        if (!isAiBackground) {
          await recordLog(req, {
            aksi: "UPDATE",
            entitas: "penumpang",
            keterangan: `Mengubah data penumpang "${target.nama_penumpang}"`,
          });
        } else if (nama_penumpang && String(nama_penumpang).trim() !== "") {
          try {
            const cleanExtractedName = String(nama_penumpang).trim();
            const { logAktivitas } = require("../model/association");
            const { Op } = require("sequelize");
            const scanLog = await logAktivitas.findOne({
              where: { keterangan: { [Op.like]: "%Hasil Scan KTP%" } },
              order: [["id_log", "DESC"]],
            });
            if (scanLog) {
              await scanLog.update({
                keterangan: scanLog.keterangan.replace("Hasil Scan KTP", cleanExtractedName),
              });
            }
          } catch (e) {
            console.error("Error updating scan placeholder log:", e);
          }
        }
      }
    } catch (logErr) {
      console.error("Error recordLog in updatePenumpang:", logErr);
    }

    return res.status(isDuplicate ? 409 : 200).json({
      status: true,
      isDuplicate,
      isSameManifest,
      is12Hours,
      message: updateWarningMsg || "Berhasil mengupdate data penumpang & data anak",
      data: updatedWithAnak,
    });
  } catch (error) {
    console.error("Error updatePenumpang:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan server: " + error.message,
    });
  }
};

// Delete passenger record
const deletePenumpang = async (req, res) => {
  try {
    const { id } = req.params;

    if (String(id).startsWith("anak_")) {
      const id_anak = String(id).replace("anak_", "");
      const childTarget = await penumpangAnak.findByPk(id_anak);
      if (childTarget) {
        if (childTarget.foto) {
          deleteImageFile(childTarget.foto);
        }
        await childTarget.destroy();

        await recordLog(req, {
          aksi: "DELETE",
          entitas: "penumpang",
          keterangan: `Menghapus data penumpang anak "${childTarget.nama_anak}"`,
        });

        return res.status(200).json({
          status: true,
          message: "Berhasil menghapus data penumpang anak beserta foto fisik",
        });
      }
    }

    const target = await penumpang.findByPk(id, {
      include: [{ model: penumpangAnak, as: "anak_list", required: false }],
    });

    if (!target) {
      return res.status(404).json({
        status: false,
        message: "Data penumpang tidak ditemukan",
      });
    }

    // 1. Delete parent photo file from disk if present
    if (target.foto_ktp) {
      deleteImageFile(target.foto_ktp);
    }

    // 2. Delete associated children's photo files & DB records
    if (Array.isArray(target.anak_list) && target.anak_list.length > 0) {
      for (const child of target.anak_list) {
        if (child.foto) {
          deleteImageFile(child.foto);
        }
      }
      await penumpangAnak.destroy({ where: { id_penumpang: target.id_penumpang } });
    }

    const targetName = target.nama_penumpang;
    await target.destroy();

    await recordLog(req, {
      aksi: "DELETE",
      entitas: "penumpang",
      keterangan: `Menghapus data penumpang "${targetName}"`,
    });

    return res.status(200).json({
      status: true,
      message: "Berhasil menghapus data penumpang beserta foto fisik",
    });
  } catch (error) {
    console.error("Error deletePenumpang:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan server: " + error.message,
    });
  }
};

module.exports = {
  uploadScanPenumpang,
  getPenumpangByManifest,
  getPenumpangById,
  createPenumpang,
  updatePenumpang,
  deletePenumpang,
};
