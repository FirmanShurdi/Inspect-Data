const { DataTypes } = require("sequelize");
const { db } = require("../config/db");

const penumpangAnak = db.define(
  "penumpang_anak",
  {
    id_anak: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_manifest: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_penumpang: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    nama_anak: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    tanggal_lahir: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    jenis_kelamin: {
      type: DataTypes.ENUM("LAKI-LAKI", "PEREMPUAN"),
      defaultValue: "LAKI-LAKI",
      allowNull: true,
    },
    alamat: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    foto: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "penumpang_anak",
    timestamps: true,
  }
);

module.exports = penumpangAnak;
