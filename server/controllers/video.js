import video from "../Modals/video.js";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);

async function convertToMp4(inputPath) {
  const parsed = path.parse(inputPath);

  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=codec_name",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath
    ]);
    const codec = stdout.trim().toLowerCase();
    
    // If it's already an MP4 container AND has H.264 codec, apply faststart via stream copy
    if (parsed.ext.toLowerCase() === ".mp4" && codec === "h264") {
      console.log(`[ffmpeg] Codec is H.264. Applying faststart to ${parsed.base}...`);
      let outputPath = path.join(parsed.dir, parsed.name + "-faststart.mp4");
      
      await execFileAsync("ffmpeg", [
        "-i", inputPath,
        "-c", "copy",
        "-movflags", "+faststart",
        "-y",
        outputPath,
      ]);

      fs.unlinkSync(inputPath);
      return outputPath;
    }

    console.log(`[ffmpeg] Codec is '${codec}'. Converting ${parsed.base}...`);
  } catch (err) {
    console.warn(`[ffmpeg] Could not probe codec for ${inputPath}, proceeding with conversion.`);
  }

  // If we are re-encoding an mp4, we need a temp name to avoid overwriting the input
  let outputPath = path.join(parsed.dir, parsed.name + ".mp4");
  if (inputPath === outputPath) {
      outputPath = path.join(parsed.dir, parsed.name + "-converted.mp4");
  }

  await execFileAsync("ffmpeg", [
    "-i", inputPath,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-c:a", "aac",
    "-movflags", "+faststart",
    "-y",
    outputPath,
  ]);

  // Remove original file
  fs.unlinkSync(inputPath);
  console.log(`[ffmpeg] Done → ${path.basename(outputPath)}`);
  return outputPath;
}

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      let filePath = req.file.path.replace(/\\/g, "/");

      // Ensure all videos are browser-compatible H.264 MP4s
      const converted = await convertToMp4(filePath);
      filePath = converted.replace(/\\/g, "/");

      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: filePath,
        filetype: "video/mp4",
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });
      await file.save();
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getvideobyuser = async (req, res) => {
  try {
    const { userId } = req.params;
    const files = await video.find({ uploader: userId }).sort({ createdAt: -1 });
    return res.status(200).json(files);
  } catch (error) {
    console.error("Error fetching user videos:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
