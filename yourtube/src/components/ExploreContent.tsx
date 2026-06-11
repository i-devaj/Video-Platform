import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";
import { Flame, Compass } from "lucide-react";

const ExploreContent = () => {
  const [data, setData] = useState<{ trending: any[]; recommended: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await axiosInstance.get("/video/recommendations");
        setData(res.data);
      } catch (error) {
        console.error("Failed to fetch explore content:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  if (loading) {
    return <div className="text-muted-foreground p-4">Loading explore content...</div>;
  }

  if (!data) {
    return <div className="text-muted-foreground p-4">Could not load content.</div>;
  }

  return (
    <div className="space-y-10">
      {/* Trending Section */}
      {data.trending && data.trending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6 border-b pb-2">
            <Flame className="w-6 h-6 text-red-500" />
            <h2 className="text-xl md:text-2xl font-semibold">Trending</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.trending.map((video: any) => (
              <Videocard key={video._id} video={video} />
            ))}
          </div>
        </section>
      )}

      {/* Recommended Section */}
      {data.recommended && data.recommended.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6 border-b pb-2">
            <Compass className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl md:text-2xl font-semibold">Recommended for you</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.recommended.map((video: any) => (
              <Videocard key={video._id} video={video} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ExploreContent;
