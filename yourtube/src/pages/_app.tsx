import { useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { ThemeProvider, useTheme } from "next-themes";
import { getLocationAndApplyTheme } from "@/lib/locationTheme";

function ThemeController() {
  const { setTheme } = useTheme();
  useEffect(() => {
    getLocationAndApplyTheme(setTheme);
  }, []);
  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <UserProvider>
        <ThemeController />
        <div className="min-h-screen bg-background text-foreground">
          <title>Your-Tube Clone</title>
          <Header />
          <Toaster />
          <div className="flex">
            <Sidebar />
            <Component {...pageProps} />
          </div>
        </div>
      </UserProvider>
    </ThemeProvider>
  );
}
