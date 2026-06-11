import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

interface PhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (phone: string) => void;
}

export default function PhoneModal({ isOpen, onClose, onSuccess }: PhoneModalProps) {
  const { user, login } = useUser();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError("");

    // Validate: not empty, starts with + followed by digits only
    const phoneRegex = /^\+\d+$/;
    if (!phone.trim() || !phoneRegex.test(phone.trim())) {
      setError("Please enter a valid phone number with country code.");
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.patch(`/user/update/${user._id}`, {
        phone: phone.trim(),
      });
      login(response.data);
      onSuccess(phone.trim());
    } catch (err) {
      setError("Failed to save phone number. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="w-[95%] max-w-md md:max-w-lg p-4 md:p-6">
        <DialogHeader>
          <DialogTitle>Add your phone number</DialogTitle>
          <DialogDescription>
            Users outside South India require a mobile number for secure login verification.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <input
            id="phone-input"
            type="tel"
            placeholder="+91XXXXXXXXXX"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError("");
            }}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <button
            id="phone-skip-btn"
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            Skip for now
          </button>
          <button
            id="phone-save-btn"
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save and continue"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
