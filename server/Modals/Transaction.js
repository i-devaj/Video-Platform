import mongoose from "mongoose";
const transactionschema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "plan",
      required: true,
    },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
    invoiceNumber: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("transaction", transactionschema);
