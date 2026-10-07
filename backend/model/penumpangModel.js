const { DataTypes } = require("sequelize");
const { db } = require("../config/db");

const penumpang = db.define(
  "penumpang",
  {
    id_penumpang: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_manifest: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nik: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    nama_penumpang: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    tempat_lahir: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    tanggal_lahir: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    jenis_kelamin: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    alamat: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    foto_ktp: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    tipe_penumpang: {
      type: DataTypes.ENUM("naik", "turun"),
      defaultValue: "naik",
    },
    status_verifikasi: {
      type: DataTypes.ENUM("pending", "selesai"),
      defaultValue: "pending",
      allowNull: false,
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "penumpang",
    timestamps: true,
  }
);

module.exports = penumpang;
