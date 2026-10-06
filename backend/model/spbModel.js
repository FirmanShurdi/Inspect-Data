const { DataTypes } = require("sequelize");
const { db } = require("../config/db");

const spb = db.define(
  "spb",
  {
    id_spb: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    no_spb_asal: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "spb",
    timestamps: true,
  }
);

module.exports = spb;
