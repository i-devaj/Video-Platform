import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../Modals/Auth.js";

export const createorder = async (req, res) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: 9900, // ₹99 in paise
      currency: "INR",
      receipt: "premium_upgrade",
    };

    const order = await razorpay.orders.create(options);
    return res.status(200).json(order);
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    return res.status(500).json({ message: "Order creation failed" });
  }
};

export const verifypayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      // Payment verified successfully
      await User.findByIdAndUpdate(userId, {
        isPremium: true,
        premiumSince: new Date(),
      });

      return res.status(200).json({ success: true, message: "Payment verified. You are now a premium user." });
    } else {
      return res.status(400).json({ success: false, message: "Payment verification failed." });
    }
  } catch (error) {
    console.error("Razorpay verification error:", error);
    return res.status(500).json({ success: false, message: "Server error during payment verification." });
  }
};

export const cancelsubscription = async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, {
      isPremium: false,
      premiumSince: null,
    });
    return res.status(200).json({ success: true, message: "Subscription cancelled." });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel subscription." });
  }
};
