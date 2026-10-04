const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/jwt");
const { getLogAktivitas } = require("../controller/logAktivitasController");

router.use(verifyToken);

router.get("/all", getLogAktivitas);
router.get("/", getLogAktivitas);

module.exports = router;
