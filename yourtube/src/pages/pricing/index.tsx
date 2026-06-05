import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, Crown, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { PlanType, formatPrice, PLAN_COLORS } from "@/lib/plans";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Shield className="w-6 h-6" />,
  bronze: <Zap className="w-6 h-6" />,
  silver: <Sparkles className="w-6 h-6" />,
  gold: <Crown className="w-6 h-6" />,
};

export default function PricingPage() {
  const { user, login } = useUser();
  const [plans, setPlans] = useState<PlanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const currentPlanOrder = user?.plan?.order ?? -1;

  useEffect(() => {
    axiosInstance
      .get("/plan/all")
      .then((res) => setPlans(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (document.getElementById("razorpay-checkout-js")) return resolve(true);
      const s = document.createElement("script");
      s.id = "razorpay-checkout-js";
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleUpgrade = async (plan: PlanType) => {
    if (!user || plan.price === 0) return;
    setPurchasing(plan._id);

    try {
      const ok = await loadRazorpayScript();
      if (!ok) {
        alert("Failed to load payment gateway.");
        setPurchasing(null);
        return;
      }

      const { data } = await axiosInstance.post("/plan/createorder", {
        userId: user._id,
        planId: plan._id,
      });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: "INR",
        order_id: data.order.id,
        name: "FlexTube",
        description: `Upgrade to ${plan.displayName}`,
        prefill: { name: user.name || "User", email: user.email || "" },
        handler: async (response: any) => {
          try {
            const v = await axiosInstance.post("/plan/verify", {
              ...response,
              transactionId: data.transactionId,
              userId: user._id,
            });
            if (v.data.success) login(v.data.user);
          } catch {
            alert("Payment verification failed. Contact support.");
          }
        },
        modal: { ondismiss: () => setPurchasing(null) },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (r: any) => {
        alert("Payment failed: " + r.error.description);
        setPurchasing(null);
      });
      rzp.open();
    } catch {
      alert("Failed to initialize payment.");
      setPurchasing(null);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to cancel your plan? You will be downgraded to the Free plan.")) return;
    try {
      const res = await axiosInstance.post(`/plan/cancel/${user._id}`);
      if (res.data.success) {
        login({ ...res.data.user, plan: null });
      }
    } catch {
      alert("Failed to cancel plan.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Unlock longer watch times with a plan that fits your needs. One-time purchase, cancel anytime.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const color = PLAN_COLORS[plan.name] || "#6b7280";
            const isCurrent =
              (plan.name === "free" && !user?.plan) ||
              user?.plan?._id === plan._id;
            const isUpgrade = plan.order > currentPlanOrder;
            const isDowngrade = plan.order < currentPlanOrder || (plan.name === "free" && !!user?.plan);
            const isPurchasing = purchasing === plan._id;

            return (
              <div
                key={plan._id}
                className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all duration-300 hover:shadow-xl ${
                  isCurrent
                    ? "border-2 shadow-lg"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
                style={{
                  borderColor: isCurrent ? color : undefined,
                  boxShadow: isCurrent ? `0 0 20px ${color}20` : undefined,
                }}
              >
                {/* Best value tag */}
                {plan.name === "gold" && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white tracking-wide"
                    style={{ backgroundColor: color }}
                  >
                    BEST VALUE
                  </div>
                )}

                {/* Current badge */}
                {isCurrent && (
                  <div
                    className="absolute -top-3 right-4 px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    CURRENT
                  </div>
                )}

                {/* Icon + Name */}
                <div className="mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    {PLAN_ICONS[plan.name] || PLAN_ICONS.free}
                  </div>
                  <h3 className="text-xl font-bold" style={{ color }}>
                    {plan.displayName}
                  </h3>
                </div>

                {/* Price */}
                <div className="mb-4">
                  {plan.price === 0 ? (
                    <div className="text-3xl font-bold">Free</div>
                  ) : (
                    <div className="text-3xl font-bold">
                      {formatPrice(plan.price)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        one-time
                      </span>
                    </div>
                  )}
                </div>

                {/* Watch limit */}
                <div
                  className="rounded-lg px-3 py-2 mb-4 text-sm font-semibold"
                  style={{ backgroundColor: `${color}10`, color }}
                >
                  {plan.watchLimitMinutes
                    ? `Up to ${plan.watchLimitMinutes} min per video`
                    : "Unlimited watch time"}
                </div>

                {/* Features */}
                <div className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2
                        className="w-4 h-4 shrink-0 mt-0.5"
                        style={{ color }}
                      />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {/* Action button */}
                {isCurrent ? (
                  plan.name !== "free" ? (
                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-xl"
                      onClick={handleCancel}
                    >
                      Cancel Plan
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      disabled
                      className="w-full h-11 rounded-xl"
                    >
                      Current Plan
                    </Button>
                  )
                ) : isUpgrade ? (
                  <Button
                    onClick={() => handleUpgrade(plan)}
                    disabled={!!purchasing || !user}
                    className="w-full h-11 rounded-xl font-semibold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Upgrade to ${plan.displayName.replace(" Plan", "")}`
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled
                    className="w-full h-11 rounded-xl text-muted-foreground"
                  >
                    Downgrade N/A
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          All plans are one-time purchases. You can cancel anytime and revert to the Free plan.
          <br />
          Watch time limits apply per video session.
        </p>
      </div>
    </div>
  );
}
