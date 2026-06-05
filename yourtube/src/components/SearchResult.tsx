import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";

const SearchResult = ({ query }: any) => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || !query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    axiosInstance
      .get("/video/getall")
      .then((res) => {
        const q = query.toLowerCase();
        const filtered = res.data.filter(
          (vid: any) =>
            vid.videotitle?.toLowerCase().includes(q) ||
            vid.videochanel?.toLowerCase().includes(q)
        );
        setResults(filtered);
      })
      .catch((err) => console.error("Search fetch failed:", err))
      .finally(() => setLoading(false));
  }, [query]);

  if (!query || !query.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-muted-foreground">
          Try different keywords or remove search filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {results.map((video: any) => (
          <div key={video._id} className="flex gap-4 group">
            <Link href={`/watch/${video._id}`} className="flex-shrink-0">
              <div className="relative w-80 aspect-video bg-muted rounded-lg overflow-hidden">
                <video
                  src={`${process.env.BACKEND_URL}/${video.filepath}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  preload="metadata"
                  muted
                  onLoadedMetadata={(e) => {
                    (e.currentTarget as HTMLVideoElement).currentTime = 1;
                  }}
                />
              </div>
            </Link>

            <div className="flex-1 min-w-0 py-1">
              <Link href={`/watch/${video._id}`}>
                <h3 className="font-medium text-lg line-clamp-2 group-hover:text-blue-600 mb-2">
                  {video.videotitle}
                </h3>
              </Link>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>{video.views?.toLocaleString() || 0} views</span>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(video.createdAt))} ago
                </span>
              </div>

              <Link
                href={`/channel/${video.uploader}`}
                className="flex items-center gap-2 mb-2 hover:text-blue-600"
              >
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">
                    {video.videochanel?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {video.videochanel}
                </span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Showing {results.length} result{results.length !== 1 ? "s" : ""} for &quot;{query}&quot;
        </p>
      </div>
    </div>
  );
};

export default SearchResult;

