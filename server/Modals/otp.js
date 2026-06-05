import mongoose from "mongoose";
const otpschema = mongoose.Schema({
  identifier: { type: String, required: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ['email', 'sms'], required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 },
});
export default mongoose.model("otp", otpschema);
