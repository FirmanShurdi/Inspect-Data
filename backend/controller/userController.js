const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const salt = 10;
const users = require("../model/userModel");
const { Op } = require("sequelize");
const { recordLog } = require("../helper/logHelper");

const login = async (req, res) => {
  try {
    let { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ msg: "Username dan password wajib diisi" });
    }

    const data = await users.findOne({ where: { username } });
    if (!data) return res.status(401).json({ msg: "Username tidak ditemukan" });

    const match = await bcrypt.compare(password, data.password);
    if (!match) return res.status(401).json({ msg: "Username / password tidak sesuai" });

    const token = jwt.sign(
      {
        id: data.id_user,
        username: data.username,
        role: data.role,
        nama_lengkap: data.nama_lengkap,
      },
      process.env.JWT_SECRET || "caloKapalmogaadabayaran",
      { expiresIn: "3h" }
    );

    const userPayload = {
      id_user: data.id_user,
      username: data.username,
      nama_lengkap: data.nama_lengkap,
      email: data.email,
      no_hp: data.no_hp,
      jabatan: data.jabatan,
      wilayah_kerja: data.wilayah_kerja,
      role: data.role,
      foto: data.foto,
    };

    // Log Login Activity
    await recordLog({ user: userPayload }, {
      aksi: 'LOGIN',
      entitas: 'auth',
      keterangan: `Pengguna "${userPayload.nama_lengkap || userPayload.username}" berhasil masuk ke sistem`,
    });

    return res.status(200).json({
      msg: "Berhasil login",
      token,
      user: userPayload,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "terjadi kesalahan pada fungsi" });
  }
};

const getUser = async (req, res) => {
  let search = (req.query.search || "").trim();
  try {
    const whereClause = search
      ? {
          [Op.or]: [
            { username: { [Op.like]: `%${search}%` } },
            { nama_lengkap: { [Op.like]: `%${search}%` } },
            { wilayah_kerja: { [Op.like]: `%${search}%` } },
            { role: { [Op.like]: `%${search}%` } },
            { jabatan: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const datas = await users.findAll({
      order: [["id_user", "DESC"]],
      attributes: {
        exclude: ["password"],
      },
      where: whereClause,
    });
    return res.status(200).json({ msg: "Berhasil mengambil data", datas });
  } catch (error) {
    console.error("getUser Error:", error);
    return res.status(500).json({ msg: "terjadi kesalahan pada fungsi getUser" });
  }
};

const getUserById = async (req, res) => {
  try {
    let id = req.params.id;
    let data = await users.findByPk(id, {
      attributes: {
        exclude: ["password"],
      },
    });

    if (data == null) return res.status(500).json({ msg: "data tidak ditemukan" });

    return res.status(200).json({ msg: "Berhasil mengambil data", data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "terjadi kesalahan pada fungsi" });
  }
};

const storeUser = async (req, res) => {
  try {
    let data = await users.findOne({ where: { username: req.body.username } });
    if (data) return res.status(400).json({ msg: "Username sudah digunakan" });

    if (req.file) {
      req.body.foto = `images/profil/${req.file.filename}`;
      // Sync photo to frontend public folder
      try {
        const frontendDir = path.join(__dirname, "../../frontend/public/images/profil");
        if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });
        fs.copyFileSync(req.file.path, path.join(frontendDir, req.file.filename));
      } catch (copyErr) {
        console.error("Gagal menyalin foto ke folder frontend:", copyErr.message);
      }
    }

    req.body.password = await bcrypt.hash(req.body.password, salt);
    const newUser = await users.create({ ...req.body });

    await recordLog(req, {
      aksi: "CREATE",
      entitas: "user",
      keterangan: `Menambah pengguna baru "${req.body.nama_lengkap || req.body.username}"`,
    });

    return res.status(200).json({ msg: "Berhasil menambahkan data" });
  } catch (error) {
    console.error("storeUser Error:", error);
    return res.status(500).json({ msg: error.message || "terjadi kesalahan pada fungsi storeUser" });
  }
};

const updateUser = async (req, res) => {
  try {
    let user = await users.findByPk(req.user.id);
    let targetUser = await users.findByPk(req.params.id);
    if (!targetUser) return res.status(404).json({ msg: "Data pengguna tidak ditemukan" });

    if (req.body.username) {
      let existingUser = await users.findOne({ where: { username: req.body.username } });
      if (existingUser && existingUser.id_user != req.params.id) {
        return res.status(400).json({ msg: "Username sudah digunakan" });
      }
    }

    if (req.file) {
      if (targetUser.foto) {
        let backendOld = path.join(__dirname, "../public", targetUser.foto);
        let frontendOld = path.join(__dirname, "../../frontend/public", targetUser.foto);
        if (fs.existsSync(backendOld)) { try { fs.unlinkSync(backendOld); } catch (e) {} }
        if (fs.existsSync(frontendOld)) { try { fs.unlinkSync(frontendOld); } catch (e) {} }
      }
      req.body.foto = `images/profil/${req.file.filename}`;

      // Sync photo to frontend public folder
      try {
        const frontendDir = path.join(__dirname, "../../frontend/public/images/profil");
        if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });
        fs.copyFileSync(req.file.path, path.join(frontendDir, req.file.filename));
      } catch (copyErr) {
        console.error("Gagal menyalin foto ke folder frontend:", copyErr.message);
      }
    }

    if (user.role != "superuser" && req.body.password) {
      delete req.body.password;
    } else if (req.body.password && req.body.password.trim() !== "") {
      req.body.password = await bcrypt.hash(req.body.password, salt);
    } else {
      delete req.body.password;
    }

    await users.update({ ...req.body }, { where: { id_user: req.params.id } });

    await recordLog(req, {
      aksi: "UPDATE",
      entitas: "user",
      keterangan: `Mengubah data pengguna "${targetUser.nama_lengkap || targetUser.username}"`,
    });

    return res.status(200).json({ msg: "Berhasil memperbarui data" });
  } catch (error) {
    console.error("updateUser Error:", error);
    return res.status(500).json({ msg: error.message || "terjadi kesalahan pada fungsi updateUser" });
  }
};

