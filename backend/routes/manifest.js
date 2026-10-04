const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/jwt");
const {
  getManifest,
  getManifestById,
  getTodayActiveKapalIds,
  storeManifest,
  updateManifest,
  deleteManifest,
} = require("../controller/manifestController");

router.use(verifyToken);

router.get("/today-active-kapal", getTodayActiveKapalIds);
router.get("/all", getManifest);
router.get("/", getManifest);
router.post("/store", storeManifest);
router.put("/update/:id", updateManifest);
router.patch("/update/:id", updateManifest);
router.delete("/delete/:id", deleteManifest);
router.get("/:id", getManifestById);

module.exports = router;
