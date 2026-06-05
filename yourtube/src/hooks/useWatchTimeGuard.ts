import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@/lib/AuthContext";
import { getWatchLimitSeconds } from "@/lib/plans";

interface UseWatchTimeGuardOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

interface UseWatchTimeGuardReturn {
  isLimited: boolean;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  remainingSeconds: number | null;
  warningVisible: boolean;
}

export function useWatchTimeGuard({
  videoRef,
}: UseWatchTimeGuardOptions): UseWatchTimeGuardReturn {
  const { user } = useUser();
  const [isLimited, setIsLimited] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [warningVisible, setWarningVisible] = useState(false);
  const limitRef = useRef<number | null>(null);
  const isLimitedRef = useRef(false);

  // Compute limit from user's plan
  useEffect(() => {
    const plan = user?.plan || null;
    const limit = getWatchLimitSeconds(plan);
    limitRef.current = limit;

    // If user upgraded, clear the restriction
    if (limit === null || (limit !== null && !isLimitedRef.current)) {
      setIsLimited(false);
      isLimitedRef.current = false;
    }
  }, [user]);

  // Enforce time limit
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const limit = limitRef.current;
      if (limit === null) return; // unlimited

      const remaining = limit - video.currentTime;
      setRemainingSeconds(Math.max(0, Math.ceil(remaining)));

      // Show warning at 20% remaining
      if (remaining <= limit * 0.2 && remaining > 0) {
        setWarningVisible(true);
      } else {
        setWarningVisible(false);
      }

      if (video.currentTime >= limit) {
        video.pause();
        setIsLimited(true);
        isLimitedRef.current = true;
        setShowUpgradeModal(true);
        setWarningVisible(false);
      }
    };

    const onPlay = () => {
      if (isLimitedRef.current) {
        video.pause();
      }
    };

    const onSeeked = () => {
      const limit = limitRef.current;
      if (limit !== null && video.currentTime >= limit) {
        video.pause();
        setIsLimited(true);
        isLimitedRef.current = true;
        setShowUpgradeModal(true);
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("seeked", onSeeked);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [videoRef]);

  // When user upgrades mid-session, unlock playback
  const handleSetShowUpgradeModal = useCallback((show: boolean) => {
    setShowUpgradeModal(show);
    if (!show) {
      const limit = limitRef.current;
      if (limit === null) {
        // User now has unlimited — unlock
        setIsLimited(false);
        isLimitedRef.current = false;
      }
    }
  }, []);

  return {
    isLimited,
    showUpgradeModal,
    setShowUpgradeModal: handleSetShowUpgradeModal,
    remainingSeconds: limitRef.current === null ? null : remainingSeconds,
    warningVisible,
  };
}
