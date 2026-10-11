const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/jwt");
const {
  uploadScanPenumpang,
  getPenumpangByManifest,
  getPenumpangById,
  createPenumpang,
  updatePenumpang,
  deletePenumpang,
} = require("../controller/penumpangController");

router.use(verifyToken);

router.post("/upload-scan", uploadScanPenumpang);
router.post("/upload", uploadScanPenumpang);

router.get("/clearance/:id_clearance", getPenumpangByManifest);
router.get("/manifest/:id_manifest", getPenumpangByManifest);
router.get("/:id", getPenumpangById);
router.post("/store", createPenumpang);
router.post("/", createPenumpang);
router.put("/update/:id", updatePenumpang);
router.put("/:id", updatePenumpang);
router.patch("/:id", updatePenumpang);
router.delete("/delete/:id", deletePenumpang);
router.delete("/:id", deletePenumpang);

module.exports = router;
