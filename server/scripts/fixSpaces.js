import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();
import Video from '../Modals/video.js';

await mongoose.connect(process.env.DB_URL);

const videos = await Video.find();
let fixed = 0;

for (const v of videos) {
  if (v.filepath && v.filepath.includes(' ')) {
    const oldPath = v.filepath;
    const newPath = v.filepath.replace(/\s+/g, '-');

    // Rename file on disk
    const oldFull = path.resolve(oldPath);
    const newFull = path.resolve(newPath);
    if (fs.existsSync(oldFull)) {
      fs.renameSync(oldFull, newFull);
      console.log(`Renamed file on disk`);
    } else {
      console.log(`WARNING: File not found on disk: ${oldFull}`);
    }

    // Update DB
    v.filepath = newPath;
    await v.save();
    console.log(`Fixed: "${v.videotitle}"`);
    console.log(`  Old: ${oldPath}`);
    console.log(`  New: ${newPath}`);
    fixed++;
  }
}

console.log(`\nDone. Fixed ${fixed} video(s).`);
process.exit(0);
