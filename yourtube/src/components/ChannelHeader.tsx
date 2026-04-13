import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Bell, BellOff } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

const ChannelHeader = ({ channel, user }: any) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subCount, setSubCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && channel && user._id !== channel._id) {
      checkSubscription();
    }
    if (channel) {
      getSubCount();
    }
  }, [user, channel]);

  const checkSubscription = async () => {
    try {
      const res = await axiosInstance.get(
        `/subscription/check/${user._id}/${channel._id}`
      );
      setIsSubscribed(res.data.subscribed);
      setSubCount(res.data.count);
    } catch (error) {
      console.log(error);
    }
  };

  const getSubCount = async () => {
    try {
      const res = await axiosInstance.get(
        `/subscription/count/${channel._id}`
      );
      setSubCount(res.data.count);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubscribe = async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const res = await axiosInstance.post(`/subscription/${channel._id}`, {
        userId: user._id,
      });
      setIsSubscribed(res.data.subscribed);
      setSubCount((prev) => (res.data.subscribed ? prev + 1 : prev - 1));
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="w-full">
      {/* Banner */}
      <div className="relative h-32 md:h-48 lg:h-64 bg-gradient-to-r from-blue-400 to-purple-500 overflow-hidden"></div>

      {/* Channel Info */}
      <div className="px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="w-20 h-20 md:w-32 md:h-32">
            <AvatarFallback className="text-2xl">
              {channel?.channelname[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold">{channel?.channelname}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>@{channel?.channelname.toLowerCase().replace(/\s+/g, "")}</span>
              <span>{formatCount(subCount)} subscribers</span>
            </div>
            {channel?.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">
                {channel?.description}
              </p>
            )}
          </div>

          {user && user?._id !== channel?._id && (
            <div className="flex gap-2">
              <Button
                onClick={handleSubscribe}
                disabled={loading}
                variant={isSubscribed ? "outline" : "default"}
                className={
                  isSubscribed
                    ? "bg-muted gap-2"
                    : "bg-red-600 hover:bg-red-700 gap-2"
                }
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;
