const { DataTypes } = require("sequelize");
const { db } = require("../config/db");

const manifest = db.define(
  "manifest",
  {
    id_manifest: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ppk: DataTypes.ENUM("27", "29"),
    id_spb: DataTypes.INTEGER,
    no_urut: DataTypes.STRING,
    id_kapal: DataTypes.INTEGER,
    id_nahkoda: DataTypes.INTEGER,
    jumlah_crew: DataTypes.INTEGER,
    id_kedudukan_kapal: DataTypes.INTEGER,
    tanggal_datang: DataTypes.DATEONLY,
    id_datang_dari: DataTypes.INTEGER,
    tanggal_berangkat: DataTypes.DATEONLY,
    id_tempat_singgah: DataTypes.INTEGER,
    id_tujuan_akhir: DataTypes.INTEGER,
    id_tolak: DataTypes.INTEGER,
    id_sandar: DataTypes.INTEGER,
    tanggal_clearance: DataTypes.DATEONLY,
    pukul_agen_clearance: DataTypes.TIME,
    pukul_kapal_berangkat: DataTypes.STRING,
    status_muatan_berangkat: DataTypes.ENUM("NIHIL", "SESUAI MANIFEST"),
    penumpang_turun: DataTypes.INTEGER,
    penumpang_naik: DataTypes.INTEGER,
    wilayah_kerja: DataTypes.ENUM("dungkek", "pusat"),
    status_pelayaran: DataTypes.STRING,
    id_status_pelayaran: DataTypes.INTEGER,
  },
  {
    tableName: "manifest",
    timestamps: true,
  }
);

module.exports = manifest;
