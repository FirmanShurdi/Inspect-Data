const { DataTypes } = require("sequelize");
const { db } = require("../config/db");

const logAktivitas = db.define(
  "log_aktivitas",
  {
    id_log: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id_user",
      },
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    nama_user: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    aksi: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    entitas: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "log_aktivitas",
    timestamps: true,
  }
);

module.exports = logAktivitas;
