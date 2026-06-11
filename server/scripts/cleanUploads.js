import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
import Video from '../Modals/video.js';

async function cleanUploads() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to DB.");

    const videos = await Video.find({}, 'filepath');
    const validPaths = new Set(videos.map(v => v.filepath.replace(/\\/g, '/')));

    const uploadsDir = path.resolve('uploads');
    const files = fs.readdirSync(uploadsDir);

    let deletedCount = 0;
    let keepCount = 0;

    for (const file of files) {
      if (file === '.gitkeep') {
        keepCount++;
        continue;
      }
      
      const filePath = `uploads/${file}`;
      if (!validPaths.has(filePath)) {
        console.log(`Deleting unused file: ${filePath}`);
        fs.unlinkSync(path.join(uploadsDir, file));
        deletedCount++;
      } else {
        keepCount++;
      }
    }

    console.log(`\nCleanup complete.`);
    console.log(`Deleted ${deletedCount} unused files.`);
    console.log(`Kept ${keepCount} files.`);
    process.exit(0);
  } catch (err) {
    console.error("Error during cleanup:", err);
    process.exit(1);
  }
}

cleanUploads();
