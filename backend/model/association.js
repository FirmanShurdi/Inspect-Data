const users = require("./userModel");
const kapal = require("./kapalModel");
const jenis = require("./jenisModel");
const asal_kapal = require("./asalKapalModel");
const nahkoda = require("./nahkodaModel");
const pelabuhan = require("./pelabuhanModel");

const negara = require("./negaraModel");
const provinsi = require("./provinsiModel");
const kabupaten = require("./kabupatenModel");
const kecamatan = require("./kecamatanModel");

const clearance = require("./clearanceModel");
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

clearance.belongsTo(kapal, { foreignKey: "id_kapal", as: "kapal" });
clearance.belongsTo(nahkoda, { foreignKey: "id_nahkoda", as: "nahkoda" });

clearance.belongsTo(pelabuhan, { foreignKey: "id_datang_dari", as: "pelabuhan_asal" });
clearance.belongsTo(pelabuhan, { foreignKey: "id_sandar", as: "pelabuhan_sandar" });
clearance.belongsTo(pelabuhan, { foreignKey: "id_tolak", as: "pelabuhan_tolak" });
clearance.belongsTo(pelabuhan, { foreignKey: "id_tujuan_akhir", as: "pelabuhan_tujuan" });

clearance.hasMany(penumpang, { foreignKey: "id_clearance", as: "penumpang_list" });
penumpang.belongsTo(clearance, { foreignKey: "id_clearance", as: "clearance" });
penumpang.belongsTo(clearance, { foreignKey: "id_clearance", as: "manifest" });

// Penumpang Anak Associations
penumpang.hasMany(penumpangAnak, { foreignKey: "id_penumpang", as: "anak_list" });
penumpangAnak.belongsTo(penumpang, { foreignKey: "id_penumpang", as: "orang_tua" });

clearance.hasMany(penumpangAnak, { foreignKey: "id_clearance", as: "penumpang_anak_list" });
penumpangAnak.belongsTo(clearance, { foreignKey: "id_clearance", as: "clearance" });
penumpangAnak.belongsTo(clearance, { foreignKey: "id_clearance", as: "manifest" });

module.exports = {
  users,
  kapal,
  jenis,
  asal_kapal,
  nahkoda,
  pelabuhan,
  negara,
  provinsi,
  kabupaten,
  kecamatan,
  clearance,
  manifest: clearance,
  penumpang,
  penumpangAnak,
  logAktivitas,
};
