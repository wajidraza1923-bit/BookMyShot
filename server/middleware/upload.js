const multer = require("multer");
const path = require("path");

// Use memory storage — files will be uploaded to Cloudinary from buffer
const storage = multer.memoryStorage();

// Separate file filters for photos vs videos
const photoFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = /image\/(jpeg|jpg|png|webp)/.test(file.mimetype);
  if (ext || mime) cb(null, true);
  else cb(new Error("Invalid photo format. Allowed: JPG, JPEG, PNG, WEBP"), false);
};

const videoFilter = (req, file, cb) => {
  const allowed = /mp4|mov|avi|webm/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = file.mimetype.startsWith("video");
  if (ext || mime) cb(null, true);
  else cb(new Error("Invalid video format. Allowed: MP4, MOV, AVI, WEBM"), false);
};

const anyMediaFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|mp4|mov|avi|webm/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype) || file.mimetype.startsWith("video") || file.mimetype.startsWith("image");
  if (ext || mime) cb(null, true);
  else cb(new Error("Invalid file type"), false);
};

// Photo upload: max 10MB per file
const uploadPhotos = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: photoFilter,
});

// Video upload: max 50MB per file
const uploadVideos = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: videoFilter,
});

// General upload (avatars, admin): max 10MB
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: anyMediaFilter,
});

module.exports = { upload, uploadPhotos, uploadVideos };
