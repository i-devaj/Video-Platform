import video from "../Modals/video.js";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);

async function convertToMp4(inputPath) {
  const parsed = path.parse(inputPath);

  // If we are re-encoding an mp4, we need a temp name to avoid overwriting the input
  let outputPath = path.join(parsed.dir, parsed.name + ".mp4");
  if (inputPath === outputPath) {
      outputPath = path.join(parsed.dir, parsed.name + "-converted.mp4");
  }

  // Force re-encode to 720p max, lower bitrate (crf 28), and faststart to ensure smooth web playback
  await execFileAsync("ffmpeg", [
    "-i", inputPath,
    "-vf", "scale='min(1280,iw)':-2", // Scale to 720p max, keeping aspect ratio
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "128k",
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

export const getRecommendations = async (req, res) => {
  try {
    const files = await video.find();
    
    // Get top 10 trending by views
    const trending = [...files].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
    
    // Shuffle all files for random discovery recommendations
    const recommended = [...files].sort(() => 0.5 - Math.random());
    
    return res.status(200).json({
      trending,
      recommended
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const streamVideo = (req, res) => {
  const filepath = req.query.path;
  if (!filepath) {
    return res.status(400).send("Path is required");
  }

  const absolutePath = path.resolve(filepath);

  // Basic security check
  if (!absolutePath.includes("uploads")) {
     return res.status(403).send("Forbidden");
  }

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).send("File not found");
  }

  const stat = fs.statSync(absolutePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    // 5MB chunk size for smooth playback without buffering
    const CHUNK_SIZE = 5 * 10 ** 6; 
    const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE, fileSize - 1);
    
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(absolutePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(absolutePath).pipe(res);
  }
};
