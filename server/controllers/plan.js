import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../Modals/Auth.js";
import Plan from "../Modals/Plan.js";
import Transaction from "../Modals/Transaction.js";
import { sendInvoiceEmail } from "../utils/sendEmail.js";

export const getallplans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ order: 1 });
    return res.status(200).json(plans);
  } catch (error) {
    console.error("Error fetching plans:", error);
    return res.status(500).json({ message: "Failed to fetch plans" });
  }
};

export const getuserplan = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate("plan");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      plan: user.plan,
      planActivatedAt: user.planActivatedAt,
    });
  } catch (error) {
    console.error("Error fetching user plan:", error);
    return res.status(500).json({ message: "Failed to fetch user plan" });
  }
};

export const createplanorder = async (req, res) => {
  try {
    const { userId, planId } = req.body;

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({ message: "Invalid or inactive plan" });
    }
    if (plan.price === 0) {
      return res.status(400).json({ message: "Cannot purchase the free plan" });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: plan.price,
      currency: plan.currency,
      receipt: `plan_${plan.name}_${userId}`,
    });

    const transaction = await Transaction.create({
      userId,
      planId,
      razorpayOrderId: order.id,
      amount: plan.price,
      currency: plan.currency,
      status: "created",
    });

    return res.status(200).json({
      order,
      transactionId: transaction._id,
      planName: plan.displayName,
    });
  } catch (error) {
    console.error("Plan order creation error:", error);
    return res.status(500).json({ message: "Order creation failed" });
  }
};

export const verifyplanpayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      transactionId,
      userId,
    } = req.body;

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      await Transaction.findByIdAndUpdate(transactionId, { status: "failed" });
      return res.status(400).json({ success: false, message: "Payment verification failed." });
    }

    // Update transaction
    const transaction = await Transaction.findByIdAndUpdate(
      transactionId,
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "paid",
      },
      { new: true }
    );

    // Generate invoice number: FT-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const count = await Transaction.countDocuments({
      status: "paid",
      createdAt: { $gte: todayStart },
    });
    const invoiceNumber = `FT-${dateStr}-${String(count).padStart(4, "0")}`;
    transaction.invoiceNumber = invoiceNumber;
    await transaction.save();

    // Upgrade user plan
    const plan = await Plan.findById(transaction.planId);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { plan: transaction.planId, planActivatedAt: new Date() },
      { new: true }
    ).populate("plan");

    // Send invoice email (non-blocking)
    if (updatedUser?.email && plan) {
      sendInvoiceEmail(updatedUser.email, {
        userName: updatedUser.name || "User",
        planName: plan.displayName,
        amount: plan.price,
        transactionId: razorpay_payment_id,
        invoiceNumber,
        date: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      }).catch((err) => console.error("Invoice email failed:", err));
    }

    return res.status(200).json({
      success: true,
      message: `Upgraded to ${plan.displayName}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Plan payment verification error:", error);
    return res.status(500).json({ success: false, message: "Server error during verification." });
  }
};

export const cancelplan = async (req, res) => {
  try {
    const { userId } = req.params;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { plan: null, planActivatedAt: null },
      { new: true }
    );
    return res.status(200).json({
      success: true,
      message: "Plan cancelled. You are now on the Free plan.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Cancel plan error:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel plan." });
  }
};

export const getusertransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    const transactions = await Transaction.find({ userId, status: "paid" })
      .populate("planId")
      .sort({ createdAt: -1 });
    return res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({ message: "Failed to fetch transactions" });
  }
};
