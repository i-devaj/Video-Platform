import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow, isToday } from "date-fns";
import { Download, Clock, MoreVertical, Play, Crown, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

export default function DownloadsPage() {
  const { user, login } = useUser();
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelSubscription = async () => {
    if (!user) return;
    try {
      setCancelling(true);
      const res = await axiosInstance.post("/payment/cancel", { userId: user._id });
      if (res.data.success) {
        login({ ...user, isPremium: false, premiumSince: null });
        toast.success("Subscription cancelled successfully.");
      }
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("Failed to cancel subscription.");
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    const fetchDownloads = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const res = await axiosInstance.get(`/download/${user._id}`);
        setDownloads(res.data);
      } catch (error) {
        console.error("Error fetching downloads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDownloads();
  }, [user]);

  const todayDownloadsCount = downloads.filter((d) => isToday(new Date(d.createdAt))).length;

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-[calc(100vh-80px)] mt-20">
        <Download className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Please sign in to view your downloads</h2>
        <p className="text-muted-foreground max-w-sm">
          Downloads are only available for signed-in users tracking their daily limit.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-80px)] mt-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Loading downloads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 mt-16">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
            <Download className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground font-medium">
          {user.isPremium ? (
            <>
              <span className="flex items-center gap-1.5 text-amber-500">
                <Crown className="w-4 h-4 fill-amber-500" />
                Premium — unlimited downloads
              </span>
              <Button
                id="cancel-subscription-btn"
                variant="destructive"
                size="sm"
                className="ml-2 gap-1.5 h-8 min-h-0 w-auto min-w-0 px-2 text-xs md:h-9 md:px-3 md:text-sm"
                onClick={handleCancelSubscription}
                disabled={cancelling}
              >
                <XCircle className="w-4 h-4" />
                {cancelling ? "Cancelling..." : "Cancel Subscription"}
              </Button>
            </>
          ) : (
            `${todayDownloadsCount} of 1 free downloads used today`
          )}
        </div>
      </div>

      {downloads.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-muted flex flex-col items-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
            <Play className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No downloads yet</h2>
          <p className="text-muted-foreground mb-6">Videos you download for offline viewing will appear here.</p>
          <Button asChild variant="secondary" className="rounded-xl px-8 h-12">
            <Link href="/">Browse Videos</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 md:gap-4">
            {downloads.map((item) => (
              <div key={item._id} className="flex flex-col sm:flex-row gap-5 group relative p-3 hover:bg-muted/50 rounded-2xl transition-all duration-300">
                <Link href={`/watch/${item.videoid._id}`} className="shrink-0">
                  <div className="relative aspect-video w-full sm:w-40 md:w-48 bg-black rounded-xl overflow-hidden ring-1 ring-white/10 shadow-lg shrink-0">
                    <video
                      src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${item.videoid.filepath}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onLoadedMetadata={(e) => { e.currentTarget.currentTime = 1; }}
                      preload="metadata"
                      muted
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />
                  </div>
                </Link>

                <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                  <div>
                    <Link href={`/watch/${item.videoid._id}`}>
                      <h3 className="text-lg font-bold line-clamp-2 leading-tight mb-2 hover:text-primary transition-colors">
                        {item.videoid.videotitle}
                      </h3>
                    </Link>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        {item.videoid.videochanel}
                      </p>
                      <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5 font-medium">
                        {item.videoid.views.toLocaleString()} views • {formatDistanceToNow(new Date(item.videoid.createdAt))} ago
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-0 flex items-center gap-2 text-xs text-primary/80 font-semibold bg-primary/5 w-fit px-3 py-1.5 rounded-full border border-primary/10">
                    <Clock className="w-3.5 h-3.5" />
                    Downloaded {formatDistanceToNow(new Date(item.createdAt))} ago
                  </div>
                </div>

                <div className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0">
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                    <MoreVertical className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
