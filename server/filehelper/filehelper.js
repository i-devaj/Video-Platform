"use strict";
import multer from "multer";
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname.replace(/\s+/g, "-")
    );
  },
});
const ALLOWED_MIMETYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",   // .mov
  "video/x-msvideo",   // .avi
  "video/avi",
];
const filefilter = (req, file, cb) => {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: MP4, WebM, MOV, AVI`), false);
  }
};
const upload = multer({ storage: storage, fileFilter: filefilter });
export default upload;
