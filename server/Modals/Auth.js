import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  isPremium: { type: Boolean, default: false },
  premiumSince: { type: Date, default: null },
  phone: { type: String, default: null },
  isPhoneVerified: { type: Boolean, default: false },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: "plan", default: null },
  planActivatedAt: { type: Date, default: null },
});

export default mongoose.model("user", userschema);
