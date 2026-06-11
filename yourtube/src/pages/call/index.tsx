import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { Video, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CallLobby() {
  const router = useRouter();
  const { user } = useUser();
  const [roomId, setRoomId] = useState("");
  const [activeCallRoomId, setActiveCallRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveCallRoomId(localStorage.getItem("activeCallRoomId"));

      const handleStorage = (e: StorageEvent) => {
        if (e.key === "activeCallRoomId") {
          setActiveCallRoomId(e.newValue);
        }
      };
      
      // Also poll fallback in case localStorage changes in the exact same tab somehow
      const interval = setInterval(() => {
        const current = localStorage.getItem("activeCallRoomId");
        if (current !== activeCallRoomId) {
            setActiveCallRoomId(current);
        }
      }, 1000);

      window.addEventListener("storage", handleStorage);
      return () => {
          window.removeEventListener("storage", handleStorage);
          clearInterval(interval);
      };
    }
  }, [activeCallRoomId]);

  const handleCreateRoom = () => {
    // Generate a random 8 character alphanumeric string
    const generatedRoomId = Math.random().toString(36).substring(2, 10);
    window.open(`/call/${generatedRoomId}`, 'YourtubeCallWindow');
  };

  const handleJoinRoom = () => {
    if (roomId.trim() !== "") {
      window.open(`/call/${roomId.trim()}`, 'YourtubeCallWindow');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto h-full mt-20">
      <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
        <Video className="w-10 h-10 text-muted-foreground" />
      </div>
      
      <h1 className="text-3xl font-bold mb-4">Start or join a video call</h1>
      
      {activeCallRoomId && (
        <div className="w-full bg-[#0067B8]/10 border border-[#0067B8]/30 p-4 rounded-2xl mb-6 shadow-sm flex flex-col items-center">
          <PhoneCall className="w-6 h-6 text-[#4ea0ff] mb-2 animate-pulse" />
          <h3 className="text-[#a3c9ff] font-medium text-lg mb-1">Call in Progress</h3>
          <p className="text-sm text-[#8b919d] mb-4">You are currently active in room: <span className="font-mono text-[#dee3eb] bg-[#252a30] px-2 py-0.5 rounded">{activeCallRoomId}</span></p>
          <Button 
            onClick={() => window.open(`/call/${activeCallRoomId}`, 'YourtubeCallWindow')}
            className="w-full bg-[#0067B8]/80 hover:bg-[#0067B8] text-white rounded-xl"
          >
            Return to Call
          </Button>
        </div>
      )}

      {user ? (
        <div className="w-full space-y-6 mt-4">
          <p className="text-muted-foreground text-sm">
            Create a new room instantly or join an existing one by entering the room ID below.
          </p>

          <div className="flex flex-col gap-4">
            <Button
              onClick={handleCreateRoom}
              disabled={!!activeCallRoomId}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 min-h-0 text-sm md:h-12 md:text-md rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create new room
            </Button>
            
            <div className="relative border-t my-2">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-4 text-xs text-muted-foreground font-medium uppercase tracking-widest">
                Or join room
              </span>
            </div>

            <div className="flex flex-col items-center gap-3 w-full">
              <div className="flex items-center gap-3 w-full">
                <Input
                  type="text"
                  placeholder="Enter room ID"
                  value={roomId}
                  disabled={!!activeCallRoomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="flex-1 bg-muted/50 border-muted placeholder:text-muted-foreground text-center h-10 min-h-0 md:h-12 rounded-xl text-sm md:text-lg font-mono focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && roomId.trim() && !activeCallRoomId) handleJoinRoom();
                  }}
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={!roomId.trim() || !!activeCallRoomId}
                  variant="secondary"
                  className="h-10 min-h-0 w-auto min-w-0 px-6 text-sm md:h-12 md:px-8 md:text-md font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join room
                </Button>
              </div>
              {activeCallRoomId && (
                <p className="text-amber-500/90 text-xs mt-2 text-center max-w-sm">
                  You must end your active background call before creating or joining another room.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground mt-4 text-lg">
          Please sign in to use video calls.
        </p>
      )}
    </div>
  );
}
