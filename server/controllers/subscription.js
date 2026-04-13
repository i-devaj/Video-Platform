import subscription from "../Modals/subscription.js";
import user from "../Modals/Auth.js";

// Toggle subscribe/unsubscribe
export const handlesubscription = async (req, res) => {
  const { userId } = req.body;
  const { channelId } = req.params;

  if (userId === channelId) {
    return res.status(400).json({ message: "Cannot subscribe to yourself" });
  }

  try {
    const existing = await subscription.findOne({
      subscriber: userId,
      channel: channelId,
    });
    if (existing) {
      await subscription.findByIdAndDelete(existing._id);
      return res.status(200).json({ subscribed: false });
    } else {
      await subscription.create({ subscriber: userId, channel: channelId });
      return res.status(200).json({ subscribed: true });
    }
  } catch (error) {
    console.error("subscription error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Check if user is subscribed to a channel
export const checksubscription = async (req, res) => {
  const { userId, channelId } = req.params;
  try {
    const existing = await subscription.findOne({
      subscriber: userId,
      channel: channelId,
    });
    const count = await subscription.countDocuments({ channel: channelId });
    return res.status(200).json({ subscribed: !!existing, count });
  } catch (error) {
    console.error("check subscription error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Get subscriber count for a channel
export const getsubscribercount = async (req, res) => {
  const { channelId } = req.params;
  try {
    const count = await subscription.countDocuments({ channel: channelId });
    return res.status(200).json({ count });
  } catch (error) {
    console.error("subscriber count error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Get all subscriptions for a user (channels they follow)
export const getallsubscriptions = async (req, res) => {
  const { userId } = req.params;
  try {
    const subs = await subscription
      .find({ subscriber: userId })
      .populate({
        path: "channel",
        model: "user",
        select: "name channelname description image",
      })
      .sort({ createdAt: -1 })
      .exec();
    return res.status(200).json(subs);
  } catch (error) {
    console.error("get subscriptions error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
