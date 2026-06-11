import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import axiosInstance from "@/lib/axiosinstance";

interface OTPModalProps {
  isOpen: boolean;
  identifier: string;
  type: "email" | "sms";
  initialTestOtp?: string;
  onVerified: () => void;
  onClose: () => void;
}

export default function OTPModal({
  isOpen,
  identifier,
  type,
  initialTestOtp,
  onVerified,
  onClose,
}: OTPModalProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen && initialTestOtp) {
      setTimeout(() => {
        alert(`TEST DEMO: Your generated OTP is ${initialTestOtp}. It is for test purposes.`);
      }, 500);
    }
  }, [isOpen, initialTestOtp]);

  // Start countdown when modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(30);
      setOtp("");
      setError("");
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [countdown]);

  const handleVerify = async () => {
    setError("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.post("/otp/verify", { identifier, otp });
      onVerified();
    } catch (err: any) {
      const message =
        err?.response?.data?.message || "Verification failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      const res = await axiosInstance.post("/otp/send", {
        email: identifier,
        phone: identifier,
        type: type === "sms" ? "phone" : "email",
      });
      setCountdown(30);
      if (res.data.testOtp) {
        alert(`TEST DEMO: Your generated OTP is ${res.data.testOtp}. It is for test purposes.`);
      }
    } catch {
      setError("Failed to resend OTP. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="w-[95%] max-w-md md:max-w-lg p-4 md:p-6">
        <DialogHeader>
          <DialogTitle>Verify your identity</DialogTitle>
          <DialogDescription>
            {type === "email"
              ? "An OTP has been sent to your email address."
              : "An OTP has been sent to your mobile number."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <input
            id="otp-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => {
              // Allow only digits
              const val = e.target.value.replace(/\D/g, "");
              setOtp(val);
              setError("");
            }}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-[0.5em] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <button
            id="otp-resend-btn"
            type="button"
            onClick={handleResend}
            disabled={countdown > 0}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
          </button>
          <button
            id="otp-verify-btn"
            type="button"
            onClick={handleVerify}
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
