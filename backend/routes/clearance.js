const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/jwt");
const {
  getClearance,
  getClearanceById,
  getClearanceByKapal,
  getTodayActiveKapalIds,
  storeClearance,
  updateClearance,
  deleteClearance,
} = require("../controller/clearanceController");

router.use(verifyToken);

router.get("/today-active-kapal", getTodayActiveKapalIds);
router.get("/by-kapal/:id_kapal", getClearanceByKapal);
router.get("/all", getClearance);
router.get("/", getClearance);
router.post("/store", storeClearance);
router.put("/update/:id", updateClearance);
router.patch("/update/:id", updateClearance);
router.delete("/delete/:id", deleteClearance);
router.get("/:id", getClearanceById);

module.exports = router;
