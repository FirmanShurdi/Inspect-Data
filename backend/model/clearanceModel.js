const { DataTypes } = require("sequelize");
const { db } = require("../config/db");

const clearance = db.define(
  "clearance",
  {
    id_clearance: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    no_urut: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    id_kapal: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_nahkoda: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    jumlah_crew: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_kedudukan_kapal: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tanggal_datang: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    id_datang_dari: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tanggal_berangkat: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    id_tujuan_akhir: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_tolak: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_sandar: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tanggal_clearance: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    pukul_agen_clearance: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pukul_kapal_berangkat: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cooldown_jam: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 20,
    },
  },
  {
    freezeTableName: true,
  }
);

module.exports = clearance;
