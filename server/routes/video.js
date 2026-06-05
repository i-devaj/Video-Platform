import express from "express";
import { getallvideo, uploadvideo, getvideobyuser } from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

// Multer 2.x needs (req, res, next) — wrap in a Promise so we can await it
function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

routes.post("/upload", async (req, res) => {
  try {
    await runMulter(req, res);
    await uploadvideo(req, res);
  } catch (err) {
    console.error("Upload error:", err.message);
    return res.status(400).json({ message: err.message || "Upload failed" });
  }
});
routes.get("/getall", getallvideo);
routes.get("/user/:userId", getvideobyuser);
export default routes;

