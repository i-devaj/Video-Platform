import download from "../Modals/download.js";
import users from "../Modals/Auth.js";
import mongoose from "mongoose";

export const handledownload = async (req, res) => {
  const { videoId } = req.params;
  const { userId } = req.body;
  const todayStart = new Date().setHours(0, 0, 0, 0);

  try {
    const user = await users.findById(userId);
    const isPremium = user?.isPremium || false;

    if (!isPremium) {
      const count = await download.countDocuments({
        viewer: userId,
        downloadedon: { $gte: todayStart },
      });

      if (count >= 1) {
        return res.status(403).json({ message: "Download limit reached. Free users can download 1 video per day." });
      }
    }

    const newDownload = new download({
      viewer: userId,
      videoid: videoId,
    });

    await newDownload.save();
    res.status(200).json({ download: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getalldownloads = async (req, res) => {
  const { userId } = req.params;
  try {
    const downloads = await download.find({ viewer: userId }).populate("videoid");
    res.status(200).json(downloads);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const checkdownloadlimit = async (req, res) => {
  const { userId } = req.params;
  const todayStart = new Date().setHours(0, 0, 0, 0);
  try {
    const user = await users.findById(userId);
    const isPremium = user?.isPremium || false;

    const count = await download.countDocuments({
      viewer: userId,
      downloadedon: { $gte: todayStart },
    });
    
    return res.status(200).json({ 
      limitReached: isPremium ? false : count >= 1, 
      downloadsToday: count,
      isPremium 
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
