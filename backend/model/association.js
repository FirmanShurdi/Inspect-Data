const users = require("./userModel");
const kapal = require("./kapalModel");
const jenis = require("./jenisModel");
const asal_kapal = require("./asalKapalModel");
const nahkoda = require("./nahkodaModel");
const pelabuhan = require("./pelabuhanModel");
const spbAsal = require("./spbAsalModel");
const spb = require("./spbModel");

const negara = require("./negaraModel");
const provinsi = require("./provinsiModel");
const kabupaten = require("./kabupatenModel");
const kecamatan = require("./kecamatanModel");

const manifest = require("./manifestModel");
const penumpang = require("./penumpangModel");
const penumpangAnak = require("./penumpangAnakModel");
const logAktivitas = require("./logAktivitasModel");

// Associations / Relations
logAktivitas.belongsTo(users, { foreignKey: "id_user", as: "user" });
users.hasMany(logAktivitas, { foreignKey: "id_user", as: "logs" });

kapal.belongsTo(jenis, { foreignKey: "id_jenis", as: "jenis" });
kapal.belongsTo(asal_kapal, { foreignKey: "id_asal_kapal", as: "asal" });

provinsi.belongsTo(negara, { foreignKey: "id_negara", as: "negara" });
kabupaten.belongsTo(provinsi, { foreignKey: "id_provinsi", as: "provinsi" });
kecamatan.belongsTo(kabupaten, { foreignKey: "id_kabupaten", as: "kabupaten" });

manifest.belongsTo(kapal, { foreignKey: "id_kapal", as: "kapal" });
manifest.belongsTo(nahkoda, { foreignKey: "id_nahkoda", as: "nahkoda" });
manifest.belongsTo(spb, { foreignKey: "id_spb", as: "spb" });

manifest.belongsTo(pelabuhan, { foreignKey: "id_datang_dari", as: "pelabuhan_asal" });
manifest.belongsTo(pelabuhan, { foreignKey: "id_sandar", as: "pelabuhan_sandar" });
manifest.belongsTo(pelabuhan, { foreignKey: "id_tolak", as: "pelabuhan_tolak" });
manifest.belongsTo(pelabuhan, { foreignKey: "id_tujuan_akhir", as: "pelabuhan_tujuan" });
manifest.belongsTo(pelabuhan, { foreignKey: "id_tempat_singgah", as: "pelabuhan_singgah" });

manifest.hasMany(penumpang, { foreignKey: "id_manifest", as: "penumpang_list" });
penumpang.belongsTo(manifest, { foreignKey: "id_manifest", as: "manifest" });

// Penumpang Anak Associations
penumpang.hasMany(penumpangAnak, { foreignKey: "id_penumpang", as: "anak_list" });
penumpangAnak.belongsTo(penumpang, { foreignKey: "id_penumpang", as: "orang_tua" });

manifest.hasMany(penumpangAnak, { foreignKey: "id_manifest", as: "penumpang_anak_list" });
penumpangAnak.belongsTo(manifest, { foreignKey: "id_manifest", as: "manifest" });

module.exports = {
  users,
  kapal,
  jenis,
  asal_kapal,
  nahkoda,
  pelabuhan,
  spbAsal,
  spb,
  negara,
  provinsi,
  kabupaten,
  kecamatan,
  manifest,
  penumpang,
  penumpangAnak,
  logAktivitas,
};
