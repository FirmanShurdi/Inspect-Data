  require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const { db, configDb } = require('./config/db');
require('./model/association');

// Import Routers
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const manifestRouter = require('./routes/manifest');
const inspectionRouter = require('./routes/inspection');
const kapalRouter = require('./routes/kapal');
const agenRouter = require('./routes/agen');
const nahkodaRouter = require('./routes/nahkoda');
const pelabuhanRouter = require('./routes/pelabuhan');
const spbAsalRouter = require('./routes/spbAsal');
const negaraRouter = require('./routes/negara');
const provinsiRouter = require('./routes/provinsi');
const kabupatenRouter = require('./routes/kabupaten');
const kecamatanRouter = require('./routes/kecamatan');
const penumpangRouter = require('./routes/penumpang');
const logAktivitasRouter = require('./routes/logAktivitas');

const app = express();

// Authenticate & Sync Database Connection (db_calokapal)
(async () => {
  try {
    await configDb();
    console.log('🟢 Database db_calokapal connection synchronized');
  } catch (error) {
    console.error('❌ Sync Error:', error);
  }
})();

// Robust Cross-Origin Resource Sharing (CORS) Setup with preflight handling
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// API Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'KSOP CaloKapal Backend API Online', timestamp: new Date() });
});

// API Routes Setup
app.use('/api', indexRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/manifest', manifestRouter);
app.use('/api/inspection', inspectionRouter);
app.use('/api/kapal', kapalRouter);
app.use('/api/agen', agenRouter);
app.use('/api/nahkoda', nahkodaRouter);
app.use('/api/pelabuhan', pelabuhanRouter);
app.use('/api/spb-asal', spbAsalRouter);
app.use('/api/negara', negaraRouter);
app.use('/api/provinsi', provinsiRouter);
app.use('/api/kabupaten', kabupatenRouter);
app.use('/api/kecamatan', kecamatanRouter);
app.use('/api/penumpang', penumpangRouter);
app.use('/api/log-aktivitas', logAktivitasRouter);



// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: req.app.get('env') === 'development' ? err : {},
  });
});

module.exports = app;
