import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Video from '../Modals/video.js';

await mongoose.connect(process.env.DB_URL);

const videos = await Video.find();
let fixed = 0;

for (const v of videos) {
  if (v.filepath && !v.filepath.endsWith('.mp4')) {
    const oldPath = v.filepath;
    const newPath = v.filepath.replace(/\.[^.]+$/, '.mp4');
    v.filepath = newPath;
    v.filetype = 'video/mp4';
    await v.save();
    console.log(`Fixed: "${v.videotitle}"`);
    console.log(`  Old: ${oldPath}`);
    console.log(`  New: ${newPath}`);
    fixed++;
  }
}

console.log(`\nDone. Fixed ${fixed} video(s).`);
process.exit(0);
