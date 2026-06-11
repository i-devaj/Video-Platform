import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Video,
  Download,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";
import { useSidebar } from "@/lib/SidebarContext";
import { X } from "lucide-react";

const Sidebar = () => {
  const { user } = useUser();
  const { isMobileOpen, closeMobile } = useSidebar();
  const [isdialogeopen, setisdialogeopen] = useState(false);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={closeMobile}
        />
      )}
      
      {/* Sidebar Container */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 bg-background border-r
          w-64 transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:flex md:flex-col md:flex-shrink-0
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between p-4 md:hidden border-b">
          <span className="font-medium text-lg">Menu</span>
          <Button variant="ghost" size="icon" onClick={closeMobile}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <nav className="space-y-2 p-2 overflow-y-auto flex-1">
        <Link href="/" className="block" onClick={closeMobile}>
          <Button variant="ghost" className="w-full justify-start">
            <Home className="w-5 h-5 mr-3" />
            Home
          </Button>
        </Link>
        <Link href="/explore" className="block" onClick={closeMobile}>
          <Button variant="ghost" className="w-full justify-start">
            <Compass className="w-5 h-5 mr-3" />
            Explore
          </Button>
        </Link>
        <Link href="/subscriptions" className="block" onClick={closeMobile}>
          <Button variant="ghost" className="w-full justify-start">
            <PlaySquare className="w-5 h-5 mr-3" />
            Subscriptions
          </Button>
        </Link>

        {user && (
          <>
            <div className="border-t pt-3 mt-3 space-y-2">
              <Link href="/call" className="block" onClick={closeMobile}>
                <Button variant="ghost" className="w-full justify-start">
                  <Video className="w-5 h-5 mr-3" />
                  Video call
                </Button>
              </Link>
              <Link href="/history" className="block" onClick={closeMobile}>
                <Button variant="ghost" className="w-full justify-start">
                  <History className="w-5 h-5 mr-3" />
                  History
                </Button>
              </Link>
              <Link href="/liked" className="block" onClick={closeMobile}>
                <Button variant="ghost" className="w-full justify-start">
                  <ThumbsUp className="w-5 h-5 mr-3" />
                  Liked videos
                </Button>
              </Link>
              <Link href="/watch-later" className="block" onClick={closeMobile}>
                <Button variant="ghost" className="w-full justify-start">
                  <Clock className="w-5 h-5 mr-3" />
                  Watch later
                </Button>
              </Link>
              <Link href="/downloads" className="block" onClick={closeMobile}>
                <Button variant="ghost" className="w-full justify-start">
                  <Download className="w-5 h-5 mr-3" />
                  Downloads
                </Button>
              </Link>
              <Link href="/pricing" className="block" onClick={closeMobile}>
                <Button variant="ghost" className="w-full justify-start">
                  <Sparkles className="w-5 h-5 mr-3 text-amber-500" />
                  Plans & Pricing
                </Button>
              </Link>
              {user?.channelname ? (
                <Link href={`/channel/${user?._id}`} className="block" onClick={closeMobile}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="w-5 h-5 mr-3" />
                    Your channel
                  </Button>
                </Link>
              ) : (
                <div className="px-2 py-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setisdialogeopen(true)}
                  >
                    Create Channel
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </aside>
    </>
  );
};

export default Sidebar;
