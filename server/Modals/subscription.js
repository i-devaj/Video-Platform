import mongoose from "mongoose";
const subscriptionschema = mongoose.Schema(
  {
    subscriber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate subscriptions
subscriptionschema.index({ subscriber: 1, channel: 1 }, { unique: true });

export default mongoose.model("subscription", subscriptionschema);
