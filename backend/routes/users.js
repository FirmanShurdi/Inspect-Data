var express = require('express');
var router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const verifyToken = require('../middleware/jwt');
const { storeUser, getUser, updateUser, getUserById, deleteUser, login, changePassword } = require('../controller/userController');
const { userAuth, adminAuth } = require('../middleware/authorization');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../public/images/profil');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const rawUsername = req.body?.username || req.params?.id || 'user';
    const cleanUsername = rawUsername.toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanUsername}-${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(file.originalname);

  if (!allowedTypes.includes(ext.toLowerCase())) return cb(new Error("Format file tidak sesuai"));
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

router.post('/login', login);

router.use(verifyToken);

router.get('/', adminAuth, getUser);
router.get('/:id', userAuth, getUserById);
router.post('/store', adminAuth, upload.single("foto"), storeUser);
router.patch('/update/:id', userAuth, upload.single("foto"), updateUser);
router.patch('/change-password', changePassword);
router.delete('/delete/:id', userAuth, deleteUser);

module.exports = router;
