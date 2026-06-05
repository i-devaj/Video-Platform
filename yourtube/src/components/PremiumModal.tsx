import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, CheckCircle2, Loader2 } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, login } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-checkout-js")) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handleUpgradeClick = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        alert("Failed to load payment gateway. Please check your internet connection.");
        setIsLoading(false);
        return;
      }

      // Create Order
      const { data: order } = await axiosInstance.post("/payment/createorder");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        order_id: order.id,
        name: "FlexTube Premium",
        description: "Unlimited video downloads",
        prefill: {
          name: user.name || "User",
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await axiosInstance.post("/payment/verify", {
              ...response,
              userId: user._id,
            });

            if (verifyRes.data.success) {
              // The verify endpoint doesn't return the full updated user object in the current implementation,
              // so we optimally mutate the local object to force context propagation across the app.
              login({ ...user, isPremium: true });
              onSuccess();
              onClose();
            }
          } catch (error) {
            console.error("Payment verification failed", error);
            alert("Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: function () {
            // Modal closed by user natively
            setIsLoading(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        console.error("Payment failed", response.error);
        alert("Payment failed: " + response.error.description);
        setIsLoading(false);
      });
      rzp.open();
    } catch (error) {
      console.error("Error during order initialization", error);
      alert("Failed to initialize payment. Please try again later.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background border-muted flex flex-col items-center text-center p-8">
        <DialogHeader className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 text-amber-500" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight mb-2">Upgrade to Premium</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground max-w-[280px]">
            Free users can download 1 video per day. Upgrade for unlimited downloads.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full bg-muted/30 rounded-xl p-5 my-6 space-y-3 text-left border border-muted/50">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium">Unlimited video downloads</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium">Priority support</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium">No daily limits</span>
          </div>
        </div>

        <div className="text-3xl font-bold mb-6">
          ₹99 <span className="text-lg text-muted-foreground font-normal">/ month</span>
        </div>

        <div className="w-full flex flex-col gap-3">
          <Button
            onClick={handleUpgradeClick}
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white h-12 text-md rounded-xl font-semibold shadow-lg shadow-amber-500/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Upgrade Now"
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="w-full h-12 text-muted-foreground hover:bg-muted/50 rounded-xl"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumModal;
