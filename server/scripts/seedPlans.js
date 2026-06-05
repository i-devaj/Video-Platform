import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const plans = [
  {
    name: "free",
    displayName: "Free Plan",
    price: 0,
    currency: "INR",
    watchLimitMinutes: 5,
    features: ["Watch videos up to 5 minutes", "Basic quality"],
    color: "#6b7280",
    isActive: true,
    order: 0,
  },
  {
    name: "bronze",
    displayName: "Bronze Plan",
    price: 1000,
    currency: "INR",
    watchLimitMinutes: 7,
    features: ["Watch videos up to 7 minutes", "Standard quality"],
    color: "#CD7F32",
    isActive: true,
    order: 1,
  },
  {
    name: "silver",
    displayName: "Silver Plan",
    price: 5000,
    currency: "INR",
    watchLimitMinutes: 10,
    features: ["Watch videos up to 10 minutes", "HD quality"],
    color: "#C0C0C0",
    isActive: true,
    order: 2,
  },
  {
    name: "gold",
    displayName: "Gold Plan",
    price: 10000,
    currency: "INR",
    watchLimitMinutes: null,
    features: ["Unlimited video watching", "4K quality", "Priority support"],
    color: "#FFD700",
    isActive: true,
    order: 3,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to MongoDB");

    const Plan = (await import("../Modals/Plan.js")).default;

    for (const plan of plans) {
      await Plan.findOneAndUpdate({ name: plan.name }, plan, { upsert: true, new: true });
      console.log(`Upserted plan: ${plan.displayName}`);
    }

    console.log("All plans seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
