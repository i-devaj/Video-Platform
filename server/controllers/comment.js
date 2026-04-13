import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import { isCommentClean } from "../utils/commentFilter.js";

export const postcomment = async (req, res) => {
  const commentdata = req.body;
  if (!isCommentClean(commentdata.commentbody || '')) {
    return res.status(400).json({ message: 'Comment contains invalid characters' });
  }
  const postcomment = new comment({
    ...commentdata,
    city: commentdata.city || '',
    language: commentdata.language || 'en',
  });
  try {
    await postcomment.save();
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid: videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const updatecomment = await comment.findByIdAndUpdate(_id, {
      $set: { commentbody: commentbody },
    });
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const doc = await comment.findById(_id);
    if (!doc) return res.status(404).json({ message: "Comment not found" });

    const alreadyLiked = doc.likes.includes(userId);

    if (alreadyLiked) {
      // toggle off
      doc.likes.pull(userId);
    } else {
      // remove from dislikes if present, then add to likes
      doc.dislikes.pull(userId);
      doc.likes.push(userId);
    }

    await doc.save();
    return res.status(200).json({
      likes: doc.likes.length,
      dislikes: doc.dislikes.length,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const doc = await comment.findById(_id);
    if (!doc) return res.status(404).json({ message: "Comment not found" });

    const alreadyDisliked = doc.dislikes.includes(userId);

    if (alreadyDisliked) {
      // toggle off
      doc.dislikes.pull(userId);
    } else {
      // remove from likes if present, then add to dislikes
      doc.likes.pull(userId);
      doc.dislikes.push(userId);
    }

    // Auto-delete if 2+ dislikes
    if (doc.dislikes.length >= 2) {
      await comment.findByIdAndDelete(_id);
      return res.status(200).json({ removed: true });
    }

    await doc.save();
    return res.status(200).json({
      removed: false,
      likes: doc.likes.length,
      dislikes: doc.dislikes.length,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
