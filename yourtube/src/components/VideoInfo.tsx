import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Bell,
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Crown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import PremiumModal from "@/components/PremiumModal";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subCount, setSubCount] = useState(0);
  const [subLoading, setSubLoading] = useState(false);
  const [downloadLimitReached, setDownloadLimitReached] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  // Ref to always hold the latest user value so the tracking effect
  // can read it without being re-triggered by auth state changes.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  // Check subscription status
  useEffect(() => {
    if (user && video?.uploader) {
      axiosInstance
        .get(`/subscription/check/${user._id}/${video.uploader}`)
        .then((res) => {
          setIsSubscribed(res.data.subscribed);
          setSubCount(res.data.count);
        })
        .catch(() => {});
    } else if (video?.uploader) {
      axiosInstance
        .get(`/subscription/count/${video.uploader}`)
        .then((res) => setSubCount(res.data.count))
        .catch(() => {});
    }
  }, [user, video]);
  useEffect(() => {
    if (user) {
      axiosInstance
        .get(`/download/check/${user._id}`)
        .then((res) => {
          if (res.data.isPremium) {
            setDownloadLimitReached(false);
          } else {
            setDownloadLimitReached(res.data.limitReached);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleSubscribe = async () => {
    if (!user || !video?.uploader || subLoading) return;
    setSubLoading(true);
    try {
      const res = await axiosInstance.post(
        `/subscription/${video.uploader}`,
        { userId: user._id }
      );
      setIsSubscribed(res.data.subscribed);
      setSubCount((prev) => (res.data.subscribed ? prev + 1 : prev - 1));
    } catch (error) {
      console.log(error);
    } finally {
      setSubLoading(false);
    }
  };

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  // Track view/history ONCE per video. Uses a 600ms delay so that:
  // 1. StrictMode's unmount→remount clears the first timer (cleanup),
  //    meaning only the final mount's timer fires → exactly 1 API call.
  // 2. Firebase auth has time to resolve, so userRef.current is populated
  //    and we call the correct endpoint (authenticated vs guest).
  useEffect(() => {
    const timer = setTimeout(async () => {
      const currentUser = userRef.current;
      try {
        if (currentUser) {
          await axiosInstance.post(`/history/${video._id}`, {
            userId: currentUser._id,
          });
        } else {
          await axiosInstance.post(`/history/views/${video._id}`);
        }
      } catch (error) {
        console.log(error);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [video._id]);
  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleWatchLater = async () => {
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      alert("Please sign in to download videos");
      return;
    }
    if (downloadLimitReached) {
      setShowPremiumModal(true);
      return;
    }

    setIsDownloading(true);
    try {
      const res = await axiosInstance.post(`/download/${video._id}`, {
        userId: user._id,
      });

      if (res.status === 200) {
        const fileUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/${video.filepath}`;
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `${video.videotitle}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setDownloadLimitReached(true);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setDownloadLimitReached(true);
        alert(error.response.data.message || "Download limit reached.");
      } else {
        console.error("Download failed:", error);
      }
    } finally {
      setIsDownloading(false);
    }
  };
  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between md:justify-start w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
            <p className="text-sm text-muted-foreground">{formatCount(subCount)} subscribers</p>
          </div>
          </div>
          {user && user._id !== video?.uploader && (
            <Button
              className={`ml-auto md:ml-4 gap-2 w-auto h-9 px-3 md:px-4 text-xs md:text-sm rounded-full ${
                isSubscribed ? "bg-muted" : "bg-red-600 hover:bg-red-700"
              }`}
              variant={isSubscribed ? "outline" : "default"}
              size="sm"
              disabled={subLoading}
              onClick={handleSubscribe}
            >
              {isSubscribed ? (
                <>
                  <Bell className="w-4 h-4" />
                  Subscribed
                </>
              ) : (
                "Subscribe"
              )}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:gap-4 w-full md:w-auto">
          <div className="flex items-center bg-muted rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-foreground text-foreground" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-foreground text-foreground" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-muted rounded-full ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-muted rounded-full"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-muted rounded-full"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {downloadLimitReached && !user?.isPremium ? <Crown className="w-5 h-5 mr-2 text-amber-500" /> : <Download className="w-5 h-5 mr-2" />}
            {isDownloading
              ? "Downloading..."
              : downloadLimitReached && !user?.isPremium
              ? "Upgrade for more"
              : "Download"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-muted rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="bg-muted rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3 md:line-clamp-none"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium md:hidden"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onSuccess={() => {
          setDownloadLimitReached(false);
          setShowPremiumModal(false);
        }}
      />
    </div>
  );
};

export default VideoInfo;
