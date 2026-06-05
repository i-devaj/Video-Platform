import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { PlanType, formatPrice, PLAN_COLORS } from "@/lib/plans";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, login } = useUser();
  const [plans, setPlans] = useState<PlanType[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingPlans, setFetchingPlans] = useState(false);

  useEffect(() => {
    if (isOpen && plans.length === 0) {
      setFetchingPlans(true);
      axiosInstance
        .get("/plan/all")
        .then((res) => setPlans(res.data))
        .catch((err) => console.error("Failed to fetch plans:", err))
        .finally(() => setFetchingPlans(false));
    }
  }, [isOpen]);

  const currentPlanName = user?.plan?.name || "free";

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-checkout-js")) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (plan: PlanType) => {
    if (!user || plan.price === 0) return;
    setSelectedPlan(plan);
    setIsLoading(true);

    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        alert("Failed to load payment gateway. Please check your internet connection.");
        setIsLoading(false);
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
        prefill: {
          name: user.name || "User",
          email: user.email || "",
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await axiosInstance.post("/plan/verify", {
              ...response,
              transactionId: data.transactionId,
              userId: user._id,
            });

            if (verifyRes.data.success) {
              login(verifyRes.data.user);
              onSuccess?.();
              onClose();
            }
          } catch (error) {
            console.error("Payment verification failed", error);
            alert("Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
            setSelectedPlan(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        console.error("Payment failed", response.error);
        alert("Payment failed: " + response.error.description);
        setIsLoading(false);
        setSelectedPlan(null);
      });
      rzp.open();
    } catch (error) {
      console.error("Error during order initialization", error);
      alert("Failed to initialize payment. Please try again later.");
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  // Filter out free plan and plans at or below current
  const upgradablePlans = plans.filter(
    (p) => p.price > 0 && p.order > (plans.find((cp) => cp.name === currentPlanName)?.order ?? -1)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-background border-muted p-6">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Your watch time limit has been reached. Upgrade to keep watching.
          </DialogDescription>
        </DialogHeader>

        {fetchingPlans ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {upgradablePlans.map((plan) => {
              const color = PLAN_COLORS[plan.name] || PLAN_COLORS.free;
              const isSelected = selectedPlan?._id === plan._id;
              const isCurrentlyLoading = isLoading && isSelected;

              return (
                <div
                  key={plan._id}
                  className={`relative rounded-xl border-2 p-5 flex flex-col transition-all duration-200 hover:shadow-lg ${
                    isSelected
                      ? "border-amber-500 shadow-lg"
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                  style={{
                    borderColor: isSelected ? color : undefined,
                  }}
                >
                  {plan.name === "gold" && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      BEST VALUE
                    </div>
                  )}

                  <div className="mb-3">
                    <h3 className="text-lg font-bold" style={{ color }}>
                      {plan.displayName}
                    </h3>
                    <div className="text-2xl font-bold mt-1">
                      {formatPrice(plan.price)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        one-time
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 flex-1 mb-4">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2
                          className="w-4 h-4 shrink-0"
                          style={{ color }}
                        />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleUpgrade(plan)}
                    disabled={isLoading}
                    className="w-full h-10 rounded-lg font-semibold text-white"
                    style={{
                      backgroundColor: color,
                    }}
                  >
                    {isCurrentlyLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Upgrade to ${plan.displayName.replace(" Plan", "")}`
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="text-muted-foreground hover:bg-muted/50"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
