"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Play, Pause, Maximize, Minimize2, Volume2, VolumeX, Volume1, Settings, PictureInPicture2, Loader2, Lock } from "lucide-react";
import { useWatchTimeGuard } from "@/hooks/useWatchTimeGuard";
import UpgradeModal from "@/components/UpgradeModal";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  onSkipToNext?: () => void;
  onOpenComments?: () => void;
}

interface RippleItem { id: number; x: number; y: number }
interface ToastItem { id: number; x: number; y: number; text: string }
type Zone = "left" | "center" | "right";

export default function VideoPlayer({
  video,
  onSkipToNext,
  onOpenComments,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Watch time guard — enforces plan-based time limits
  const { isLimited, showUpgradeModal, setShowUpgradeModal, remainingSeconds, warningVisible } =
    useWatchTimeGuard({ videoRef });

  // Tap detection refs — avoids stale closures in event handlers
  const tapCount = useRef<Record<Zone, number>>({ left: 0, center: 0, right: 0 });
  const tapTimer = useRef<Record<Zone, ReturnType<typeof setTimeout> | null>>({ left: null, center: null, right: null });
  const lastPos = useRef<Record<Zone, { x: number; y: number }>>({
    left: { x: 0, y: 0 }, center: { x: 0, y: 0 }, right: { x: 0, y: 0 },
  });

  // Visual feedback state
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const uid = useRef(0);

  // Playback state for control bar
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevVolume = useRef(1);
  const dblClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount = useRef(0);
  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

  /* ── feedback helpers ── */
  const addRipple = useCallback((x: number, y: number) => {
    // Spawn 3 rings with sequential IDs so they animate with staggered delays
    const id1 = ++uid.current;
    const id2 = ++uid.current;
    const id3 = ++uid.current;
    setRipples((p) => [
      ...p,
      { id: id1, x, y },
      { id: id2, x, y },
      { id: id3, x, y },
    ]);
    setTimeout(() => setRipples((p) => p.filter((r) => r.id !== id1 && r.id !== id2 && r.id !== id3)), 900);
  }, []);

  const addToast = useCallback((x: number, y: number, text: string) => {
    const id = ++uid.current;
    setToasts((p) => [...p, { id, x, y, text }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 800);
  }, []);

  /* ── action dispatcher ── */
  const executeAction = useCallback(
    (zone: Zone, count: number) => {
      const vid = videoRef.current;
      if (!vid) return;
      const { x, y } = lastPos.current[zone];

      if (zone === "left") {
        if (count === 2) {
          vid.currentTime = Math.max(0, vid.currentTime - 10);
          addToast(x, y, "−10s");
        } else if (count >= 3) {
          addToast(x, y, "Comments");
          onOpenComments?.();
        }
      } else if (zone === "center") {
        if (count === 1) {
          if (vid.paused) { vid.play(); addToast(x, y, "Playing"); }
          else { vid.pause(); addToast(x, y, "Paused"); }
        } else if (count >= 3) {
          addToast(x, y, "Next video");
          onSkipToNext?.();
        }
      } else if (zone === "right") {
        if (count === 2) {
          vid.currentTime = Math.min(vid.duration ?? Infinity, vid.currentTime + 10);
          addToast(x, y, "+10s");
        } else if (count >= 3) {
          addToast(x, y, "Closing…");
          window.close();
        }
      }
    },
    [addToast, onOpenComments, onSkipToNext]
  );

  // Map ripple array index within a tap group to its stagger delay
  const getRippleDelay = (id: number) => `${(id % 3) * 150}ms`;

  /* ── unified tap handler ── */
  const handleTap = useCallback(
    (zone: Zone, clientX: number, clientY: number) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      addRipple(x, y);
      lastPos.current[zone] = { x, y };
      tapCount.current[zone]++;

      if (tapTimer.current[zone]) clearTimeout(tapTimer.current[zone]!);
      tapTimer.current[zone] = setTimeout(() => {
        const c = tapCount.current[zone];
        executeAction(zone, c);
        tapCount.current[zone] = 0;
        tapTimer.current[zone] = null;
      }, 300);
    },
    [addRipple, executeAction]
  );

  const onClickZone = useCallback(
    (zone: Zone) => (e: React.MouseEvent) => handleTap(zone, e.clientX, e.clientY),
    [handleTap]
  );

  const onTouchEndZone = useCallback(
    (zone: Zone) => (e: React.TouchEvent) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (t) handleTap(zone, t.clientX, t.clientY);
    },
    [handleTap]
  );

  // Stable reference for zone keys (no re-render churn)
  const ZONES: Zone[] = ["left", "center", "right"];

  /* ── autoplay when src changes ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => {
      v.play().catch(() => {/* autoplay blocked — user gesture required */});
    };
    v.addEventListener("canplay", tryPlay, { once: true });
    v.load(); // re-trigger load when video prop changes
    return () => v.removeEventListener("canplay", tryPlay);
  }, [video._id]);

  /* ── video element events ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tu = () => setTime(v.currentTime);
    const dl = () => setDur(v.duration);
    const pl = () => setPlaying(true);
    const pa = () => setPlaying(false);
    v.addEventListener("timeupdate", tu);
    v.addEventListener("loadedmetadata", dl);
    v.addEventListener("durationchange", dl);
    v.addEventListener("play", pl);
    v.addEventListener("pause", pa);
    return () => {
      v.removeEventListener("timeupdate", tu);
      v.removeEventListener("loadedmetadata", dl);
      v.removeEventListener("durationchange", dl);
      v.removeEventListener("play", pl);
      v.removeEventListener("pause", pa);
    };
  }, []);

  /* ── buffering detection ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onCanPlay = () => setBuffering(false);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("canplay", onCanPlay);
    return () => {
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("canplay", onCanPlay);
    };
  }, []);

  /* ── sync volume to video element ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = muted ? 0 : volume;
    v.muted = muted;
  }, [volume, muted]);

  /* ── sync speed to video element ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
  }, [speed]);

  /* ── scroll wheel volume ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setMuted(false);
      setVolume((prev) => {
        const next = Math.max(0, Math.min(1, prev - e.deltaY * 0.001));
        return Math.round(next * 100) / 100;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const toggleMute = () => {
    if (muted) {
      setMuted(false);
      setVolume(prevVolume.current || 0.5);
    } else {
      prevVolume.current = volume;
      setMuted(true);
    }
  };

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  /* ── auto-hide controls ── */
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
        setShowSpeedMenu(false);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = () => showControls();
    el.addEventListener("mousemove", onMove);
    el.addEventListener("touchstart", onMove);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("touchstart", onMove);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showControls]);

  // Show controls when paused
  useEffect(() => {
    if (!playing) setControlsVisible(true);
    else showControls();
  }, [playing, showControls]);

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const v = videoRef.current;
      if (!v) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          v.paused ? v.play() : v.pause();
          break;
        case "arrowleft":
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 5);
          break;
        case "arrowright":
          e.preventDefault();
          v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
          break;
        case "arrowup":
          e.preventDefault();
          setMuted(false);
          setVolume((p) => Math.min(1, Math.round((p + 0.05) * 100) / 100));
          break;
        case "arrowdown":
          e.preventDefault();
          setVolume((p) => {
            const next = Math.max(0, Math.round((p - 0.05) * 100) / 100);
            if (next === 0) setMuted(true);
            return next;
          });
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          const el = containerRef.current;
          if (el) document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen();
          break;
        case "p":
          e.preventDefault();
          if (document.pictureInPictureElement) document.exitPictureInPicture();
          else v.requestPictureInPicture?.();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMute]);

  /* ── double-click center zone → fullscreen ── */
  const handleCenterClick = useCallback((e: React.MouseEvent) => {
    clickCount.current++;
    handleTap("center", e.clientX, e.clientY);

    if (dblClickTimer.current) clearTimeout(dblClickTimer.current);
    dblClickTimer.current = setTimeout(() => {
      clickCount.current = 0;
    }, 300);

    if (clickCount.current === 2) {
      clickCount.current = 0;
      const el = containerRef.current;
      if (el) document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen();
    }
  }, [handleTap]);

  const togglePiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch { /* PiP not supported */ }
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(dur, ((e.clientX - rect.left) / rect.width) * dur));
  };

  /* ── render ── */
  return (
    <div
      ref={containerRef}
      className={`relative aspect-video bg-black rounded-lg overflow-hidden ${
        controlsVisible ? "cursor-default" : "cursor-none"
      }`}
      tabIndex={0}
    >
      {/* keyframes for ripple rings + toast */}
      <style>{`
        @keyframes gp-ring {
          0%   { transform: translate(-50%,-50%) scale(0);   opacity: 0.7; }
          60%  { opacity: 0.35; }
          100% { transform: translate(-50%,-50%) scale(3.5); opacity: 0;   }
        }
        @keyframes gp-toast {
          0%   { opacity: 0; transform: translate(-50%,-120%) scale(.8) }
          15%  { opacity: 1; transform: translate(-50%,-120%) scale(1)  }
          80%  { opacity: 1; transform: translate(-50%,-120%) scale(1)  }
          100% { opacity: 0; transform: translate(-50%,-120%) scale(.9) }
        }
      `}</style>

      {/* video element — pointer-events disabled so taps hit the overlay */}
      <video
        ref={videoRef}
        className="w-full h-full pointer-events-none"
        src={`${process.env.BACKEND_URL}/${video?.filepath}`}
        preload="metadata"
      />

      {/* gesture overlay — 3 equal vertical zones */}
      <div ref={overlayRef} className="absolute inset-0" style={{ zIndex: 10, pointerEvents: "all" }}>
        {ZONES.map((zone, i) => (
          <div
            key={zone}
            className="absolute top-0 h-full cursor-pointer bg-transparent"
            style={{ width: "33.33%", left: `${i * 33.33}%` }}
            onClick={i === 1 ? handleCenterClick : onClickZone(zone)}
            onTouchEnd={onTouchEndZone(zone)}
          />
        ))}

        {/* buffering spinner */}
        {buffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </div>
        )}

        {/* concentric ring ripples — each triplet of IDs shares same x/y but gets a staggered delay */}
        {ripples.map((r) => (
          <div
            key={r.id}
            className="absolute w-20 h-20 rounded-full border-2 border-white/60 pointer-events-none"
            style={{
              left: r.x,
              top: r.y,
              animation: `gp-ring 750ms ease-out forwards`,
              animationDelay: getRippleDelay(r.id),
            }}
          />
        ))}

        {/* toasts */}
        {toasts.map((t) => (
          <div
            key={t.id}
            className="absolute pointer-events-none bg-black/70 text-white text-sm px-3 py-1.5 rounded-full whitespace-nowrap font-medium"
            style={{ left: t.x, top: t.y, animation: "gp-toast 800ms ease-out forwards" }}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* watch time limit overlay */}
      {isLimited && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white" style={{ zIndex: 30 }}>
          <Lock className="w-12 h-12 mb-4 text-amber-500" />
          <h3 className="text-xl font-bold mb-2">Watch time limit reached</h3>
          <p className="text-sm text-white/70 mb-4">Upgrade your plan to continue watching</p>
          <button
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
            onClick={() => setShowUpgradeModal(true)}
          >
            Upgrade Plan
          </button>
        </div>
      )}

      {/* watch time warning toast */}
      {warningVisible && remainingSeconds !== null && !isLimited && (
        <div className="absolute top-4 right-4 bg-amber-500/90 text-white text-sm px-4 py-2 rounded-lg font-medium shadow-lg" style={{ zIndex: 25 }}>
          ⏱ {remainingSeconds}s remaining on your plan
        </div>
      )}

      {/* control bar — auto-hides after 3s */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ zIndex: 20, pointerEvents: controlsVisible ? "all" : "none" }}
      >
        {/* progress bar */}
        <div
          className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-2 hover:h-1.5 transition-all"
          onClick={seekTo}
        >
          <div
            className="h-full bg-red-600 rounded-full relative"
            style={{ width: `${dur ? (time / dur) * 100 : 0}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* buttons row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <button className="hover:opacity-80 transition-opacity" onClick={() => { const v = videoRef.current; if (v) v.paused ? v.play() : v.pause(); }}>
              {playing ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* volume control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button className="hover:opacity-80 transition-opacity" onClick={toggleMute}>
                <VolumeIcon className="w-5 h-5" />
              </button>
              <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-200">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    setMuted(val === 0);
                  }}
                  className="w-full h-1 accent-white cursor-pointer"
                />
              </div>
            </div>

            <span className="text-xs">{fmt(time)} / {fmt(dur)}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* speed selector */}
            <div className="relative">
              <button
                className="hover:opacity-80 transition-opacity flex items-center gap-1 text-xs"
                onClick={() => setShowSpeedMenu((p) => !p)}
              >
                <Settings className="w-4 h-4" />
                {speed !== 1 && <span>{speed}×</span>}
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-8 right-0 bg-black/90 backdrop-blur rounded-lg py-1 min-w-[100px] shadow-lg">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      className={`w-full text-left px-4 py-1.5 text-sm hover:bg-white/20 transition-colors ${
                        speed === s ? "text-blue-400 font-semibold" : "text-white"
                      }`}
                      onClick={() => { setSpeed(s); setShowSpeedMenu(false); }}
                    >
                      {s === 1 ? "Normal" : `${s}×`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="hover:opacity-80 transition-opacity"
              title="Picture-in-Picture (P)"
              onClick={togglePiP}
            >
              <PictureInPicture2 className="w-5 h-5" />
            </button>
            <button
              className="hover:opacity-80 transition-opacity"
              title="Fullscreen (F)"
              onClick={() => {
                const el = containerRef.current;
                if (!el) return;
                document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen();
              }}
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* upgrade modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
