import mongoose from "mongoose";
const planschema = mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    watchLimitMinutes: { type: Number, default: null },
    features: [{ type: String }],
    color: { type: String, default: "#6b7280" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("plan", planschema);
