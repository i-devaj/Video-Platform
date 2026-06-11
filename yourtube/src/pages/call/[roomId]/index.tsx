import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Circle,
  StopCircle,
  PhoneOff,
  Copy,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  }
];

export default function CallRoom() {
  const router = useRouter();
  const { roomId } = router.query;
  const { user } = useUser();

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteSidebarVideoRef = useRef<HTMLVideoElement>(null);
  const mainScreenVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // WebRTC refs
  const wsRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const cameraSenderRef = useRef<RTCRtpSender | null>(null);
  const micSenderRef = useRef<RTCRtpSender | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteCameraStreamRef = useRef<MediaStream | null>(null);
  const remoteScreenStreamRef = useRef<MediaStream | null>(null);
  const screenTransceiverRef = useRef<RTCRtpTransceiver | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const remoteUserNameRef = useRef<string | null>(null);
  const isPolite = useRef<boolean>(false);
  const makingOffer = useRef<boolean>(false);
  const ignoreOffer = useRef<boolean>(false);

  // UI state
  const [callStatus, setCallStatus] = useState("Waiting for someone to join...");
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const [isRemoteCameraOn, setIsRemoteCameraOn] = useState(true);
  const [remoteUserName, setRemoteUserName] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasScreenShare = isScreenSharing || isRemoteScreenSharing;

  // Reactivity engine for the dynamic right sidebar DOM unmounts/mounts & camera toggle refreshes
  useEffect(() => {
    // Refresh main remote video if camera is toggled back on
    if (isRemoteCameraOn && remoteVideoRef.current && remoteCameraStreamRef.current) {
        // Re-binding the same stream often kicks the browser's stalled video renderer
        if (remoteVideoRef.current.srcObject !== remoteCameraStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteCameraStreamRef.current;
        }
        remoteVideoRef.current.play().catch(() => {});
    }

    if (hasScreenShare && remoteSidebarVideoRef.current && remoteCameraStreamRef.current) {
      if (remoteSidebarVideoRef.current.srcObject !== remoteCameraStreamRef.current) {
          remoteSidebarVideoRef.current.srcObject = remoteCameraStreamRef.current;
      }
      remoteSidebarVideoRef.current.play().catch(() => {});
    }

    if (remoteAudioRef.current && remoteCameraStreamRef.current) {
      if (remoteAudioRef.current.srcObject !== remoteCameraStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteCameraStreamRef.current;
      }
      remoteAudioRef.current.play().catch(() => {});
    }
    
    // Explicitly re-hydrate the main Stage if Local User is sharing
    if (hasScreenShare && isScreenSharing && mainScreenVideoRef.current && screenStreamRef.current) {
      mainScreenVideoRef.current.srcObject = screenStreamRef.current;
    }
    
    // Explicitly re-hydrate the main Stage if Remote User is sharing
    if (hasScreenShare && isRemoteScreenSharing && mainScreenVideoRef.current && remoteScreenStreamRef.current) {
      mainScreenVideoRef.current.srcObject = remoteScreenStreamRef.current;
    }
  }, [hasScreenShare, isScreenSharing, isRemoteScreenSharing, isRemoteCameraOn]);

  // ── Cleanup function ──
  const cleanup = useCallback(() => {
    const rid = typeof roomId === "string" ? roomId : "";
    // Notify signaling server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "leave", roomId: rid }));
      wsRef.current.close();
    }
    wsRef.current = null;
    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    // Stop screen sharing tracks if active
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    // Clear video element sources
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    // Close peer connection
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    // Stop recording if active so file gets saved
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    // Clear localStorage active call pointer
    if (typeof window !== "undefined" && localStorage.getItem("activeCallRoomId") === rid) {
      localStorage.removeItem("activeCallRoomId");
    }
  }, [roomId]);

  const handleEndCall = useCallback(() => {
    cleanup();
    setCallStatus("Call ended");
    if (typeof window !== "undefined" && window.opener) {
      window.close();
    } else {
      router.push("/call");
    }
  }, [cleanup, router]);

  // ── WebRTC setup ──
  useEffect(() => {
    // Wait for router to be ready with roomId
    if (!roomId || typeof roomId !== "string") return;

    // Set localStorage flag so lobby tab shows this call
    if (typeof window !== "undefined") {
      localStorage.setItem("activeCallRoomId", roomId);
    }

    const handleUnload = () => {
      if (localStorage.getItem("activeCallRoomId") === roomId) {
        localStorage.removeItem("activeCallRoomId");
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    
    const userId = user?._id || `anon-${Date.now()}`;
    const userName = user?.username || user?.name || user?.email?.split('@')[0] || "Guest";

    let mounted = true;

    const init = async () => {
      // 1. Get local media
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (err) {
        console.error("Failed to get media:", err);
        alert("Camera/microphone access is required for the call.");
        return;
      }
      if (!mounted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerRef.current = pc;

      // --- PERFECT NEGOTIATION: onnegotiationneeded ---
      pc.onnegotiationneeded = async () => {
        try {
          makingOffer.current = true;
          await pc.setLocalDescription();
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ 
              type: "offer", 
              offer: pc.localDescription, 
              roomId, 
              userName: user?.username || user?.name || user?.email?.split('@')[0] || "Guest"
            }));
          }
        } catch (err) {
          console.error("Negotiation error:", err);
        } finally {
          makingOffer.current = false;
        }
      };

      // Primary Hardware Streams — Must use addTrack for Edge/Firefox organic SDP mapping
      stream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream);
        if (track.kind === "video") cameraSenderRef.current = sender;
        if (track.kind === "audio") micSenderRef.current = sender;
      });

      // #2 Secondary Transceiver explicitly pre-allocated for Screen Share pipeline
      const screenTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });
      screenTransceiverRef.current = screenTransceiver;

      // Pre-warm the remote inbound structure statically to avoid async track arrival race-condition loss
      if (!remoteCameraStreamRef.current) {
         remoteCameraStreamRef.current = new MediaStream();
      }

      // Handle dual remote tracks sequentially from transceivers mapped above
      let remoteVideoCount = 0;
      pc.ontrack = (event) => {
        if (event.track.kind === "video") {
           remoteVideoCount++;
           if (remoteVideoCount === 1) {
             remoteCameraStreamRef.current?.addTrack(event.track);
             if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteCameraStreamRef.current;
             if (remoteSidebarVideoRef.current) remoteSidebarVideoRef.current.srcObject = remoteCameraStreamRef.current;
           } else if (remoteVideoCount === 2) {
             const scrStream = event.streams[0] || new MediaStream([event.track]);
             remoteScreenStreamRef.current = scrStream;
             if (mainScreenVideoRef.current) mainScreenVideoRef.current.srcObject = scrStream;
           }
        } else if (event.track.kind === "audio") {
          console.log("Remote audio track received");
          remoteCameraStreamRef.current?.addTrack(event.track);
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteCameraStreamRef.current || null;
            remoteAudioRef.current.play().catch(e => console.error("Audio play error:", e));
          }
        }
        if (mounted) setCallStatus("Connected");
      };

      // 3. Open WebSocket to signaling server
      // Use NEXT_PUBLIC_BACKEND_URL if available, otherwise fallback to localhost
      // Need to replace http/https with ws/wss for the WebSocket connection
      let wsUrl = `ws://${window.location.hostname}:5000`;
      if (process.env.NEXT_PUBLIC_BACKEND_URL) {
        wsUrl = process.env.NEXT_PUBLIC_BACKEND_URL.replace(/^http/, "ws");
      } else if (process.env.BACKEND_URL) {
        wsUrl = process.env.BACKEND_URL.replace(/^http/, "ws");
      }
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Join the room
        ws.send(JSON.stringify({ 
          type: "join", 
          roomId, 
          userId, 
          userName
        }));
      };

      // Handle ICE candidates — send to signaling server
      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "ice-candidate",
              candidate: event.candidate,
              roomId,
            })
          );
        }
      };

      // 4. Handle signaling messages
      ws.onmessage = async (event) => {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        switch (msg.type) {
          case "joined": {
            isPolite.current = msg.isPolite;
            console.log("Joined room. I am polite:", isPolite.current);
            // Re-trigger negotiation now that socket is open and role is assigned
            pc.onnegotiationneeded?.(new Event('negotiationneeded'));
            break;
          }

          case "user-joined": {
            if (msg.userName && !remoteUserNameRef.current) {
              remoteUserNameRef.current = msg.userName;
              setRemoteUserName(msg.userName);
            }
            if (mounted) setCallStatus("Connected");
            // Re-trigger negotiation to ensure offer is sent to the new peer
            pc.onnegotiationneeded?.(new Event('negotiationneeded'));
            break;
          }

          case "offer": {
            if (msg.userName && !remoteUserNameRef.current) {
              remoteUserNameRef.current = msg.userName;
              setRemoteUserName(msg.userName);
            }
            
            const collision = (makingOffer.current || pc.signalingState !== "stable");
            ignoreOffer.current = !isPolite.current && collision;
            if (ignoreOffer.current) {
               console.log("Collision: ignoring offer (impolite)");
               return;
            }

            try {
              if (collision && isPolite.current) {
                console.log("Collision: rolling back local offer (polite)");
                await pc.setLocalDescription({ type: "rollback" });
              }
              await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
              await pc.setLocalDescription();
              ws.send(JSON.stringify({ 
                type: "answer", 
                answer: pc.localDescription, 
                roomId, 
                userName 
              }));
              if (mounted) setCallStatus("Connected");
            } catch (err) {
              console.error("Error handling offer:", err);
            }
            break;
          }

          case "answer": {
            if (msg.userName && !remoteUserNameRef.current) {
              remoteUserNameRef.current = msg.userName;
              setRemoteUserName(msg.userName);
            }
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
            } catch (err) {
              console.error("Error setting answer:", err);
            }
            break;
          }

          case "ice-candidate": {
            try {
              if (msg.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
              }
            } catch (err) {
              if (!ignoreOffer.current) {
                console.error("Error adding ICE candidate:", err);
              }
            }
            break;
          }

          case "screen-share-status": {
            if (mounted) {
              setIsRemoteScreenSharing(msg.isSharing);
            }
            break;
          }

          case "camera-status": {
            if (mounted) {
              setIsRemoteCameraOn(msg.isCameraOn);
            }
            break;
          }

          case "user-left": {
            if (mounted) {
              setCallStatus("Call ended");
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
              }
            }
            break;
          }

          case "room-full": {
            alert("This room is full. Only 2 participants allowed.");
            if (mounted) {
              if (typeof window !== "undefined" && window.opener) {
                window.close();
              } else {
                router.push("/call");
              }
            }
            break;
          }
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
      };
    };

    init();

    return () => {
      mounted = false;
      cleanup();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [roomId, user, cleanup, router]);

  // ── Toggle camera track ──
  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    if (isCameraOn) {
      // Turn OFF: completely stop the track to turn off the hardware light
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        stream.removeTrack(videoTrack);
      }
      
      // Important: Push 'null' to the structural sender so the remote peer receives blank pipeline logic
      if (cameraSenderRef.current && !isScreenSharing) {
        cameraSenderRef.current.replaceTrack(null);
      }

      setIsCameraOn(false);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "camera-status", isCameraOn: false, roomId }));
      }
    } else {
      // Turn ON: re-request video access
      try {
        const stream = localStreamRef.current;
        if (!stream) return;
        
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = newStream.getVideoTracks()[0];
        stream.addTrack(newVideoTrack);

        // Target mapped exact structural sender
        if (cameraSenderRef.current && !isScreenSharing) {
          await cameraSenderRef.current.replaceTrack(newVideoTrack);
        }
        
        // Update local preview
        if (localVideoRef.current) {
           localVideoRef.current.srcObject = stream;
        }
        
        setIsCameraOn(true);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const uName = user?.username || user?.name || user?.email?.split('@')[0] || "Guest";
          wsRef.current.send(JSON.stringify({ type: "camera-status", isCameraOn: true, roomId, userName: uName }));
        }
      } catch (err) {
        console.error("Could not restart camera", err);
        alert("Failed to turn camera back on. Please check permissions.");
      }
    }
  }, [isCameraOn, isScreenSharing]);

  // ── Toggle mic track ──
  const toggleMic = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  }, []);

  // ── Screen share ──
  const stopScreenShare = useCallback(() => {
    // Yank the screen track structurally from the secondary transceiver
    if (screenTransceiverRef.current) {
      screenTransceiverRef.current.sender.replaceTrack(null);
    }
    
    // Stop tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    
    setIsScreenSharing(false);
    
    // Notify bounds
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "screen-share-status", isSharing: false, roomId }));
    }
  }, [roomId]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        selfBrowserSurface: "exclude",
        audio: false,
      } as any);
      screenStreamRef.current = screenStream;

      const screenTrack = screenStream.getVideoTracks()[0];

      // Bind screen track to native secondary transceiver
      if (screenTransceiverRef.current) {
        await screenTransceiverRef.current.sender.replaceTrack(screenTrack);
      }

      // Show locally via Stage ref
      if (mainScreenVideoRef.current) {
        mainScreenVideoRef.current.srcObject = screenStream;
      }

      setIsScreenSharing(true);
      
      // Notify remote peer to trigger layout shift
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "screen-share-status", isSharing: true, roomId }));
      }

      // Auto-stop when user clicks browser's "Stop sharing" button
      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.log("Screen share cancelled:", err);
    }
  }, [isScreenSharing, stopScreenShare, roomId]);

  // ── Call Recording ──
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    const localStream = localStreamRef.current;
    const remoteStream = remoteVideoRef.current?.srcObject as MediaStream | null;
    if (!localStream) return;

    try {
      // Combine local + remote streams
      const combinedStream = new MediaStream();
      localStream.getTracks().forEach((track) => combinedStream.addTrack(track));
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => combinedStream.addTrack(track));
      }

      let mimeType = "video/webm;codecs=vp9";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm";
      }

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `call-recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        recordedChunksRef.current = [];
        setIsRecording(false);
      };

      recorder.start(1000); // 1s chunks
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [isRecording]);
  const copyRoomId = useCallback(() => {
    if (!roomId || typeof roomId !== "string") return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  return (
    <div className="fixed inset-0 w-full h-screen bg-[#0f1419] flex flex-col overflow-hidden">
      {/* ── Status Bar (top) ── */}
      <div className="relative z-20 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              callStatus === "Connected"
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                : callStatus === "Call ended"
                ? "bg-red-500"
                : "bg-amber-400 animate-pulse"
            }`}
          />
          <span className="text-sm font-medium text-[#c1c7d3] tracking-wide">
            {callStatus}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8b919d] font-mono bg-[#1b2026] px-2 py-1 rounded-lg border border-[#414751]/20 flex items-center gap-2">
            <span className="opacity-60">Room:</span> 
            <span className="text-[#dee3eb]">{roomId || "—"}</span>
            <button 
              onClick={copyRoomId}
              className="ml-1 p-1 hover:bg-[#30353b] rounded-md transition-colors text-[#a3c9ff]"
              title="Copy Room ID"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </span>
        </div>
      </div>

      {/* ── Dynamic Main Video Area ── */}
      <div className={`flex-1 relative flex overflow-hidden transition-all duration-300 ${hasScreenShare ? "p-6 gap-6" : ""}`}>
        
        {/* Stage 1: The Primary Display (Remote Cam or Screen Share) */}
        <div className={`relative flex-1 transition-all duration-500 overflow-hidden ${hasScreenShare ? "rounded-2xl bg-[#0b0f13] ring-1 ring-[#0067B8]/30 shadow-[0_0_30px_rgba(0,103,184,0.15)] flex-[3]" : ""}`}>
          
          {/* Remote Camera Background Element (Fades out when Screen Share is active) */}
          <video
            ref={remoteVideoRef}
            autoPlay playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hasScreenShare ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          />

          {!isRemoteCameraOn && !hasScreenShare && (
              <div className="absolute inset-0 bg-[#0b0f13] flex flex-col items-center justify-center z-10 transition-opacity duration-500">
                <VideoOff className="w-16 h-16 text-[#414751] mb-4" />
                <span className="text-[#c1c7d3] text-lg font-medium tracking-wide">{remoteUserName || "Remote Peer"}'s Camera Off</span>
              </div>
          )}
          
          {/* Active Stage Renderer (Fades in when Screen Share is active) */}
          <video
            ref={mainScreenVideoRef}
            autoPlay playsInline muted={isScreenSharing}
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${hasScreenShare ? "opacity-100 bg-[#0b0f13]" : "opacity-0 pointer-events-none"}`}
          />

          {/* Empty state overlay when nobody is sharing AND no remote camera stream */}
          {!hasScreenShare && callStatus.includes("Waiting") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <div className="w-24 h-24 rounded-full bg-[#1b2026] flex items-center justify-center mb-6">
                <Video className="w-10 h-10 text-[#414751]" />
              </div>
              <p className="text-[#8b919d] text-lg font-medium">Waiting for peer to connect...</p>
              <div className="flex items-center gap-2 mt-2 bg-[#1b2026] pl-3 pr-1 py-1 rounded-xl border border-[#414751]/30">
                <p className="text-[#414751] text-sm font-mono truncate max-w-[200px]">ID: {roomId || ""}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={copyRoomId}
                  className="h-8 gap-2 text-xs font-semibold text-[#a3c9ff] hover:text-[#dee3eb] hover:bg-[#30353b] rounded-lg"
                >
                  {copied ? (
                    <>
                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy ID
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Stage 2: The Camera Sidebar (OR PiP) */}
        <div className={`transition-all duration-500 z-30 ${hasScreenShare ? "w-[22rem] flex flex-col gap-4 relative" : "absolute bottom-24 right-6 group"}`}>
          
          {/* Remote Camera in Sidebar (Only mounts here when screen sharing takes over main stage) */}
          {hasScreenShare && (
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-[#171c22] ring-1 ring-[#414751]/20 relative shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
              <video
                ref={remoteSidebarVideoRef}
                autoPlay playsInline
                className="w-full h-full object-cover"
              />
              {!isRemoteCameraOn && (
                <div className="absolute inset-0 bg-[#0b0f13] flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-[#414751]" />
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-3 py-1 rounded-full bg-[#0f1419]/70 backdrop-blur-md">
                <span className="text-[11px] text-[#c1c7d3] font-medium tracking-wide">{remoteUserName || "Remote Peer"}</span>
              </div>
            </div>
          )}

          {/* Local Camera (Flexible from PiP size to Sidebar size) */}
          <div className={`rounded-xl overflow-hidden bg-[#171c22] ring-1 ring-[#414751]/20 relative shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-500 ${hasScreenShare ? "w-full aspect-video" : "w-24 h-24 md:w-32 md:h-32"}`}>
            <video
              ref={localVideoRef}
              autoPlay playsInline muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {/* Camera off overlay */}
            {!isCameraOn && (
              <div className="absolute inset-0 bg-[#1b2026] flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-[#414751]" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-3 py-1 rounded-full bg-[#0f1419]/70 backdrop-blur-md">
              <span className="text-[11px] text-[#c1c7d3] font-medium tracking-wide">You</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Control Bar (bottom) — Glassmorphism ── */}
      <div className="relative z-20 flex items-center justify-center py-5 px-6 mb-16 md:mb-20">
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 px-3 md:px-6 py-2 md:py-4 rounded-2xl bg-[#30353b]/65 backdrop-blur-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
          {/* Camera toggle */}
          <button
            id="toggle-camera"
            onClick={toggleCamera}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
              isCameraOn
                ? "bg-[#252a30] hover:bg-[#353a40] text-[#dee3eb]"
                : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
            }`}
            title={isCameraOn ? "Turn off camera" : "Turn on camera"}
          >
            {isCameraOn ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </button>

          {/* Mic toggle */}
          <button
            id="toggle-mic"
            onClick={toggleMic}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
              isMicOn
                ? "bg-[#252a30] hover:bg-[#353a40] text-[#dee3eb]"
                : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
            }`}
            title={isMicOn ? "Mute microphone" : "Unmute microphone"}
          >
            {isMicOn ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-[#414751]/30 mx-1" />

          {/* Screen share */}
          <button
            id="toggle-screenshare"
            onClick={toggleScreenShare}
            disabled={!isScreenSharing && isRemoteScreenSharing}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
              isScreenSharing
                ? "bg-[#0067B8]/20 hover:bg-[#0067B8]/30 text-[#a3c9ff]"
                : !isScreenSharing && isRemoteScreenSharing
                ? "bg-[#252a30]/30 text-[#414751] cursor-not-allowed"
                : "bg-[#252a30] hover:bg-[#353a40] text-[#dee3eb]"
            }`}
            title={!isScreenSharing && isRemoteScreenSharing ? "Other peer is sharing" : isScreenSharing ? "Stop sharing" : "Share screen"}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
          </button>

          {/* Record */}
          <button
            id="toggle-recording"
            onClick={toggleRecording}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
              isRecording
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                : "bg-[#252a30] hover:bg-[#353a40] text-red-400"
            }`}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? (
              <StopCircle className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5 fill-red-500" />
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-[#414751]/30 mx-1" />

          {/* End call */}
          <button
            id="end-call"
            onClick={handleEndCall}
            className="w-12 h-10 md:w-14 md:h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white transition-all duration-200 shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
            title="End call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Hidden Audio Sink for Remote Audio Reliability ── */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* ── Ambient CSS ── */}
      <style jsx>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(52, 211, 153, 0); }
          100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
        }
      `}</style>
    </div>
  );
}
