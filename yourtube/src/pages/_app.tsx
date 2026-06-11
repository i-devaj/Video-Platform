import { useEffect } from "react";
import { useRouter } from "next/router";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { ThemeProvider, useTheme } from "next-themes";
import { getLocationAndApplyTheme } from "@/lib/locationTheme";
import { SidebarProvider } from "@/lib/SidebarContext";

function ThemeController() {
  const { setTheme } = useTheme();
  useEffect(() => {
    getLocationAndApplyTheme(setTheme);
  }, []);
  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isVideoCallRoom = router.pathname === "/call/[roomId]";

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <UserProvider>
        <SidebarProvider>
          <ThemeController />
          <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
            <title>Your-Tube Clone</title>
            
            {/* Sidebar will manage its own responsive behavior (desktop hidden/mobile overlay) */}
            {!isVideoCallRoom && <Sidebar />}
            
            {/* Main content - full width on mobile */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {!isVideoCallRoom && <Header />}
              <Toaster />
              <main className="flex-1 overflow-y-auto">
                <Component {...pageProps} />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