const changePassword = async (req, res) => {
  try {
    let { newPassword, currentPassword } = req.body;

    let data = await users.findOne({
      where: {
        id_user: req.user.id,
      },
    });

    const match = await bcrypt.compare(currentPassword, data.password);
    if (!match) return res.status(400).json({ msg: "Password saat ini tidak sesuai" });

    let hashedPassword = await bcrypt.hash(newPassword, salt);

    await users.update({ password: hashedPassword }, { where: { id_user: req.user.id } });

    await recordLog(req, {
      aksi: "UPDATE",
      entitas: "user",
      keterangan: `Pengguna "${data.nama_lengkap || data.username}" mengubah password akun`,
    });

    return res.status(200).json({ msg: "berhasil mengubah password" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "terjadi kesalahan pada fungsi" });
  }
};

const deleteUser = async (req, res) => {
  try {
    let data = await users.findByPk(req.params.id);
    if (!data) return res.status(404).json({ msg: "data tidak ditemukan" });

    if (data.foto) {
      let backendFile = path.join(__dirname, "../public", data.foto);
      let frontendFile = path.join(__dirname, "../../frontend/public", data.foto);
      if (fs.existsSync(backendFile)) { try { fs.unlinkSync(backendFile); } catch (e) {} }
      if (fs.existsSync(frontendFile)) { try { fs.unlinkSync(frontendFile); } catch (e) {} }
    }
    let result = await users.destroy({ where: { id_user: req.params.id } });

    if (result == 0) return res.status(404).json({ msg: "data tidak ditemukan" });

    await recordLog(req, {
      aksi: "DELETE",
      entitas: "user",
      keterangan: `Menghapus pengguna "${data.nama_lengkap || data.username}"`,
    });

    return res.status(200).json({ msg: "Berhasil menghapus data" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "terjadi kesalahan pada fungsi" });
  }
};

module.exports = {
  login,
  getUser,
  getUserById,
  storeUser,
  updateUser,
  changePassword,
  deleteUser,
};
