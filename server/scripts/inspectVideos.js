import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Video from '../Modals/video.js';

await mongoose.connect(process.env.DB_URL);
const vids = await Video.find();
vids.forEach(v => {
  console.log(`ID: ${v._id}`);
  console.log(`Title: ${v.videotitle}`);
  console.log(`Filepath: ${v.filepath}`);
  console.log(`Uploader: ${v.uploader}`);
  console.log('---');
});
process.exit(0);
