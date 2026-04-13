"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Users, Bell, BellOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

interface Subscription {
  _id: string;
  channel: {
    _id: string;
    name: string;
    channelname: string;
    description: string;
    image: string;
  };
  createdAt: string;
}

export default function SubscriptionContent() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadSubscriptions();
    }
  }, [user]);

  const loadSubscriptions = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get(`/subscription/${user._id}`);
      setSubscriptions(res.data);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (channelId: string) => {
    if (!user) return;
    try {
      await axiosInstance.post(`/subscription/${channelId}`, {
        userId: user._id,
      });
      setSubscriptions((prev) =>
        prev.filter((sub) => sub.channel._id !== channelId)
      );
    } catch (error) {
      console.error("Error unsubscribing:", error);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
          <Users className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">
          Don&apos;t miss new videos
        </h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Sign in to see updates from your favorite FlexTube channels.
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell className="w-4 h-4" />
          <span>Sign in to manage subscriptions</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="w-14 h-14 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="w-48 h-4 bg-muted rounded" />
              <div className="w-32 h-3 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <BellOff className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-2">No subscriptions yet</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Channels you subscribe to will show up here. Browse channels and hit
          Subscribe to stay connected.
        </p>
        <Link href="/">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            Explore channels
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {subscriptions.length} channel{subscriptions.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {subscriptions.map((sub) => (
          <div
            key={sub._id}
            className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors group"
          >
            <Link href={`/channel/${sub.channel._id}`}>
              <Avatar className="w-14 h-14 ring-2 ring-transparent group-hover:ring-red-500/30 transition-all">
                {sub.channel.image ? (
                  <AvatarImage src={sub.channel.image} />
                ) : null}
                <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-red-500 to-orange-500 text-white">
                  {sub.channel.channelname?.[0]?.toUpperCase() ||
                    sub.channel.name?.[0]?.toUpperCase() ||
                    "?"}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0">
              <Link href={`/channel/${sub.channel._id}`}>
                <h3 className="font-semibold text-sm hover:text-red-500 transition-colors truncate">
                  {sub.channel.channelname || sub.channel.name}
                </h3>
              </Link>
              {sub.channel.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {sub.channel.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Subscribed{" "}
                {formatDistanceToNow(new Date(sub.createdAt))} ago
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
              onClick={() => handleUnsubscribe(sub.channel._id)}
            >
              Unsubscribe
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
