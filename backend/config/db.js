const { Sequelize } = require('sequelize');

const db = new Sequelize(
  process.env.DB_NAME || 'db_calokapal',
  process.env.DB_USERNAME || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log, // Enable live SQL query logging (SELECT, INSERT, UPDATE) in terminal
    define: {
      charset: 'utf8mb3',
      collate: 'utf8mb3_general_ci',
    },
  }
);

const configDb = async () => {
  try {
    await db.authenticate();
    console.log('DATABASE TERHUBUNG');
  } catch (error) {
    console.error('❌ DATABASE CONNECTION ERROR:', error.message);
  }
};

module.exports = { db, configDb };
